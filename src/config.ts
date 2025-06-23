import dotenv from 'dotenv';
import { Command } from 'commander';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  mongodb: {
    uri: string;
    dbName: string;
  };
  oauth: {
    clientId: string | null;
    clientSecret: string | null;
    authUri: string;
    tokenUri: string;
    redirectUris: string | null;
    scopes: string;
  };
  whatsapp: {
    token: string | null;
    url: string | null;
  };
  debug: boolean;
  nonInteractive: boolean;
  typesense: {
    host: string;
    port: number;
    protocol: string;
    apiKey: string;
  };
  perplexity: {
    apiKey: string;
  };
  llamaIndex: {
    apiKey: string;
    vendorModel: string;
  };
}

export function getConfig(): Config {
  const program = new Command();
  
  program
    .option('--mongodb-uri <uri>', 'MongoDB connection URI')
    .option('--mongo-uri <uri>', 'Alias for --mongodb-uri')
    .option('--mongodb-db-name <name>', 'MongoDB database name')
    .option('--db-name <name>', 'Alias for --mongodb-db-name')
    .option('--oauth-client-id <id>', 'OAuth client ID for Gmail')
    .option('--oauth-client-secret <secret>', 'OAuth client secret for Gmail')
    .option('--gmail-auth-uri <uri>', 'Gmail OAuth auth URI')
    .option('--gmail-token-uri <uri>', 'Gmail OAuth token URI')
    .option('--gmail-redirect-uris <uris>', 'Gmail OAuth redirect URIs')
    .option('--gmail-scopes <scopes>', 'Gmail OAuth scopes')
    .option('--whatsapp-token <token>', 'WhatsApp API token')
    .option('--whatsapp-url <url>', 'WhatsApp API URL')
    .option('--typesense-host <host>', 'Typesense host')
    .option('--typesense-port <port>', 'Typesense port')
    .option('--typesense-protocol <protocol>', 'Typesense protocol')
    .option('--typesense-api-key <key>', 'Typesense API key')
    .option('--perplexity-api-key <key>', 'Perplexity API key')
    .option('--llama-index-api-key <key>', 'LlamaIndex API key')
    .option('--llama-index-vendor-model <model>', 'LlamaIndex vendor model')
    .option('--debug', 'Enable debug logging')
    .option('--non-interactive, -n', 'Run in non-interactive mode')
    .allowUnknownOption()
    .parse();

  const options = program.opts();

  // MongoDB Configuration
  const mongodbUri = options.mongodbUri || options.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const mongodbDbName = options.mongodbDbName || options.dbName || process.env.MONGODB_DB_NAME || 'mcp_communication';

  // Typesense Configuration
  const typesenseHost = options.typesenseHost || process.env.TYPESENSE_HOST || 'j51ouydaces0i2m7p-1.a1.typesense.net';
  const typesensePort = options.typesensePort ? parseInt(options.typesensePort, 10) : (process.env.TYPESENSE_PORT ? parseInt(process.env.TYPESENSE_PORT, 10) : 443);
  const typesenseProtocol = options.typesenseProtocol || process.env.TYPESENSE_PROTOCOL || 'https';
  const typesenseApiKey = options.typesenseApiKey || process.env.TYPESENSE_API_KEY || "wgTfJoajCRXWWNlLILAdZh1bU66RA4wv";  //wgTfJoajCRXWWNlLILAdZh1bU66RA4wv
  
  // OAuth Configuration
  const oauthClientId = options.oauthClientId || process.env.OAUTH_CLIENT_ID || null;
  const oauthClientSecret = options.oauthClientSecret || process.env.OAUTH_CLIENT_SECRET || null;
  const gmailAuthUri = options.gmailAuthUri || process.env.GMAIL_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth';
  const gmailTokenUri = options.gmailTokenUri || process.env.GMAIL_TOKEN_URI || 'https://oauth2.googleapis.com/token';
  const gmailRedirectUris = options.gmailRedirectUris || process.env.GMAIL_REDIRECT_URIS || "http://localhost";
  const gmailScopes = options.gmailScopes || process.env.GMAIL_SCOPES || 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://mail.google.com/';

  // WhatsApp Configuration
  const whatsappToken = options.whatsappToken || process.env.WHATSAPP_TOKEN || null;
  const whatsappUrl = options.whatsappUrl || process.env.WHATSAPP_URL || null;

  // Perplexity Configuration
  const perplexityApiKey = options.perplexityApiKey || process.env.PERPLEXITY_API_KEY || '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';


  // LlamaIndex Configuration
  const llamaIndexApiKey = options.llamaIndexApiKey || process.env.LLAMAINDEX_API_KEY || "llx-TNt937hyXcwVxNAdwXAZXKH89yJC1ofwO7xMPDExPnkwLAxR";
  const llamaIndexVendorModel = options.llamaIndexVendorModel || process.env.LLAMAINDEX_VENDOR_MODEL || "gemini-2.0-flash-001";

  // Other options
  const debug = options.debug || false;
  const nonInteractive = options.nonInteractive || false;

  // Logging similar to Python version
  console.log(`Final MONGODB_URI: ${mongodbUri.length > 20 ? mongodbUri.substring(0, 20) + '...' : mongodbUri}`);
  console.log(`Final MONGODB_DB_NAME: ${mongodbDbName ? 'Set' : 'Not set'}`);
  console.log(`Final TYPESENSE_HOST: ${typesenseHost ? 'Set' : 'Not set'}`);
  console.log(`Final TYPESENSE_PORT: ${typesensePort ? 'Set' : 'Not set'}`);
  console.log(`Final TYPESENSE_PROTOCOL: ${typesenseProtocol ? 'Set' : 'Not set'}`);
  console.log(`Final TYPESENSE_API_KEY: ${typesenseApiKey ? 'Set' : 'Not set'}`);
  console.log(`Final OAUTH_CLIENT_ID: ${oauthClientId ? 'Set' : 'Not set'}`);
  console.log(`Final OAUTH_CLIENT_SECRET: ${oauthClientSecret ? 'Set' : 'Not set'}`);
  console.log(`Final GMAIL_AUTH_URI: ${gmailAuthUri ? 'Set' : 'Not set'}`);
  console.log(`Final GMAIL_TOKEN_URI: ${gmailTokenUri ? 'Set' : 'Not set'}`);
  console.log(`Final GMAIL_REDIRECT_URIS: ${gmailRedirectUris ? 'Set' : 'Not set'}`);
  console.log(`Final GMAIL_SCOPES: ${gmailScopes ? 'Set' : 'Not set'}`);
  console.log(`Final WHATSAPP_TOKEN: ${whatsappToken ? 'Set' : 'Not set'}`);
  console.log(`Final WHATSAPP_URL: ${whatsappUrl ? 'Set' : 'Not set'}`);
  console.log(`Final PERPLEXITY_API_KEY: ${perplexityApiKey ? 'Set' : 'Not set'}`);
  console.log(`Final LLAMAINDEX_API_KEY: ${llamaIndexApiKey ? 'Set' : 'Not set'}`);
  console.log(`Final LLAMAINDEX_VENDOR_MODEL: ${llamaIndexVendorModel ? 'Set' : 'Not set'}`);
  // Validation warnings
  if (!oauthClientId || !oauthClientSecret) {
    console.warn('OAuth credentials not provided. Gmail functionality will be disabled.');
  }

  if (!whatsappToken || !whatsappUrl) {
    console.warn('WhatsApp credentials not provided. WhatsApp functionality will be disabled.');
  }
  
  if (!typesenseApiKey) {
    console.warn('Typesense API key not provided. Fleet vessel lookup will likely fail.');
  }

  return {
    mongodb: {
      uri: mongodbUri,
      dbName: mongodbDbName,
    },
    oauth: {
      clientId: oauthClientId,
      clientSecret: oauthClientSecret,
      authUri: gmailAuthUri,
      tokenUri: gmailTokenUri,
      redirectUris: gmailRedirectUris,
      scopes: gmailScopes,
    },
    whatsapp: {
      token: whatsappToken,
      url: whatsappUrl,
    },
    debug,
    nonInteractive,
    typesense: {
      host: typesenseHost,
      port: typesensePort,
      protocol: typesenseProtocol,
      apiKey: typesenseApiKey,
    },
    perplexity: {
      apiKey: perplexityApiKey,
    },
    llamaIndex: {
      apiKey: llamaIndexApiKey,
      vendorModel: llamaIndexVendorModel,
    },
  };
}

export const config = getConfig(); 