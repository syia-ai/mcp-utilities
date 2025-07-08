import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { validateConfig } from './validation.js';

dotenvConfig();

const configSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.string().default('development'),
  database: z.object({
    url: z.string().optional(),
    name: z.string().optional(),
  }),
  externalApi: z.object({
    baseUrl: z.string().optional(),
    key: z.string().optional(),
  }),
  auth: z.object({
    secret: z.string().optional(),
    jwtSecret: z.string().optional(),
  }),
  logging: z.object({
    level: z.string().default('info'),
    file: z.string().default('logs/server.log'),
  }),
  features: z.object({
    enableFeatureX: z.boolean().default(false),
    enableFeatureY: z.boolean().default(true),
  }),
});

export type Config = z.infer<typeof configSchema>;

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
    name: process.env.DATABASE_NAME,
  },
  externalApi: {
    baseUrl: process.env.EXTERNAL_API_BASE_URL,
    key: process.env.EXTERNAL_API_KEY,
  },
  auth: {
    secret: process.env.AUTH_SECRET,
    jwtSecret: process.env.JWT_SECRET,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/server.log',
  },
  features: {
    enableFeatureX: process.env.ENABLE_FEATURE_X === 'true',
    enableFeatureY: process.env.ENABLE_FEATURE_Y !== 'false',
  },
};

// Validate configuration
validateConfig(config);

export { config };