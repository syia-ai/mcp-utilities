#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

// Debug info - write to a debug file
const debugFile = path.join(os.tmpdir(), 'mcp-utilities-debug.log');
const writeDebug = (message) => {
  try {
    fs.appendFileSync(debugFile, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    // Silently fail if we can't write to the debug file
  }
};

// Start debugging
writeDebug('Communication MCP CLI script started');
writeDebug(`Node version: ${process.version}`);
writeDebug(`Platform: ${process.platform}`);
writeDebug(`CLI Arguments: ${process.argv.join(' ')}`);
writeDebug(`Is stdin a TTY: ${process.stdin.isTTY}`);
writeDebug(`Is stdout a TTY: ${process.stdout.isTTY}`);
writeDebug(`Process PID: ${process.pid}`);
writeDebug(`Executable path: ${process.execPath}`);
writeDebug(`Current directory: ${process.cwd()}`);

// Print debug file location to stderr (not stdout)
console.error(`Debug log: ${debugFile}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

writeDebug(`__filename: ${__filename}`);
writeDebug(`__dirname: ${__dirname}`);
writeDebug(`packageRoot: ${packageRoot}`);

// Check if bin/cli.js is executable
try {
  const stats = fs.statSync(__filename);
  const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
  writeDebug(`Is CLI executable: ${isExecutable}`);
  
  // Make it executable if it's not
  if (!isExecutable) {
    fs.chmodSync(__filename, '755');
    writeDebug('Made CLI executable');
  }
} catch (err) {
  writeDebug(`Error checking/setting executable: ${err.message}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
let debug = false;
let nonInteractive = false;
let mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let mongodbDbName = process.env.MONGODB_DB_NAME || 'mcp_communication';
let oauthClientId = process.env.OAUTH_CLIENT_ID || null;
let oauthClientSecret = process.env.OAUTH_CLIENT_SECRET || null;
let gmailAuthUri = process.env.GMAIL_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth';
let gmailTokenUri = process.env.GMAIL_TOKEN_URI || 'https://oauth2.googleapis.com/token';
let gmailRedirectUris = process.env.GMAIL_REDIRECT_URIS || null;
let gmailScopes = process.env.GMAIL_SCOPES || 'https://www.googleapis.com/auth/gmail.send';
let whatsappToken = process.env.WHATSAPP_TOKEN || null;
let whatsappUrl = process.env.WHATSAPP_URL || null;

// Detect if we're running under an MCP context
const isMcpContext = 
  !process.stdin.isTTY || 
  process.env.npm_execpath?.includes('npx') ||
  args.includes('--non-interactive') || args.includes('-n');

writeDebug(`Detected MCP context: ${isMcpContext}`);
if (isMcpContext) {
  nonInteractive = true;
  writeDebug('Setting non-interactive mode due to MCP context detection');
}

// Process command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--debug') {
    debug = true;
    writeDebug('Debug mode enabled');
  } else if (arg === '--non-interactive' || arg === '-n') {
    nonInteractive = true;
    writeDebug('Non-interactive mode enabled via flag');
  } else if (arg === '--mongodb-uri' || arg === '--mongo-uri') {
    if (i + 1 < args.length) {
      mongodbUri = args[++i];
      writeDebug(`MongoDB URI set to: ${mongodbUri}`);
    }
  } else if (arg === '--mongodb-db-name' || arg === '--db-name') {
    if (i + 1 < args.length) {
      mongodbDbName = args[++i];
      writeDebug(`MongoDB database name set to: ${mongodbDbName}`);
    }
  } else if (arg === '--oauth-client-id') {
    if (i + 1 < args.length) {
      oauthClientId = args[++i];
      writeDebug(`OAuth client ID set via argument`);
    }
  } else if (arg === '--oauth-client-secret') {
    if (i + 1 < args.length) {
      oauthClientSecret = args[++i];
      writeDebug(`OAuth client secret set via argument`);
    }
  } else if (arg === '--gmail-auth-uri') {
    if (i + 1 < args.length) {
      gmailAuthUri = args[++i];
      writeDebug(`Gmail auth URI set to: ${gmailAuthUri}`);
    }
  } else if (arg === '--gmail-token-uri') {
    if (i + 1 < args.length) {
      gmailTokenUri = args[++i];
      writeDebug(`Gmail token URI set to: ${gmailTokenUri}`);
    }
  } else if (arg === '--gmail-redirect-uris') {
    if (i + 1 < args.length) {
      gmailRedirectUris = args[++i];
      writeDebug(`Gmail redirect URIs set via argument`);
    }
  } else if (arg === '--gmail-scopes') {
    if (i + 1 < args.length) {
      gmailScopes = args[++i];
      writeDebug(`Gmail scopes set via argument`);
    }
  } else if (arg === '--whatsapp-token') {
    if (i + 1 < args.length) {
      whatsappToken = args[++i];
      writeDebug(`WhatsApp token set via argument`);
    }
  } else if (arg === '--whatsapp-url') {
    if (i + 1 < args.length) {
      whatsappUrl = args[++i];
      writeDebug(`WhatsApp URL set via argument`);
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Communication MCP Server - Email and WhatsApp Communication

Usage: npx mcp-utilities [options]

Options:
  --mongodb-uri URI         Set MongoDB URI (default: mongodb://localhost:27017)
  --mongo-uri URI           Alias for --mongodb-uri
  --mongodb-db-name NAME    Set MongoDB database name (default: mcp_communication)
  --db-name NAME            Alias for --mongodb-db-name
  --oauth-client-id ID      Set OAuth client ID for Gmail
  --oauth-client-secret SECRET Set OAuth client secret for Gmail
  --gmail-auth-uri URI      Set Gmail auth URI (default: https://accounts.google.com/o/oauth2/auth)
  --gmail-token-uri URI     Set Gmail token URI (default: https://oauth2.googleapis.com/token)
  --gmail-redirect-uris URIS Set Gmail redirect URIs (comma-separated)
  --gmail-scopes SCOPES     Set Gmail scopes (default: https://www.googleapis.com/auth/gmail.send)
  --whatsapp-token TOKEN    Set WhatsApp API token
  --whatsapp-url URL        Set WhatsApp API URL
  --debug                   Enable debug output
  --non-interactive, -n     Run in non-interactive mode (no prompt)
  --help, -h               Show this help message

Environment Variables:
  MONGODB_URI              MongoDB connection URI
  MONGODB_DB_NAME          MongoDB database name
  OAUTH_CLIENT_ID          OAuth client ID for Gmail
  OAUTH_CLIENT_SECRET      OAuth client secret for Gmail
  GMAIL_AUTH_URI           Gmail OAuth auth URI
  GMAIL_TOKEN_URI          Gmail OAuth token URI
  GMAIL_REDIRECT_URIS      Gmail OAuth redirect URIs
  GMAIL_SCOPES             Gmail OAuth scopes
  WHATSAPP_TOKEN           WhatsApp API token
  WHATSAPP_URL             WhatsApp API URL

Examples:
  npx mcp-utilities                    # Start with default settings
  npx mcp-utilities --debug            # Start with debug logging
  npx mcp-utilities --mongo-uri mongodb://host:port/db --db-name mydb  # Use custom MongoDB
`);
    process.exit(0);
  }
}

function startServer() {
  const serverPath = path.join(packageRoot, 'dist', 'index.js');
  
  // Check if the compiled server exists
  if (!fs.existsSync(serverPath)) {
    console.error('Server not found. Building...');
    
    // Try to build the project
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: packageRoot,
      stdio: 'inherit'
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        startServerWithPath(serverPath);
      } else {
        console.error('Build failed. Please run "npm run build" manually.');
        process.exit(1);
      }
    });
  } else {
    startServerWithPath(serverPath);
  }
}

function startServerWithPath(serverPath) {
  writeDebug(`Starting server with path: ${serverPath}`);
  
  // Prepare arguments for the server
  const serverArgs = [];
  
  if (debug) serverArgs.push('--debug');
  if (nonInteractive) serverArgs.push('--non-interactive');
  if (mongodbUri) serverArgs.push('--mongodb-uri', mongodbUri);
  if (mongodbDbName) serverArgs.push('--mongodb-db-name', mongodbDbName);
  if (oauthClientId) serverArgs.push('--oauth-client-id', oauthClientId);
  if (oauthClientSecret) serverArgs.push('--oauth-client-secret', oauthClientSecret);
  if (gmailAuthUri) serverArgs.push('--gmail-auth-uri', gmailAuthUri);
  if (gmailTokenUri) serverArgs.push('--gmail-token-uri', gmailTokenUri);
  if (gmailRedirectUris) serverArgs.push('--gmail-redirect-uris', gmailRedirectUris);
  if (gmailScopes) serverArgs.push('--gmail-scopes', gmailScopes);
  if (whatsappToken) serverArgs.push('--whatsapp-token', whatsappToken);
  if (whatsappUrl) serverArgs.push('--whatsapp-url', whatsappUrl);
  
  writeDebug(`Server arguments: ${serverArgs.join(' ')}`);
  
  // Start the server process
  const serverProcess = spawn(process.execPath, [serverPath, ...serverArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_PATH: process.env.NODE_PATH || '',
      MONGODB_URI: mongodbUri,
      MONGODB_DB_NAME: mongodbDbName,
      OAUTH_CLIENT_ID: oauthClientId,
      OAUTH_CLIENT_SECRET: oauthClientSecret,
      GMAIL_AUTH_URI: gmailAuthUri,
      GMAIL_TOKEN_URI: gmailTokenUri,
      GMAIL_REDIRECT_URIS: gmailRedirectUris,
      GMAIL_SCOPES: gmailScopes,
      WHATSAPP_TOKEN: whatsappToken,
      WHATSAPP_URL: whatsappUrl
    }
  });
  
  // Handle server process events
  serverProcess.on('error', (err) => {
    writeDebug(`Server process error: ${err.message}`);
    console.error('Failed to start Communication MCP server:', err.message);
    process.exit(1);
  });
  
  serverProcess.on('close', (code, signal) => {
    writeDebug(`Server process closed with code ${code} and signal ${signal}`);
    if (code !== 0) {
      console.error(`Communication MCP server exited with code ${code}`);
    }
    process.exit(code || 0);
  });
  
  // Handle SIGINT and SIGTERM
  process.on('SIGINT', () => {
    writeDebug('Received SIGINT, terminating server process');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    writeDebug('Received SIGTERM, terminating server process');
    serverProcess.kill('SIGTERM');
  });
}

// Start the server
startServer(); 