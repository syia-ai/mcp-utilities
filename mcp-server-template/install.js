#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Setting up MCP Server Template...');

// Create logs directory
const logsDir = join(__dirname, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory');
}

// Copy .env.example to .env if .env doesn't exist
const envExample = join(__dirname, '.env.example');
const envFile = join(__dirname, '.env');
if (!existsSync(envFile) && existsSync(envExample)) {
  copyFileSync(envExample, envFile);
  console.log('Created .env file from .env.example');
}

console.log('Setup complete! Please review your .env file and update configurations as needed.');