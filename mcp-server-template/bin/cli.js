#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

program
  .name('mcp-server-template')
  .description('MCP Server Template CLI')
  .version('1.0.0');

program
  .command('start')
  .description('Start the MCP server')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .option('-e, --env <env>', 'Environment to run in', 'development')
  .action((options) => {
    console.log(`Starting MCP server on port ${options.port} in ${options.env} mode...`);
    // Import and start the server
    import(join(__dirname, '..', 'dist', 'index.js')).catch(console.error);
  });

program
  .command('test-tool <toolName>')
  .description('Test a specific tool')
  .option('-d, --data <data>', 'Test data as JSON string')
  .action((toolName, options) => {
    console.log(`Testing tool: ${toolName}`);
    if (options.data) {
      console.log(`With data: ${options.data}`);
    }
    // Import and run the test tool
    import('./test-tool.js').catch(console.error);
  });

program.parse();