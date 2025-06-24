import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const communicationTools: Tool[] = [ 
  {
    name: 'mail_communication',
    description: [
      'Use this tool to send formal emails to one or more recipients.',
      'It supports a subject line, an HTML-formatted email body, and optional CC and BCC fields.',
      'Use this tool when you have email addresses of the people you want to contact.',
      'You can send the same message to many people at once.'
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: [
            'The subject line of the email. Keep it concise and professional.',
            'Maximum length is 100 characters.'
          ].join(' '),
          maxLength: 100
        },
        content: {
          type: 'string',
          description: [
            'The main content of the email, written in HTML.',
            'This allows formatting like bold text, lists, and links.',
            'End the message with the signature: \'Best regards,<br>SIYA\'.'
          ].join(' ')
        },
        recipient: {
          type: 'array',
          description: [
            'A list of email addresses for the main recipients (To field).',
            'Must contain at least one valid email address.'
          ].join(' '),
          items: { type: 'string', format: 'email' },
          examples: [['example@siya.com']]
        },
        cc: {
          type: 'array',
          description: 'Optional list of email addresses to be included in the CC (carbon copy) field.',
          items: { type: 'string', format: 'email' }
        },
        bcc: {
          type: 'array',
          description: 'Optional list of email addresses to be included in the BCC (blind carbon copy) field.',
          items: { type: 'string', format: 'email' }
        },
        attachment_paths: {
          type: 'array',
          description: 'Optional list of local file paths to attachments (e.g., .txt, .pdf, .png, .jpg). If provided, the files will be attached to the email.',
          items: { type: 'string' }
        }
      },
      required: ['subject', 'content', 'recipient']
    }
  },
  {
    name: 'whatsapp_communication',
    description: [
      'Use this tool to send quick, informal text messages via WhatsApp.',
      'It is designed for real-time, individual communication using a phone number.',
      'Only one phone number can be messaged per tool call.'
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: [
            'The main text of the message to be sent. It must be plain text.',
            'Avoid including greetings or sign-offs (e.g., \'Hello\', \'Thank you\') — these are added automatically by the template.',
            'If an attachment is included, template already contains "Hello, PFA the image/document."',
            'If no attachment is present, template already contains "Hello, here is the information you’ve asked for."',
            'Write the message so that, when combined with the template, it is clear and non-repetitive.'
          ].join(' ')
        },
        recipient: {
          type: 'string',
          description: [
            'The recipient\'s WhatsApp phone number.',
            'It can be in international E.164 format (e.g., +14155552671) or a local number (e.g., 9876543210),',
            'which will be automatically normalized.'
          ].join(' '),
          pattern: '^(\\+?[1-9]\\d{1,14}|\\d{6,15})$',
          examples: ['+919876543210', '9876543210']
        },
        attachment_path: {
          type: 'string',
          description: [
            'Optional local file path to an attachment (e.g., .txt, .pdf, .png, .jpg).',
            'If provided, the file will be uploaded and sent with the message.',
            'Text files (.txt) are automatically converted to PDF format.'
          ].join(' ')
        }
      },
      required: ['content', 'recipient']
    }
  },
  {
    name: 'fleet_vessel_lookup',
    description: [
      'Use this tool to get information about vessels, fleets, and personnel from the fleet-vessel lookup system. ',
      "It can answer questions like 'Who is the technical superintendent for ZY YULONG?', ",
      "'Which vessels are in fleet B?', or 'Which vessels does Ravisekhar B V manage?'. ",
      'You can provide one or more query parameters to refine your search (e.g., a name and a vessel).'
    ].join(' '),
    inputSchema: {
      type: 'object', 
      properties: {
        name_query: {
          type: 'string',
          description: "A query based on a person's name. Use this to find information about a specific person."
        },
        vessel_query: {
          type: 'string',
          description: "A query based on a vessel's name or IMO number. Use this to find information about a specific vessel."
        },
        email_query: {
          type: 'string',
          description: 'A query based on an email address. Use this to find information associated with a specific email.'
        }
      }
    }
  },
  {
    name: "google_search",
    description: "Perform a Google search using a natural language query. Returns relevant web results.",
    inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
            query: {
                type: "string",
                description: "The search query to be executed."
            }
        },
        additionalProperties: false
    }
  },
  {
      name: "parse_document_link",
      description: "Use this tool to parse a document link or a local file. The tool will parse the document and return the text content.",
      inputSchema: {
          type: "object",
          required: ["document_link"],
          properties: {
              document_link: {
                  type: "string",
                  description: "The link to the document that needs to be parsed"
              }
          },
          additionalProperties: false
      }
  },
  {
    name: "get_user_associated_vessels",
    description: "Retrieves a list of vessels associated with a specific user (by email).",
    inputSchema: {
        type: "object",
        properties: {
            emailId: {
                type: "string",
                description: "The email address of the user to find associated vessels for."
            }
        },
        required: ["emailId"],
        additionalProperties: false
    }
  },
  {
    name: "get_user_task_list",
    description: "Retrieves a list of pending and completed tasks associated with a specific user (by email).",
    inputSchema: {
        type: "object",
        properties: {
            emailId: {
                type: "string",
                description: "The email address of the user to find associated tasks for."
            }
        },
        required: ["emailId"],
        additionalProperties: false
    }
  }
  
];

export const toolDefinitions = communicationTools; 