import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { config } from './config.js';

async function main(): Promise<void> {
  console.log('Starting MCP Utilities server...');

  // Create server instance
  const server = new Server(
    {
      name: 'mcp-utilities',
      version: '1.0.11'
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  // Register handlers
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  console.log('Registered tools, resources, and prompts');

  // Create transport
  const transport = new StdioServerTransport();
  
  try {
    await server.connect(transport);
    console.log('MCP Communication server started successfully');
  } catch (error) {
    console.error('Error running MCP server:', error);
    throw error;
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 