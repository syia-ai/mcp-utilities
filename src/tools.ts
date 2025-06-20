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
      config.oauth.redirectUris ? config.oauth.redirectUris.split(',')[0] : 'http://localhost:3000/oauth2callback'
    );

    // Load token if it exists - using path relative to this file
    const tokenPath = path.resolve(__dirname, '..', 'mcp_gmail_token.pkl');
    try {
      const tokenData = await fs.readFile(tokenPath, 'utf8');
      const tokens = JSON.parse(tokenData);
      oauth2Client.setCredentials(tokens);
    } catch (error) {
      console.error(`Failed to read token from ${tokenPath}:`, error);
      throw new Error('Gmail token not found. Please run OAuth flow first.');
    }

    // Check if token needs refresh
    if (oauth2Client.credentials.expiry_date && oauth2Client.credentials.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await fs.writeFile(tokenPath, JSON.stringify(credentials));
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

async function _convertTxtToPdf(txtPath: string): Promise<string> {
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
}

async function _uploadMedia(filePath: string, mimeType: string): Promise<string> {
  if (!config.whatsapp.url) {
    throw new Error('WhatsApp URL not configured');
  }
  const mediaUrl = config.whatsapp.url;

  const form = new FormData();
  form.append('file', createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: mimeType,
  });
  form.append('messaging_product', 'whatsapp');

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
}

function sanitizeWhatsAppText(text: string): string {
  // Strip HTML tags
  let clean = text.replace(/<[^>]+>/g, '');
  // Replace multiple spaces with one
  clean = clean.replace(/\s{2,}/g, ' ');
  // Replace newlines/tabs with space
  clean = clean.replace(/[\n\t]/g, ' ');
  return clean.trim();
}

async function sendWhatsApp(data: WhatsAppRequest): Promise<{ status: string; output: string }> {
  try {
    if (!config.whatsapp.token || !config.whatsapp.url) {
      throw new Error('WhatsApp credentials not configured');
    }

    const headers = {
      'Authorization': `Bearer ${config.whatsapp.token}`,
      'Content-Type': 'application/json'
    };
    
    let template: string;
    const components: any[] = [];
    
    if (data.attachment_path) {
      let attachmentPath = data.attachment_path;
      if (attachmentPath.endsWith('.txt')) {
        attachmentPath = await _convertTxtToPdf(attachmentPath);
      }

      const mimeType = mime.lookup(attachmentPath) || 'application/octet-stream';
      const mediaId = await _uploadMedia(attachmentPath, mimeType);

      let mediaType: string;
      if (mimeType.startsWith('image/')) {
        template = 'send_image_file';
        mediaType = 'image';
      } else {
        template = 'send_document_file';
        mediaType = 'document';
      }
      
      components.push({
        type: 'header',
        parameters: [{ type: mediaType, [mediaType]: { id: mediaId } }],
      });

      if (data.content) {
        components.push({
          type: 'body',
          parameters: [{ type: 'text', text: data.content }],
        });
      }
    } else {
      template = 'send_plain_text';
      components.push(
        {
          type: 'header',
          parameters: [{ type: 'text', text: 'Automated response' }]
        },
        {
          type: 'body',
          parameters: [{ type: 'text', text: data.content }]
        }
      );
    }

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: data.recipient,
      type: 'template',
      template: {
        name: template,
        language: {
          code: 'en'
        },
        components
      }
    };

    const response = await axios.post(config.whatsapp.url, body, { headers });

    if (response.status === 200) {
      return {
        status: 'success',
        output: `Template '${template}' sent to ${data.recipient}`
      };
    } else {
      return {
        status: 'failure',
        output: `Error ${response.status}: ${JSON.stringify(response.data)}`
      };
    }
  } catch (error: any) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : String(error);
    console.error('Error sending WhatsApp message:', errorMessage);
    return {
      status: 'failure',
      output: `Exception: ${errorMessage}`
    };
  }
} 


async function whatsappCommunication(args: WhatsAppRequest): Promise<CallToolResult> {
  try {
    const sanitizedContent = sanitizeWhatsAppText(args.content);
    const result = await sendWhatsApp({
      content: sanitizedContent,
      recipient: args.recipient,
      attachment_path: args.attachment_path
    });

    const message = result.status === 'success' 
      ? `WhatsApp message sent successfully: ${result.output}`
      : `WhatsApp message failed: ${result.output}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: message
        }
      ]
    };
  } catch (error) {
    console.error('Failure to communicate through WhatsApp:', error);
    throw error;
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
