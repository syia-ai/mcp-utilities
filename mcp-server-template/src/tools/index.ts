import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../middleware/error-handler.js';

export function registerTools(server: Server): void {
  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing available tools');
    return {
      tools: [
        {
          name: 'example-tool',
          description: 'An example tool for demonstration',
          inputSchema: {
            type: 'object',
            properties: {
              input: {
                type: 'string',
                description: 'Input text for the tool',
              },
            },
            required: ['input'],
          },
        },
      ],
    };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.debug(`Calling tool: ${name}`, { args });

    try {
      switch (name) {
        case 'example-tool':
          return {
            content: [
              {
                type: 'text',
                text: `Example tool executed with input: ${args.input}`,
              },
            ],
          };
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      errorHandler(error as Error, { toolName: name });
    }
  });

  logger.info('Tools registered successfully');
}