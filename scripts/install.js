#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

console.log('Installing Communication MCP Server...');

// Make the CLI script executable
const cliPath = path.join(packageRoot, 'bin', 'cli.js');
try {
  fs.chmodSync(cliPath, '755');
  console.log('Made CLI script executable');
} catch (err) {
  console.warn('Could not make CLI script executable:', err.message);
}

console.log('Communication MCP Server installation complete!');
console.log('You can now run: npx communication-mcp-server'); 