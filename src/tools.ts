import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, CallToolResult, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library'; 
import axios from 'axios';
import mime from 'mime-types';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import PDFDocument from 'pdfkit';
import { config } from './config.js';
import { toolDefinitions } from './tool-schemas.js';
import Typesense from 'typesense';
import { Collection } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmailRequest {
  subject: string;
  content: string;
  recipient: string[];
  cc?: string[];
  bcc?: string[];
  attachment_paths?: string[];
}

interface WhatsAppRequest {
  content: string;
  recipient: string;
  attachment_path?: string;
}

interface FleetVesselLookupRequest {
  name_query?: string;
  vessel_query?: string;
  email_query?: string;
}

interface GoogleSearchRequest {
  query: string;
}

interface ParseDocumentLinkRequest {
  document_link: string;
  parsing_instruction: string;
}

interface GetUserAssociatedVesselsRequest {
  emailId: string;
}

interface GetUserTaskListRequest {
  emailId: string;
}

interface GetUserTaskListResponse {
  currentTaskInfo: any[];
  historicalTaskInfo: any[];
  urls: string[];
}

interface ArtifactData {
  id: string;
  parentTaskId: string;
  timestamp: number;
  agent: {
    id: string;
    name: string;
    type: string;
  };
  messageType: string;
  action: {
    tool: string;
    operation: string;
    params: {
      url: string;
      pageTitle: string;
      visual: {
        icon: string;
        color: string;
      };
      stream: {
        type: string;
        streamId: string;
        target: string;
      };
    };
  };
  content: string;
  artifacts: Array<{
    id: string;
    type: string;
    content: {
      url: string;
      title: string;
      screenshot: string;
      textContent: string;
      extractedInfo: any;
    };
    metadata: {
      domainName: string;
      visitTimestamp: number;
      category: string;
    };
  }>;
  status: string;
}

interface TaskResult {
  url?: string;
  title?: string;
  task?: string;
  taskDate?: string;
}

export function registerTools(server: Server): void {
  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log('Listing available tools');
    return { tools: toolDefinitions };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`Calling tool: ${name} with arguments:`, args);

    try {
      switch (name) {
        case 'mail_communication':
          return await mailCommunication(args as unknown as EmailRequest);
        case 'whatsapp_communication':
          return await whatsappCommunication(args as unknown as WhatsAppRequest);
        case 'fleet_vessel_lookup':
          return await fleetVesselLookup(args as unknown as FleetVesselLookupRequest);
        case "google_search":
            return await googleSearch(args as unknown as GoogleSearchRequest);
        case "parse_document_link":
            return await parseDocumentLink(args as unknown as ParseDocumentLinkRequest);
        case "get_user_associated_vessels":
            return await getUserAssociatedVessels(args as unknown as GetUserAssociatedVesselsRequest);
        case "get_user_task_list":
            return await getUserTaskList(args as unknown as GetUserTaskListRequest);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error calling tool ${name}: ${String(error)}`
          }
        ]
      };
    }
  });
}

async function sendGmail(emailData: EmailRequest): Promise<{ status: string; output: string }> {
  try {
    if (!config.oauth.clientId || !config.oauth.clientSecret) {
      throw new Error('OAuth credentials not configured');
    }

    const oauth2Client = new OAuth2Client(
      config.oauth.clientId,
      config.oauth.clientSecret,
      config.oauth.redirectUris ? config.oauth.redirectUris.split(',')[0] : ''
    );

    // Set credentials from config
    if (config.oauth.accessToken && config.oauth.refreshToken) {
      oauth2Client.setCredentials({
        access_token: config.oauth.accessToken,
        refresh_token: config.oauth.refreshToken,
        token_type: config.oauth.tokenType,
        expiry_date: config.oauth.expiryDate,
      });
    } else {
      throw new Error('Gmail token not found in config. Please run OAuth flow first.');
    }

    // Check if token needs refresh
    if (oauth2Client.credentials.expiry_date && oauth2Client.credentials.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      // Note: We are not saving the refreshed token back to a file anymore.
      // The updated credentials will only be used for the current session.
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let message: string;

    if (emailData.attachment_paths && emailData.attachment_paths.length > 0) {
      const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;
      const messageParts = [
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        'MIME-Version: 1.0',
        `To: ${emailData.recipient.join(', ')}`,
      ];
      if (emailData.cc && emailData.cc.length > 0) {
        messageParts.push(`Cc: ${emailData.cc.join(', ')}`);
      }
      if (emailData.bcc && emailData.bcc.length > 0) {
        messageParts.push(`Bcc: ${emailData.bcc.join(', ')}`);
      }
      messageParts.push(`Subject: ${emailData.subject}`);
      messageParts.push('');
      messageParts.push(`--${boundary}`);
      messageParts.push('Content-Type: text/html; charset=utf-8');
      messageParts.push('MIME-Version: 1.0');
      messageParts.push('');
      messageParts.push(emailData.content);

      for (const filePath of emailData.attachment_paths) {
        const fileContent = await fs.readFile(filePath);
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        const fileName = path.basename(filePath);

        messageParts.push('');
        messageParts.push(`--${boundary}`);
        messageParts.push(`Content-Type: ${mimeType}`);
        messageParts.push('MIME-Version: 1.0');
        messageParts.push('Content-Transfer-Encoding: base64');
        messageParts.push(`Content-Disposition: attachment; filename="${fileName}"`);
        messageParts.push('');
        messageParts.push(fileContent.toString('base64'));
      }

      messageParts.push('');
      messageParts.push(`--${boundary}--`);
      
      message = messageParts.join('\n');
    } else {
      const messageParts = [
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${emailData.recipient.join(', ')}`,
        `Subject: ${emailData.subject}`,
      ];

      if (emailData.cc && emailData.cc.length > 0) {
        messageParts.push(`Cc: ${emailData.cc.join(', ')}`);
      }

      if (emailData.bcc && emailData.bcc.length > 0) {
        messageParts.push(`Bcc: ${emailData.bcc.join(', ')}`);
      }

      messageParts.push('', emailData.content);

      message = messageParts.join('\n');
    }
    
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return {
      status: 'success',
      output: `Email sent! ID: ${response.data.id}`
    };
  } catch (error) {
    return {
      status: 'failure',
      output: `Failed to send email: ${String(error)}`
    };
  }
}

async function mailCommunication(args: EmailRequest): Promise<CallToolResult> {
  try {
    const result = await sendGmail(args);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result)
        }
      ]
    };
  } catch (error) {
    console.error('Failure to communicate through mail:', error);
    throw error;
  }
}

async function whatsappCommunication(args: WhatsAppRequest): Promise<CallToolResult> {
    
    const _convertTxtToPdf = async (txtPath: string): Promise<string> => {
        const pdfPath = txtPath.replace(/\.txt$/, '.pdf');
        const doc = new PDFDocument();
        
        return new Promise<string>((resolve, reject) => {
            const stream = createWriteStream(pdfPath);
            doc.pipe(stream);
            
            fs.readFile(txtPath, 'utf-8')
              .then(fileContent => {
                doc.text(fileContent);
                doc.end();
              })
              .catch(reject);

            stream.on('finish', () => {
              console.log(`Converted ${txtPath} to ${pdfPath}`);
              resolve(pdfPath);
            });
            stream.on('error', reject);
        });
    };

    const _uploadMedia = async (filePath: string, mimeType: string): Promise<string> => {
        if (!config.whatsapp.url || !config.whatsapp.token) {
            throw new Error('WhatsApp URL or token not configured');
        }
        const mediaUrl = `${config.whatsapp.url}/media`;

        const form = new FormData();
        form.append('file', createReadStream(filePath), {
            filename: path.basename(filePath),
            contentType: mimeType,
        });
        form.append('messaging_product', 'whatsapp');
        form.append('type', mimeType);

        const response = await axios.post(mediaUrl, form, {
            headers: {
                'Authorization': `Bearer ${config.whatsapp.token}`,
                ...form.getHeaders(),
            },
        });

        if (response.status !== 200) {
            console.error(`Media upload failed: ${response.status} - ${JSON.stringify(response.data)}`);
            throw new Error(`Media upload failed: ${response.status} - ${JSON.stringify(response.data)}`);
        }

        const mediaId = response.data.id;
        console.log(`Media uploaded successfully. ID: ${mediaId}`);
        return mediaId;
    };

    const _sendTemplateMessage = async (
        recipient: string,
        templateName: string,
        params: string[],
        mediaId?: string,
        mediaType?: string,
        language: string = "en",
    ): Promise<{ status: string; output: string }> => {
        if (!config.whatsapp.url || !config.whatsapp.token) {
            throw new Error('WhatsApp URL or token not configured');
        }
        const url = `${config.whatsapp.url}/messages`;
        const headers = {
            "Authorization": `Bearer ${config.whatsapp.token}`,
            "Content-Type": "application/json",
        };

        const components: any[] = [];
        if (templateName === "send_plain_text_") {
            if (params.length !== 2) {
                throw new Error("send_plain_text_ template requires exactly two parameters: header and body.");
            }
            components.push({ type: "header", parameters: [{ type: "text", text: params[0] }] });
            components.push({ type: "body", parameters: [{ type: "text", text: params[1] }] });
        } else {
            if (mediaId && mediaType) {
                components.push({
                    type: "header",
                    parameters: [{ type: mediaType, [mediaType]: { id: mediaId } }],
                });
            }
            if (params && params.length > 0) {
                components.push({
                    type: "body",
                    parameters: params.map(p => ({ type: "text", text: p })),
                });
            }
        }

        const payload = {
            messaging_product: "whatsapp",
            to: recipient,
            type: "template",
            template: {
                name: templateName,
                language: { code: language },
                components: components,
            },
        };

        try {
            const response = await axios.post(url, payload, { headers });
            console.log(`Template send response: ${response.status} - ${JSON.stringify(response.data)}`);

            if (response.status === 200) {
                return { status: "success", output: `Template '${templateName}' sent to ${recipient}.` };
            } else {
                return { status: "failure", output: `Error ${response.status}: ${JSON.stringify(response.data)}` };
            }
        } catch (error: any) {
             const errorMessage = error.response ? JSON.stringify(error.response.data) : String(error);
             console.error(`Error sending template message:`, errorMessage);
             return {
                status: 'failure',
                output: `Exception: ${errorMessage}`
            };
        }
    };

    try {
        const recipient = args.recipient;
        const message = args.content;
        let attachmentPath = args.attachment_path;

        let template = "send_plain_text_";
        let mediaId: string | undefined = undefined;
        let mediaType: string | undefined = undefined;
        let templateParams: string[] = [];

        if (attachmentPath) {
            if (attachmentPath.endsWith(".txt")) {
                attachmentPath = await _convertTxtToPdf(attachmentPath);
            }

            const mimeType = mime.lookup(attachmentPath) || "application/octet-stream";
            
            mediaId = await _uploadMedia(attachmentPath, mimeType);

            if (mimeType.startsWith("image/")) {
                template = "send_image_file_";
                mediaType = "image";
            } else {
                template = "send_document_file_";
                mediaType = "document";
            }
            
            if (message) {
              templateParams = [message];
            }
        } else {
            templateParams = ["Automated response", message];
        }

        const result = await _sendTemplateMessage(
            recipient,
            template,
            templateParams,
            mediaId,
            mediaType,
        );

        const status = result.status === "success" ? "sent successfully" : "failed";
        const text = `WhatsApp message ${status}: ${result.output}`;
        
        return {
            content: [{
                type: 'text' as const,
                text: text,
            }]
        };

    } catch (e: any) {
        console.error(`Error sending WhatsApp message: ${e}`);
        return {
            content: [{
                type: 'text' as const,
                text: `Failed to send WhatsApp message: ${String(e)}`
            }]
        };
    }
}

async function fleetVesselLookup(args: FleetVesselLookupRequest): Promise<CallToolResult> {
  const { name_query, vessel_query, email_query } = args;

  const providedQueries = {
    name: name_query,
    vessel: vessel_query,
    email: email_query,
  };

  const activeQueries: { [key: string]: string } = Object.entries(providedQueries)
    .filter(([, value]) => value !== undefined && value !== null)
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value as string }), {});

  if (Object.keys(activeQueries).length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: Please provide at least one of name_query, vessel_query, or email_query.' }]
    };
  }
  
  if (!config.typesense.host || !config.typesense.port || !config.typesense.protocol || !config.typesense.apiKey) {
    return { 
      content: [{ type: 'text', text: 'Error: Typesense credentials not configured.' }]
    };
  }

  try {
    const client = new Typesense.Client({
      nodes: [{
        host: config.typesense.host,
        port: config.typesense.port,
        protocol: config.typesense.protocol,
      }],
      apiKey: config.typesense.apiKey,
      connectionTimeoutSeconds: 10,
    });

    const vesselInfoFields = ["vesselName", "groupName", "shippalmDoc", "isV3", "class", "imo", "doc", "fleet"];
    const emailFields = ["vesselEmailId", "technicalSuperintendentEmailId", "procurementExecEmailId", "marineSuperintendentEmailId", "vgEmailId", "technicalExecutiveEmailId", "dcoExecEmailId", "pmsExecEmailId", "accountsPicEmailId", "backupTechSuperintendentEmailId", "cmsSuperintendentEmailId", "fleetManagerEmailId", "marineManagerEmailId", "itPicEmailId", "manningGroupHeadEmailId", "marineExecEmailId"];
    const personNameFields = ["technicalSuperintendent", "procurementExec", "owner", "marineSuperintendent", "technicalExecutive", "dcoExec", "pmsExec", "fleetManager", "accountsPic", "backupTechSuperintendent", "cmsSuperintendent", "itPic", "manningGroupHead", "marineExec", "marineManager"];

    let combinedFilterParts: string[] = [];

    for (const [queryType, query] of Object.entries(activeQueries)) {
      let searchFields: string[] = [];
      if (queryType === "email") searchFields = emailFields;
      else if (queryType === "name") searchFields = personNameFields;
      else if (queryType === "vessel") searchFields = vesselInfoFields;

      const numericFields = ['imo'];
      const boolFields = ['isV3'];
      const stringFields = searchFields.filter(f => !numericFields.includes(f) && !boolFields.includes(f));

      let filterParts: string[] = [];
      if (typeof query === 'string') {
          if (queryType !== "email") {
              const numericQuery = parseInt(query, 10);
              if (!isNaN(numericQuery)) {
                  numericFields.forEach(field => {
                      if (searchFields.includes(field)) filterParts.push(`${field}:=${numericQuery}`);
                  });
              }
              if (query.toLowerCase() === 'true' || query.toLowerCase() === 'false') {
                  boolFields.forEach(field => {
                      if (searchFields.includes(field)) filterParts.push(`${field}:=${query.toLowerCase()}`);
                  });
              }
          }
          stringFields.forEach(field => filterParts.push(`${field}:=\`${query}\``));
      }

      if (filterParts.length > 0) {
        combinedFilterParts.push(`(${filterParts.join(' || ')})`);
      }
    }

    const filterQuery = combinedFilterParts.join(' && ');

    let searchParameters: any = {
      q: '*',
      filter_by: filterQuery,
      per_page: 50,
    };
    
    let searchResults = await client.collections('fleet-vessel-lookup').documents().search(searchParameters);
    let hits = searchResults.hits || [];

    if (hits.length === 0) {
      console.log(`No exact match for '${JSON.stringify(activeQueries)}', falling back to fuzzy search.`);
      
      const fuzzyQ = Object.values(activeQueries).join(' ');
      let fuzzyQueryByFields = new Set<string>();

      if (activeQueries.name) personNameFields.forEach(f => fuzzyQueryByFields.add(f));
      if (activeQueries.vessel) vesselInfoFields.forEach(f => fuzzyQueryByFields.add(f));
      if (activeQueries.email) emailFields.forEach(f => fuzzyQueryByFields.add(f));
      
      const numericFields = ['imo'];
      const boolFields = ['isV3'];
      const fuzzyStringFields = [...fuzzyQueryByFields].filter(f => !numericFields.includes(f) && !boolFields.includes(f));

      searchParameters = {
        q: fuzzyQ,
        query_by: fuzzyStringFields.join(','),
        per_page: 10,
      };
      searchResults = await client.collections('fleet-vessel-lookup').documents().search(searchParameters);
      hits = searchResults.hits || [];
    }

    if (hits.length === 0) {
      return { content: [{ type: 'text', text: 'No results found for your query.' }] };
    }

    let responseText = `Found ${searchResults.found} results. Showing top ${hits.length}:\n\n`;
    hits.forEach((hit: any, i: number) => {
      const doc = hit.document;
      responseText += `--- Result ${i + 1} ---\n`;
      for (const [key, value] of Object.entries(doc)) {
        if (value) {
          const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          responseText += `${displayKey}: ${displayValue}\n`;
        }
      }
      responseText += "\n";
    });

    return { content: [{ type: 'text', text: responseText }] };

  } catch (error) {
    console.error(`Error during fleet_vessel_lookup:`, error);
    let errorMessage = `An error occurred: ${error}`;
    if (error instanceof Error && 'errors' in error && Array.isArray((error as any).errors)) {
      errorMessage = `An aggregate error occurred: ${error.message}. Individual errors: ` + (error as any).errors.map((e: any) => e.message || String(e)).join('; ');
    } else if (error instanceof Error) {
        errorMessage = `An error occurred: ${error.message}`;
    }
    return { content: [{ type: 'text', text: errorMessage }] };
  }
}

async function googleSearch(args: GoogleSearchRequest): Promise<CallToolResult> {
  const query = args.query;
  
  if (!query) {
      throw new Error("Search query is required");
  }
  
  const url = "https://api.perplexity.ai/chat/completions";
  
  try {
      const { config } = await import('./config.js');
      const axios = await import('axios');
      
      const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.perplexity.apiKey}`
      };
      
      const payload = {
          "model": "sonar-reasoning-pro",
          "messages": [
              {
                  "role": "system",
                  "content": "You are an expert assistant helping with reasoning tasks."
              },
              {
                  "role": "user",
                  "content": query
              }
          ],
          "max_tokens": 2000,
          "temperature": 0.2,
          "top_p": 0.9,
          "search_domain_filter": null,
          "return_images": false,
          "return_related_questions": false,
          "search_recency_filter": "week",
          "top_k": 0,
          "stream": false,
          "presence_penalty": 0,
          "frequency_penalty": 1,
          "response_format": null
      };

      const response = await axios.default.post(url, payload, { 
          headers,
          timeout: 100000 // 100 second timeout to match Python httpx timeout
      });

      if (response.status === 200) {
          const result = response.data;
          const citations = result.citations || [];
          const content = result.choices[0]?.message?.content || '';
          
          return {
            content: [{
              type: "text",
              text: `Response: ${content}\n\nCitations: ${citations}`
            }]
          };
      } else {
          const errorText = response.data;
          return {
            content: [{
              type: "text",
              text: `Error: ${response.status}, ${errorText}`
            }]
          };
      }
  } catch (error: any) {
      console.error(`Failure to execute the search operation: ${error}`);
      throw error;
  }
}

async function parseDocumentLink(args: ParseDocumentLinkRequest): Promise<CallToolResult> {
const documentLink = args.document_link;
if (!documentLink) {
  throw new Error("document_link is required");
}

try {
  // Import your helper (wherever your parseToDocumentLink is defined)
  const { parseToDocumentLink } = await import("./document_parse/main_file_s3_to_llamaparse.js");
      
  console.log("About to call parseToDocumentLink with:", documentLink);
  
  // Call helper
  const [success, markdown] = await parseToDocumentLink(
      documentLink,
      undefined, // downloadPath
      undefined, // jsonOutput
      undefined, // mdOutput
      args.parsing_instruction, // parsingInstruction
      'json', // format
      false, // extractOnly
      process.env.LLAMAINDEX_API_KEY, // llamaApiKey
      process.env.LLAMAINDEX_VENDOR_MODEL, // vendorModel
      true // deleteDownloads
  );

  console.log("parseToDocumentLink result:", success, markdown ? "has content" : "no content");

  if (!success || !markdown) {
      return {
        content: [{
          type: "text",
          text: `Failed to parse document from URL: ${documentLink}`,
          title: "Document Parsing Error"
      }]
    };
  }

  return {
    content: [{
      type: "text",
      text: markdown,
      title: `Parsed document from ${documentLink}`,
      format: "markdown"
  }]
  };

} catch (error: any) {
  const msg = error.message || String(error);
  console.error("Full error in parseDocumentLink:", error);

  if (msg.includes("API_KEY is required") || msg.includes("LLAMAINDEX_API_KEY is required")) {
      console.error(`API key configuration error: ${msg}`);
      return {
        content: [{
          type: "text",
          text: `API configuration error: ${msg}`,
          title: "API Configuration Error"
      }]
  };
  }

  console.error(`Error parsing document from URL ${documentLink}:`, error);
  return {
    content: [{
      type: "text",
      text: `Error parsing document: ${msg}`,
      title: "Document Parsing Error"
  }]
  };
}
}

async function getUserAssociatedVessels(args: GetUserAssociatedVesselsRequest): Promise<CallToolResult> {
  const mailId = args.emailId;
  
  if (!mailId) {
      throw new Error("mailId (email) is required");
  }
  
  try {
      // Import MongoDB client
      const { MongoDBClient } = await import('./database.js');
      const mongoClient = new MongoDBClient();
      await mongoClient.connect();
      
      // Get connection to dev-syia-api database
      const db = mongoClient.db;  
      
      // Fetch user details from users collection using email
      const userCollection = db.collection("users");
      const userInfo = await userCollection.findOne({ email: mailId });
      
      if (!userInfo) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: "User not found for email" }, null, 2),
              title: `Error for mailId ${mailId}`,
              format: "json"
          }]
          };
      }
      
      // Get associated vessel IDs from user info
      const associatedVesselIds = userInfo.associatedVessels || [];
      
      // Query the fleet_distributions_overviews collection
      const fleetDistributionsOverviewsCollection = db.collection("fleet_distributions_overviews");
      const vessels = await fleetDistributionsOverviewsCollection.find(
          { vesselId: { $in: associatedVesselIds } },
          { projection: { _id: 0, vesselName: 1, imo: 1 } }
      ).limit(5).toArray();
      
      // Format vessel info
      const formatVesselInfo = (vessels: any[]): string => {
          if (!vessels || vessels.length === 0) {
              return "No vessels found associated with this user.";
          }
          
          const formattedText = [`- Associated Vessels: ${vessels.length} vessels`];
          
          for (let i = 0; i < vessels.length; i++) {
              const vessel = vessels[i];
              formattedText.push(`${i + 1}. ${vessel.vesselName || 'Unknown'}`);
              formattedText.push(`   • IMO: ${vessel.imo || 'Unknown'}`);
          }
          
          return formattedText.join("\n");
      };
      
      const formattedText = formatVesselInfo(vessels);
      
      const content = {
          type: "text" as const,
          text: formattedText,
          title: `Vessels associated with mailId ${mailId}`
      };
      
      return {
        content: [{
          type: "text",
          text: formattedText,
          title: `Vessels associated with mailId ${mailId}`
      }]
      };
      
  } catch (error: any) {
      console.error(`Error retrieving vessels for mailId ${mailId}:`, error);
      throw new Error(`Error retrieving associated vessels: ${error.message}`);
  }
}

/**
 * Handle get artifact tool using updated artifact format
 */
async function getListOfArtifacts(functionName: string, results: TaskResult[]): Promise<any[]> {
  const artifacts: any[] = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const url = result.url;
    const casefile = result.title || result.task || 'Unknown Casefile';
    
    if (url) {
      const artifactData: ArtifactData = {
        id: `msg_browser_ghi789${i}`,
        parentTaskId: "task_7d8f9g",
        timestamp: Math.floor(Date.now() / 1000),
        agent: {
          id: "agent_siya_browser",
          name: "SIYA",
          type: "qna"
        },
        messageType: "action",
        action: {
          tool: "browser",
          operation: "browsing",
          params: {
            url: `Casefile: ${casefile}`,
            pageTitle: `Tool response for ${functionName}`,
            visual: {
              icon: "browser",
              color: "#2D8CFF"
            },
            stream: {
              type: "vnc",
              streamId: "stream_browser_1",
              target: "browser"
            }
          }
        },
        content: `Viewed page: ${functionName}`,
        artifacts: [{
          id: "artifact_webpage_1746018877304_994",
          type: "browser_view",
          content: {
            url: url,
            title: functionName,
            screenshot: "",
            textContent: `Observed output of cmd \`${functionName}\` executed:`,
            extractedInfo: {}
          },
          metadata: {
            domainName: "example.com",
            visitTimestamp: Date.now(),
            category: "web_page"
          }
        }],
        status: "completed"
      };
      
      const artifact = {
        type: "text" as const,
        text: JSON.stringify(artifactData, null, 2),
        title: `Casefile: ${casefile}`,
        format: "json"
      };
      
      artifacts.push(artifact);
    }
  }
  
  return artifacts;
}

async function getUserTaskList(args: GetUserTaskListRequest): Promise<CallToolResult> {
  const mailId = args.emailId;
  
  if (!mailId) {
      throw new Error("mailId (email) is required");
  }

  try {
      // Import MongoDB client
      const { MongoDBClient } = await import('./database.js');
      const mongoClient = new MongoDBClient();
      await mongoClient.connect();
      
      // Get connection to dev-syia-api database
      const db = mongoClient.db;  

      // Fetch user details from users collection using email
      const casefileTaskRemainderCollection = db.collection("casefile_task_reminder");

      // Single query to fetch the document by email
      const userTaskDocument = await casefileTaskRemainderCollection.findOne({ email: mailId });

      if (!userTaskDocument) {
          return {
              content: [{
                  type: "text",
                  text: JSON.stringify({ currentTaskInfo: [], historicalTaskInfo: [], urls: [] }, null, 2),
                  title: `No task data found for mailId ${mailId}`
              }]
          };
      }

      // name of the user
      const userName = userTaskDocument.name;

      //email of the user
      const userEmail = userTaskDocument.email;


      // Get today's and yesterday's dates
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      // Filter current tasks for today's date and return only required fields
      const currentTaskInfoFiltered = userTaskDocument.task_list?.filter((task: any) => {
          if (!task.taskDate) return false;
          try {
              // Parse the ISO datetime string and extract date part
              const taskDate = new Date(task.taskDate);
              const taskDateOnly = taskDate.toISOString().split('T')[0];
              return taskDateOnly === todayDate;
          } catch (error) {
              console.warn('Invalid taskDate format:', task.taskDate);
              return false;
          }
      }).map((task: any) => ({
          task: task.task,
          taskDate: task.taskDate,
          casefile_url: task.casefile_url
      })) || [];

      // Filter historical tasks for yesterday's date and return only required fields
      const historicalTaskInfoFiltered = userTaskDocument.historicalTask?.filter((task: any) => {
          if (!task.taskDate) return false;
          try {
              // Parse the ISO datetime string and extract date part
              const taskDate = new Date(task.taskDate);
              const taskDateOnly = taskDate.toISOString().split('T')[0];
              return taskDateOnly === yesterdayDate;
          } catch (error) {
              console.warn('Invalid taskDate format:', task.taskDate);
              return false;
          }
      }).map((task: any) => ({
          task: task.task,
          taskDate: task.taskDate,
          casefile_url: task.casefile_url
      })) || [];

      // Collect URLs from both current and historical tasks
      const urls: string[] = [];
      
      // Collect URLs from current tasks
      currentTaskInfoFiltered.forEach((task: any) => {
          if (task.casefile_url) {
              urls.push(task.casefile_url);
          }
      });

      // Collect URLs from historical tasks
      historicalTaskInfoFiltered.forEach((task: any) => {
          if (task.casefile_url) {
              urls.push(task.casefile_url);
          }
      });

      // Create response object
      const to_return = {
        name: userName,
        email: userEmail,
        currentTaskInfo: currentTaskInfoFiltered,
        historicalTaskInfo: historicalTaskInfoFiltered,
        urls: urls
      };

      // Combine all tasks with URLs for artifact generation
      const allTasksWithUrls: TaskResult[] = [
        ...currentTaskInfoFiltered.map((task: any) => ({
          url: task.casefile_url,
          title: task.task || 'Current Task',
          task: task.task,
          taskDate: task.taskDate
        })),
        ...historicalTaskInfoFiltered.map((task: any) => ({
          url: task.casefile_url,
          title: task.task || 'Historical Task',
          task: task.task,
          taskDate: task.taskDate
        }))
      ].filter((task: TaskResult) => task.url); // Only include tasks with URLs

      // Generate artifacts using the converted function
      const artifacts = await getListOfArtifacts('getUserTaskList', allTasksWithUrls);

      // Create the main content
      const mainContent = {
        type: "text" as const,
        text: JSON.stringify(to_return, null, 2),
        title: `Task list for mailId ${mailId}`
      };

      // Return content with artifacts
      return {
        content: [mainContent, ...artifacts]
      };

  } catch (error) {
      throw new Error(`Failed to fetch user task list: ${error}`);
  }
}

