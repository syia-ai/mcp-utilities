import { logger } from '../utils/logger.js';

export interface ErrorContext {
  toolName?: string;
  requestId?: string;
  userId?: string;
}

export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export function errorHandler(error: Error, context?: ErrorContext): never {
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    context,
  });

  if (error instanceof MCPError) {
    throw error;
  }

  // Convert unknown errors to MCPError
  throw new MCPError(
    error.message || 'Internal server error',
    'INTERNAL_ERROR',
    500,
    context
  );
}