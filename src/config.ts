import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
    mongodb: {
        uri: string;
        dbName: string;
    };
    mongodbEtlDev: {
        uri: string;
        dbName: string;
    };
    oauth: {
        clientId: string;
        clientSecret: string;
        authUri: string;
        tokenUri: string;
        redirectUris: string;
        scopes: string;
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiryDate: number;
    };
    whatsapp: {
        token: string;
        url: string;
    };
    typesense: {
        host: string;
        port: number;
        protocol: string;
        apiKey: string;
    };
    cohereApiKey: string;
    openaiApiKey: string;
    perplexity: {
        apiKey: string;
    };
    llamaIndex: {
        apiKey: string;
        vendorModel: string;
    };
    syiaApiKey: string;
}

function parseArgs(): Config {
    const args = process.argv.slice(2);
    const config: Partial<Config> = {
        mongodb: {} as Config['mongodb'],
        mongodbEtlDev: {} as Config['mongodbEtlDev'],
        oauth: {} as Config['oauth'],
        whatsapp: {} as Config['whatsapp'],
        typesense: {} as Config['typesense'],
        perplexity: {} as Config['perplexity'],
        llamaIndex: {} as Config['llamaIndex']
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--mongo-uri' && i + 1 < args.length) {
            config.mongodb!.uri = args[++i];
        } else if (arg === '--db-name' && i + 1 < args.length) {
            config.mongodb!.dbName = args[++i];
        } else if (arg === '--mongodb-etl-dev-uri' && i + 1 < args.length) {
            config.mongodbEtlDev!.uri = args[++i];
        } else if (arg === '--mongodb-etl-dev-db-name' && i + 1 < args.length) {
            config.mongodbEtlDev!.dbName = args[++i];
        } else if (arg === '--typesense-host' && i + 1 < args.length) {
            config.typesense!.host = args[++i];
        } else if (arg === '--typesense-port' && i + 1 < args.length) {
            config.typesense!.port = parseInt(args[++i], 10);
        } else if (arg === '--typesense-protocol' && i + 1 < args.length) {
            config.typesense!.protocol = args[++i];
        } else if (arg === '--typesense-api-key' && i + 1 < args.length) {
            config.typesense!.apiKey = args[++i];
        } else if (arg === '--cohere-api-key' && i + 1 < args.length) {
            config.cohereApiKey = args[++i];
        } else if (arg === '--openai-api-key' && i + 1 < args.length) {
            config.openaiApiKey = args[++i];
        } else if (arg === '--oauth-client-id' && i + 1 < args.length) {
            config.oauth!.clientId = args[++i];
        } else if (arg === '--oauth-client-secret' && i + 1 < args.length) {
            config.oauth!.clientSecret = args[++i];
        } else if (arg === '--gmail-auth-uri' && i + 1 < args.length) {
            config.oauth!.authUri = args[++i];
        } else if (arg === '--gmail-token-uri' && i + 1 < args.length) {
            config.oauth!.tokenUri = args[++i];
        } else if (arg === '--gmail-redirect-uris' && i + 1 < args.length) {
            config.oauth!.redirectUris = args[++i];
        } else if (arg === '--gmail-scopes' && i + 1 < args.length) {
            config.oauth!.scopes = args[++i];
        } else if (arg === '--gmail-access-token' && i + 1 < args.length) {
            config.oauth!.accessToken = args[++i];
        } else if (arg === '--gmail-refresh-token' && i + 1 < args.length) {
            config.oauth!.refreshToken = args[++i];
        } else if (arg === '--gmail-token-type' && i + 1 < args.length) {
            config.oauth!.tokenType = args[++i];
        } else if (arg === '--gmail-expiry-date' && i + 1 < args.length) {
            config.oauth!.expiryDate = parseInt(args[++i], 10);
        } else if (arg === '--whatsapp-token' && i + 1 < args.length) {
            config.whatsapp!.token = args[++i];
        } else if (arg === '--whatsapp-url' && i + 1 < args.length) {
            config.whatsapp!.url = args[++i];
        } else if (arg === '--perplexity-api-key' && i + 1 < args.length) {
            config.perplexity!.apiKey = args[++i];
        } else if (arg === '--llama-index-api-key' && i + 1 < args.length) {
            config.llamaIndex!.apiKey = args[++i];
        } else if (arg === '--llama-index-vendor-model' && i + 1 < args.length) {
            config.llamaIndex!.vendorModel = args[++i];
        } else if (arg === '--syia-api-key' && i + 1 < args.length) {
            config.syiaApiKey = args[++i];
        }
    }

    return {
        mongodb: {
            uri: config.mongodb?.uri || process.env.MONGO_URI || '',
            dbName: config.mongodb?.dbName || process.env.DB_NAME || '',
        },
        mongodbEtlDev: {
            uri: config.mongodbEtlDev?.uri || process.env.MONGODB_ETL_DEV_URI || '',
            dbName: config.mongodbEtlDev?.dbName || process.env.MONGODB_ETL_DEV_DB_NAME || '',
        },
        oauth: {
            clientId: config.oauth?.clientId || process.env.OAUTH_CLIENT_ID || '',
            clientSecret: config.oauth?.clientSecret || process.env.OAUTH_CLIENT_SECRET || '',
            authUri: config.oauth?.authUri || process.env.GMAIL_AUTH_URI || '',
            tokenUri: config.oauth?.tokenUri || process.env.GMAIL_TOKEN_URI || '',
            redirectUris: config.oauth?.redirectUris || process.env.GMAIL_REDIRECT_URIS || '',
            scopes: config.oauth?.scopes || process.env.GMAIL_SCOPES || '',
            accessToken: config.oauth?.accessToken || process.env.GMAIL_ACCESS_TOKEN || '',
            refreshToken: config.oauth?.refreshToken || process.env.GMAIL_REFRESH_TOKEN || '',
            tokenType: config.oauth?.tokenType || process.env.GMAIL_TOKEN_TYPE || '',
            expiryDate: config.oauth?.expiryDate || (process.env.GMAIL_EXPIRY_DATE ? parseInt(process.env.GMAIL_EXPIRY_DATE, 10) : 0),
        },
        whatsapp: {
            token: config.whatsapp?.token || process.env.WHATSAPP_TOKEN || '',
            url: config.whatsapp?.url || process.env.WHATSAPP_URL || '',
        },
        typesense: {
            host: config.typesense?.host || process.env.TYPESENSE_HOST || '',
            port: config.typesense?.port || (process.env.TYPESENSE_PORT ? parseInt(process.env.TYPESENSE_PORT, 10) : 443),
            protocol: config.typesense?.protocol || process.env.TYPESENSE_PROTOCOL || '',
            apiKey: config.typesense?.apiKey || process.env.TYPESENSE_API_KEY || '',
        },
        cohereApiKey: config.cohereApiKey || process.env.COHERE_API_KEY || '',
        openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
        perplexity: {
            apiKey: config.perplexity?.apiKey || process.env.PERPLEXITY_API_KEY || '',
        },
        llamaIndex: {
            apiKey: config.llamaIndex?.apiKey || process.env.LLAMA_INDEX_API_KEY || '',
            vendorModel: config.llamaIndex?.vendorModel || process.env.LLAMA_INDEX_VENDOR_MODEL || '',
        },
        syiaApiKey: config.syiaApiKey || process.env.SYIA_API_KEY || '',
    };
}

export const config = parseArgs(); 