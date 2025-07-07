import { Config } from './index.js';
import { logger } from '../utils/logger.js';

export function validateConfig(config: Config): void {
  const errors: string[] = [];

  // Validate port
  if (config.port < 1 || config.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }

  // Validate environment
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(config.nodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }

  // Validate database configuration in production
  if (config.nodeEnv === 'production' && !config.database.url) {
    errors.push('Database URL is required in production');
  }

  // Validate authentication secrets in production
  if (config.nodeEnv === 'production') {
    if (!config.auth.secret) {
      errors.push('AUTH_SECRET is required in production');
    }
    if (!config.auth.jwtSecret) {
      errors.push('JWT_SECRET is required in production');
    }
  }

  // Validate logging level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.logging.level)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  if (errors.length > 0) {
    logger.error('Configuration validation failed:', errors);
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }

  logger.info('Configuration validation passed');
}