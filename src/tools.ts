import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, CallToolResult, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library'; 
import axios from 'axios';
import mime from 'mime-types';
import fs from 'fs/promises';
import { createReadStream, createWriteStream, link } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import PDFDocument from 'pdfkit';
import { config } from './config.js';
import { toolDefinitions } from './tool-schemas.js';
import Typesense from 'typesense';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd(); // or use auto-detection as discussed earlier

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

interface GetVesselPersonnelInfoRequest {
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

interface GetFleetDetailsRequest {
  fleet_name: string;
}

interface GetVesselDetailsRequest {
  vessel_name: string;
}

interface GetUserAssociatedVesselsRequest {
  emailId: string;
}

interface GetUserTaskListRequest {
  emailId: string;
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
        case 'get_vessel_personnel_info':
          return await get_vessel_personnel_info(args as unknown as GetVesselPersonnelInfoRequest);
        case "google_search":
            return await googleSearch(args as unknown as GoogleSearchRequest);
        case "parse_document_link":
            return await parseDocumentLink(args as unknown as ParseDocumentLinkRequest);
        case "get_user_associated_vessels":
            return await getUserAssociatedVessels(args as unknown as GetUserAssociatedVesselsRequest);
        case "get_user_task_list":
            return await getUserTaskList(args as unknown as GetUserTaskListRequest);
        case "get_vessel_details":
            return await getVesselDetails(args as unknown as GetVesselDetailsRequest);
        case "get_fleet_details":
            return await getFleetDetails(args as unknown as GetFleetDetailsRequest);
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
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(WORKSPACE_ROOT, filePath);
        const fileContent = await fs.readFile(resolvedPath);
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
    // Input validation
    if (!args.subject || args.subject.trim().length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: Email subject is required'
        }]
      };
    }
    
    if (!args.content || args.content.trim().length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: Email content is required'
        }]
      };
    }
    
    if (!args.recipient || args.recipient.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: At least one recipient is required'
        }]
      };
    }
    
    const result = await sendGmail(args);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result)
        }
      ]
    };
  } catch (error: any) {
    console.error('Failure to communicate through mail:', error);
    return {
      content: [{
        type: 'text' as const,
        text: `Error sending email: ${error.message}`
      }]
    };
  }
}

async function whatsappCommunication(args: WhatsAppRequest): Promise<CallToolResult> {
    
    const _convertTxtToPdf = async (txtPath: string): Promise<string> => {
        const pdfPath = txtPath.replace(/\.[^.]+$/, '.pdf');
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

    // New: Convert .md, .csv, .html, .rtf to PDF
    const _convertToPdf = async (filePath: string, ext: string): Promise<string> => {
        const pdfPath = filePath.replace(/\.[^.]+$/, '.pdf');
        const doc = new PDFDocument();
        return new Promise<string>(async (resolve, reject) => {
            const stream = createWriteStream(pdfPath);
            doc.pipe(stream);
            try {
                let fileContent = '';
                if (ext === '.md' || ext === '.csv' || ext === '.rtf') {
                    fileContent = await fs.readFile(filePath, 'utf-8');
                    doc.text(fileContent);
                } else if (ext === '.html') {
                    const html = await fs.readFile(filePath, 'utf-8');
                    const stripped = html.replace(/<[^>]+>/g, '');
                    doc.text(stripped);
                } else {
                    fileContent = await fs.readFile(filePath, 'utf-8');
                    doc.text(fileContent);
                }
                doc.end();
            } catch (err) {
                reject(err);
            }
            stream.on('finish', () => {
                console.log(`Converted ${filePath} to ${pdfPath}`);
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
        // Input validation
        if (!args.recipient || args.recipient.trim().length === 0) {
            return {
                content: [{
                    type: 'text' as const,
                    text: 'Error: WhatsApp recipient is required'
                }]
            };
        }
        
        if (!args.content || args.content.trim().length === 0) {
            return {
                content: [{
                    type: 'text' as const,
                    text: 'Error: WhatsApp message content is required'
                }]
            };
        }
        
        const recipient = args.recipient;
        const message = args.content;
        let attachmentPath = args.attachment_path;

        let template = "send_plain_text_";
        let mediaId: string | undefined = undefined;
        let mediaType: string | undefined = undefined;
        let templateParams: string[] = [];

        if (attachmentPath) {
            const ext = path.extname(attachmentPath).toLowerCase();
            // Supported formats
            const supported = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];
            if (!supported.includes(ext)) {
                // Convert unsupported to PDF
                attachmentPath = await _convertToPdf(attachmentPath, ext);
            } else if (ext === '.txt') {
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

async function get_vessel_personnel_info(args: GetVesselPersonnelInfoRequest): Promise<CallToolResult> {
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
      per_page: 250,
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
    console.error(`Error during get_vessel_personnel_info:`, error);
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
      return {
        content: [{
          type: "text",
          text: `Error performing search: ${error.message}`
        }]
      };
  }
}

async function parseDocumentLink(args: ParseDocumentLinkRequest): Promise<CallToolResult> {
const documentLink = args.document_link;
if (!documentLink) {
  return {
    content: [{
      type: "text",
      text: "Error: document_link is required"
    }]
  };
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
      return {
        content: [{
          type: "text",
          text: "Error: emailId is required"
        }]
      };
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
      return {
        content: [{
          type: "text",
          text: "Error: emailId is required"
        }]
      };
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
      const query = { email: mailId };
      const projection = { _id: 0, name: 1, email: 1, task_list: 1};
      const userTaskDocument = await casefileTaskRemainderCollection.findOne(query, { projection });

      if (!userTaskDocument) {
          return {
              content: [{
                  type: "text",
                  text: JSON.stringify({ pendingTasks: [], urls: [] }, null, 2),
                  title: `No task data found for mailId ${mailId}`
              }]
          };
      }

      // name of the user
      const userName = userTaskDocument.name;

      // email of the user
      const userEmail = userTaskDocument.email;

      // Map all tasks to include required fields
      const pendingTasksFiltered = userTaskDocument.task_list?.map((task: any) => ({
          task: task.task,
          taskDate: task.taskDate,
          casefile_url: task.casefile_url,
          vesselName: task.vesselName,
          casefile: task.casefile
      })) || [];

      // Collect URLs from tasks
      const urls: string[] = [];
      pendingTasksFiltered.forEach((task: any) => {
          if (task.casefile_url) {
              urls.push(task.casefile_url);
          }
      });

      // Create response object
      const to_return = {
        name: userName,
        email: userEmail,
        pendingTasks: pendingTasksFiltered
      };

      // Create tasks with URLs for artifact generation
      const allTasksWithUrls: TaskResult[] = pendingTasksFiltered.map((task: any) => ({
          url: task.casefile_url,
          title: task.task || 'Task',
          task: task.task,
          taskDate: task.taskDate
      })).filter((task: TaskResult) => task.url); // Only include tasks with URLs

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

  } catch (error: any) {
      console.error('Error fetching user task list:', error);
      return {
        content: [{
          type: "text",
          text: `Error fetching user task list: ${error.message}`
        }]
      };
  }
}

async function getComponentData(componentId: string): Promise<string> {
  const match = componentId.match(/^(\d+)_(\d+)_(\d+)$/);
  if (!match) {
      return `⚠️ Invalid component_id format: ${componentId}`;
  }

  const [, componentNumber, questionNumber, imo] = match;
  const componentNo = `${componentNumber}_${questionNumber}_${imo}`;

  try {
      const mongoUri = config.mongodbEtlDev.uri;
      const dbName = config.mongodbEtlDev.dbName;
      const client = new MongoClient(mongoUri);
      const db = client.db(dbName);
      const collection = db.collection('vesselinfocomponents');

      const doc = await collection.findOne({ componentNo });
      if (!doc) {
          return `⚠️ No component found for ID: ${componentId}`;
      }

      if (!doc.data) {
          return "No data found in the table component";
      }

      // Extract headers excluding lineitem
      const headers = doc.data.headers
          .filter((h: any) => h.name !== "lineitem")
          .map((h: any) => h.name);

      const rows = doc.data.body;

      // Build markdown table
      let md = "| " + headers.join(" | ") + " |\n";
      md += "| " + headers.map(() => "---").join(" | ") + " |\n";

      for (const row of rows) {
          const formattedRow = row
              .filter((cell: any) => !cell.lineitem) // Exclude lineitem
              .map((cell: any) => {
                  if (cell.value && cell.link) {
                      return `[${cell.value}](${cell.link})`;
                  } else if (cell.status && cell.color) {
                      return cell.status;
                  }
                  return String(cell);
              });
          md += "| " + formattedRow.join(" | ") + " |\n";
      }

      return md;
  } catch (error: any) {
      console.error('Error getting component data:', error);
      throw new Error(`Error getting component data: ${error.message}`);
  }
}  

/**
 * Add component data to the answer
 */
async function addComponentData(answer: string, imo: string): Promise<string> {
  const pattern = /httpsdev\.syia\.ai\/chat\/ag-grid-table\?component=(\d+_\d+)/g;
  const matches = Array.from(answer.matchAll(pattern));
  
  let result = answer;
  for (const match of matches) {
      const component = match[1];
      try {
          const replacement = await getComponentData(`${component}_${imo}`);
          result = result.replace(match[0], replacement);
      } catch (error) {
          console.error('Error replacing component data:', error);
      }
  }
  
  return result;
}

/**
 * Fetch vessel QnA snapshot
 */
async function getVesselQnASnapshot(imo: string, questionNo: string): Promise<any> {
  try {
      // Validate inputs
      if (!imo || !questionNo) {
          throw new Error('IMO and question number are required');
      }
      
      if (!config.syiaApiKey) {
          throw new Error('SYIA API key not configured');
      }
      
      // API endpoint - use environment variable for base URL if available
      const baseUrl = process.env.SYIA_API_BASE_URL || 'https://dev-api.siya.com';
      const snapshotUrl = `${baseUrl}/v1.0/vessel-info/qna-snapshot/${imo}/${questionNo}`;
      
      // Authentication token
      const jwtToken = `Bearer ${config.syiaApiKey}`;
      
      // Headers for the request
      const headers = {
          "Authorization": jwtToken
      };
      
      console.log(`Fetching vessel QnA snapshot for IMO: ${imo}, Question: ${questionNo}`);
      const response = await fetch(snapshotUrl, {
          method: 'GET',
          headers
      });
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      // Return resultData if it exists, otherwise return the full response
      if (data && "resultData" in data && typeof data.resultData === 'string') {
          return data.resultData;
      }
      return data;
  } catch (error: any) {
      console.error(`Error fetching vessel QnA snapshot for IMO ${imo}, Question ${questionNo}:`, error);
      return null;
  }
}
/**
 * Fetch QA details
 */
async function fetchQADetails(imo: string, qaId: number): Promise<CallToolResult> {
  try {
      const { MongoDBClient } = await import('./database.js');
      const mongoClient = new MongoDBClient();
      await mongoClient.connect();
      
      // Get connection to dev-syia-api database
      const db = mongoClient.db;  
      
      // Get connection to dev-syia-api database
      const vesselinfos = db.collection('vesselinfos');

      const query = {
          'imo': parseInt(imo),
          'questionNo': qaId
      };

      const projection = {
          '_id': 0,
          'imo': 1,
          'vesselName': 1,
          'refreshDate': 1,
          'answer': 1
      };

      interface QAResponse {
          imo: number;
          vesselName: string | null;
          refreshDate: string | null;
          answer: string | null;
          link?: string | null;
      }

      const mongoResult = await vesselinfos.findOne(query, { projection });
      let res: QAResponse = mongoResult ? {
          imo: mongoResult.imo as number,
          vesselName: mongoResult.vesselName as string | null,
          refreshDate: mongoResult.refreshDate as string | null,
          answer: mongoResult.answer as string | null
      } : {
          imo: parseInt(imo),
          vesselName: null,
          refreshDate: null,
          answer: null
      };

      // Format refresh date if it exists
      if (res.refreshDate && new Date(res.refreshDate).toString() !== 'Invalid Date') {
          res.refreshDate = new Date(res.refreshDate).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
          });
      }

      // Process answer with component data if it exists
      if (res.answer) {
          res.answer = await addComponentData(res.answer, imo);
      }

      // Get vessel QnA snapshot link
      try {
          res.link = await getVesselQnASnapshot(imo, qaId.toString());
      } catch (error) {
          res.link = null;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(res, null, 2),
          title: `QA details for ${imo} - ${qaId}`
        }]
      };
  } catch (error: any) {
      console.error('Error fetching QA details:', error);
      throw new Error(`Error fetching QA details: ${error.message}`);
  }
}

async function insertDataLinkToMongoDB(link: string, type: string, sessionId: string, imo: string, vesselName: string): Promise<void> {
  try {
      const { MongoDBClient } = await import('./database.js');
      const mongoClient = new MongoDBClient();
      await mongoClient.connect();
      const db = mongoClient.db;
      await db.collection('data_links').insertOne({
          link,
          type,
          sessionId,
          imo,
          vesselName,
          createdAt: new Date()
      });
  } catch (error: any) {
      console.error('Error inserting data link to MongoDB:', error);
      throw new Error(`Error inserting data link to MongoDB: ${error.message}`);
  }
}

async function getArtifact(toolName: string, link: string): Promise<any> {
  try {
      const timestamp = Math.floor(Date.now() / 1000);
      const artifact = {
          id: `msg_browser_${Math.random().toString(36).substring(2, 8)}`,
          parentTaskId: `task_${toolName}_${Math.random().toString(36).substring(2, 8)}`,
          timestamp,
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
                  url: link,
                  pageTitle: `Tool response for ${toolName}`,
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
          content: `Viewed page: ${toolName}`,
          artifacts: [
              {
                  id: `artifact_webpage_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  type: "browser_view",
                  content: {
                      url: link,
                      title: toolName,
                      screenshot: "",
                      textContent: `Observed output of cmd \`${toolName}\` executed:`,
                      extractedInfo: {}
                  },
                  metadata: {
                      domainName: "example.com",
                      visitTimestamp: Date.now(),
                      category: "web_page"
                  }
              }
          ],
          status: "completed"
      };

      return artifact;
  } catch (error: any) {
      console.error('Error getting artifact:', error);
      throw new Error(`Error getting artifact: ${error.message}`);
  }
}

/**
 * Get vessel details
 */
async function getVesselDetails(args: GetVesselDetailsRequest): Promise<CallToolResult> {
  const vesselName = args.vessel_name;

  if (!vesselName) {
    return {
      content: [{
        type: "text",
        text: "Error: 'vesselName' parameter is required for vessel details search"
      }]
    };
  }

  if (!config.typesense.host || !config.typesense.port || !config.typesense.protocol || !config.typesense.apiKey) {
    return { 
      content: [{ type: 'text', text: 'Error: Typesense credentials not configured.' }]
    };
  }

  try {
    console.log(`Searching for vessel details with vessel name: ${vesselName}`);

    // Set up search parameters for the fleet-vessel-lookup collection
    const searchParameters = {
      q: vesselName,
      query_by: "vesselName",
      collection: "fleet-vessel-lookup",
      per_page: 1,
      include_fields: "vesselName,imo,class,flag,shippalmDoc,isV3",
      prefix: false,
      num_typos: 2
    };

    const typesenseClient = new Typesense.Client({
      nodes: [{
        host: config.typesense.host,
        port: config.typesense.port,
        protocol: config.typesense.protocol,
      }],
      apiKey: config.typesense.apiKey,
      connectionTimeoutSeconds: 10,
    });

    // Execute search
    const raw = await typesenseClient.collections("fleet-vessel-lookup").documents().search(searchParameters);
    const hits = raw.hits || [];

    if (!hits.length) {
      return {
        content: [{
          type: "text",
          text: `No vessels found named '${vesselName}'.`
        }]
      };
    }

    // Get the first hit from the search results
    const doc = hits[0].document as any;

    // Fetch QA details for question 181
    const qaResult = await fetchQADetails(doc.imo.toString(), 181);
    
    if (!qaResult?.content?.[0]?.text) {
      throw new Error('Invalid QA result structure');
    }

    let qaContent: string;
    let link: string | null = null;

    try {
      const qaJson = JSON.parse(qaResult.content[0].text as string) as { answer?: string };
      qaContent = qaJson.answer || '';
      
      // Safely parse link if it exists
      if (qaResult.content[0].link) {
        const linkJson = JSON.parse(qaResult.content[0].link as string) as { link?: string };
        link = linkJson.link || null;
      }
    } catch (parseError) {
      console.error("Error parsing QA content:", parseError);
      throw new Error('Failed to parse vessel details data');
    }

    // Process and format results
    const results = {
      vesselName: doc.vesselName,
      imo: doc.imo,
      class: doc.class,
      flag: doc.flag,
      shippalmDoc: doc.shippalmDoc,
      isV3: doc.isV3,
      vesselParticulars: qaContent
    };

    // Only insert link to MongoDB if we have a valid link
    if (link) {
      await insertDataLinkToMongoDB(link, "vessel_details", "get_vessel_details", doc.imo.toString(), vesselName);
      const artifactData = await getArtifact("get_vessel_details", link);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
            title: `Vessel details for '${vesselName}'`,
            format: "json"
          },
          {
            type: "text",
            text: JSON.stringify(artifactData, null, 2),
            title: "Artifact Data",
            format: "json"
          }
        ]
      };
    }

    // Return results without artifact data if no link
    return {
      content: [{
        type: "text",
        text: JSON.stringify(results, null, 2),
        title: `Vessel details for '${vesselName}'`,
        format: "json"
      }]
    };

  } catch (error: any) {
    console.error("Error searching for vessel details:", error);
    return {
      content: [{
        type: "text",
        text: `Error querying vessel details: ${error.message}`
      }]
    };
  }
}

async function getFleetDetails(args: GetFleetDetailsRequest): Promise<CallToolResult> {
  const fleetName = args.fleet_name;

  if (!fleetName) {
    return {
      content: [{
        type: "text",
        text: "Error: 'fleetName' parameter is required for fleet details search"
      }]
    };
  }

  if (!config.typesense.host || !config.typesense.port || !config.typesense.protocol || !config.typesense.apiKey) {
    return { 
      content: [{ type: 'text', text: 'Error: Typesense credentials not configured.' }]
    };
  }

  try {
    console.log(`Searching for fleet details with fleet name: ${fleetName}`);

    // Set up search parameters for the fleet-vessel-lookup collection
    const searchParameters = {
      q: fleetName,
      query_by: "name",
      per_page: 1,
      include_fields: "imo,name",
      prefix: false,
      num_typos: 2
    };

    const typesenseClient = new Typesense.Client({
      nodes: [{
        host: config.typesense.host,
        port: config.typesense.port,
        protocol: config.typesense.protocol,
      }],
      apiKey: config.typesense.apiKey,
      connectionTimeoutSeconds: 10,
    });

    // Execute search
    const raw = await typesenseClient.collections("fleet-details").documents().search(searchParameters);
    const hits = raw.hits || [];

    if (!hits.length) {
      return {
        content: [{
          type: "text",
          text: `No fleet found named '${fleetName}'.`
        }]
      };
    }

    // Get the first hit from the search results
    const doc = hits[0].document as any;

    // Process and format results
    const results = {
      fleetName: doc.name,
      imo: doc.imo
    };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
            title: `Fleet details for '${fleetName}'`,
            format: "json"
          }
        ]
      };

  } catch (error: any) {
    console.error("Error searching for fleet details:", error);
    return {
      content: [{
        type: "text",
        text: `Error querying fleet details: ${error.message}`
      }]
    };
  } 
}
