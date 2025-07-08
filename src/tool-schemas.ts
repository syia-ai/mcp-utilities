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
          description: 'Optional list of local file paths to attachments (supported extensions: .rtf, .md, .html, .pdf, .txt, .doc, .docx, .xls, .xlsx, .csv, .pptx, .ppt, .png, .jpg, .jpeg). If provided, the files will be attached to the email. You may use either a relative path (within the workspace) or an absolute/full path.',
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
            'If no attachment is present, template already contains "Hello, here is the information youve asked for."',
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
            'Optional local file path to an attachment (supported extensions:  .rtf, .md, .html, .pdf, .txt, .doc, .docx, .xls, .xlsx, .csv, .pptx, .ppt, .png, .jpg, .jpeg).',
            'If provided, the file will be uploaded and sent with the message.',
            'Text files (.txt) are automatically converted to PDF format.',
            'You may use either a relative path (within the workspace) or an absolute/full path.'
          ].join(' ')
        }
      },
      required: ['content', 'recipient']
    }
  },
  {
    name: 'get_vessel_personnel_info',
    description: [
      'Search and filter through the fleet vessel lookup database. ',
      'This tool allows users to retrieve vessel records and related management details by applying filters on vessel name, IMO number, class, fleet, owners, superintendent, status, and other attributes. ',
      'Use this tool whenever information is required about a vessel or its management structure, or when listing/filtering vessels by any operational parameter. ',
      'Fleet-vessel-lookup schema',
      "'name': 'vesselName', 'type': 'string', 'desc': 'Name of the vessel', 'index': true, 'sort': false",
      "'name': 'imo', 'type': 'int64', 'desc': 'IMO number of the vessel, use for filter not for queryby argument', 'index': true, 'sort': true",
      "'name': 'class', 'type': 'string', 'desc': 'The name of the Classification society with which the vessel is classed (e.g., ABS, DNV)', 'index': true, 'sort': false",
      "'name': 'fleet', 'type': 'string', 'desc': 'Name/code of the vessel's fleet group', 'index': true, 'sort': false",
      "'name': 'groupName', 'type': 'string', 'desc': 'Name for the vessel group (e.g., SDK Fleet Datharam)', 'index': true, 'sort': false",
      "'name': 'owner', 'type': 'string[]', 'desc': 'List of company names owning the vessel', 'index': true, 'sort': false",
      "'name': 'mainOwner', 'type': 'string', 'desc': 'Primary owner of the vessel', 'index': true, 'sort': false",
      "'name': 'technicalSuperintendent', 'type': 'string', 'desc': 'Name of the technical superintendent', 'index': true, 'sort': false",
      "'name': 'technicalSuperintendentEmailId', 'type': 'string', 'desc': 'Email ID of the technical superintendent', 'index': true, 'sort': false",
      "'name': 'backupTechSuperintendent', 'type': 'string', 'desc': 'Name of the backup technical superintendent', 'index': true, 'sort': false",
      "'name': 'backupTechSuperintendentEmailId', 'type': 'string', 'desc': 'Email ID of backup technical superintendent', 'index': true, 'sort': false",
      "'name': 'fleetManager', 'type': 'string', 'desc': 'Name of the fleet manager', 'index': true, 'sort': false",
      "'name': 'fleetManagerEmailId', 'type': 'string', 'desc': 'Email ID of fleet manager', 'index': true, 'sort': false",
      "'name': 'marineManager', 'type': 'string', 'desc': 'Name of marine manager', 'index': true, 'sort': false",
      "'name': 'marineManagerEmailId', 'type': 'string', 'desc': 'Email ID of marine manager', 'index': true, 'sort': false",
      "'name': 'marineSuperintendent', 'type': 'string', 'desc': 'Name of marine superintendent', 'index': true, 'sort': false",
      "'name': 'marineSuperintendentEmailId', 'type': 'string', 'desc': 'Email ID of marine superintendent', 'index': true, 'sort': false",
      "'name': 'vesselEmailId', 'type': 'string', 'desc': 'Vessel email address', 'index': true, 'sort': false",
      "'name': 'status', 'type': 'string', 'desc': 'Status which identifies whether vessel is still managed by the company (e.g., ACTIVE)', 'index': true, 'sort': false",
      "'name': 'vesselCode', 'type': 'string', 'desc': 'Short internal vessel code ', 'index': true, 'sort': false",
      "'name': 'shippalmDoc', 'type': 'string', 'desc': 'DOC(Document of Compliance) of the vessel as per shippalm', 'index': true, 'sort': false",
      "'name': 'doc', 'type': 'string', 'desc': 'DOC(Document of Compliance) to which the ship belongs to ', 'index': true, 'sort': false",
      "'name': 'classDoc', 'type': 'string', 'desc': 'The DOC(Document of Compliance) name to be used for getting the class login credentials', 'index': true, 'sort': false",
      "'name': 'isV3', 'type': 'bool', 'desc': 'True if vessel is using Shippalm V3 as ERP software', 'index': true, 'sort': true",
      "'name': 'createdAt', 'type': 'string', 'desc': 'Date/time (UTC) when the document was created (yyyy-mm-dd HH:MM:SS)', 'index': true, 'sort': true",
      "'name': 'createdAtIst', 'type': 'string', 'desc': 'Date/time (IST) when the document was created (yyyy-mm-dd HH:MM:SS)', 'index': true, 'sort': true",
      "'name': 'docForKnime', 'type': 'string', 'desc': 'Document reference for Knime integration', 'index': true, 'sort': false"
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
              },
              parsing_instruction: {
                  type: "string",
                  description: "Optional parsing instructions to guide how the document should be processed"
              }
          },
          additionalProperties: false
      }
  },
    {
        name: "get_vessel_details",
        description: "Retrieves vessel details including IMO number, vessel name, class, flag, DOC and the ERP version for a specific vessel.",
        inputSchema: {
            type: "object",
            properties: {
                vessel_name: {
                    type: "string", 
                    description: "Pass the vessel name to search for the IMO number"
                }
            },
            required: ["vessel_name"]
        }
    },
    {
      name: "get_fleet_details",
      description: "Retrieves fleet details including fleet name, fleet code and fleet manager details",
      inputSchema: {
          type: "object",
          properties: {
              fleet_name: {
                  type: "string", 
                  description: "Pass the fleet name to search for the fleet details"
              }
          },
          required: ["fleet_name"]
      }
  },
  // {
  //   name: "get_user_associated_vessels",
  //   description: "Retrieves a list of vessels associated with a specific user (by email).",
  //   inputSchema: {
  //       type: "object",
  //       properties: {
  //           emailId: {
  //               type: "string",
  //               description: "The email address of the user to find associated vessels for."
  //           }
  //       },
  //       required: ["emailId"],
  //       additionalProperties: false
  //   }
  // },
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