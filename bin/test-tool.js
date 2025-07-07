#!/usr/bin/env node

/**
 * Tool Testing CLI
 * 
 * Usage:
 *   node bin/test-tool.js <tool-name> <json-args>
 * 
 * Example:
 *   node bin/test-tool.js getUserTaskList '{"emailId": "user@example.com"}'
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Error: Tool name required');
    console.log('Usage: node bin/test-tool.js <tool-name> <json-args>');
    process.exit(1);
  }
  
  const toolName = args[0];
  const toolArgs = args[1] ? JSON.parse(args[1]) : {};
  
  try {
    // Import the tools module
    const toolsPath = path.resolve(process.cwd(), 'dist/tools.js');
    
    // Check if the compiled file exists
    if (!fs.existsSync(toolsPath)) {
      console.error(`Error: Tools file not found at ${toolsPath}`);
      console.log('Make sure to build the project first with: npm run build');
      process.exit(1);
    }
    
    const tools = require(toolsPath);
    
    // Check if the tool exists
    if (!tools[toolName]) {
      console.error(`Error: Tool "${toolName}" not found`);
      console.log('Available tools:');
      Object.keys(tools)
        .filter(key => typeof tools[key] === 'function')
        .forEach(key => console.log(`- ${key}`));
      process.exit(1);
    }
    
    // Execute the tool
    console.log(`Testing tool: ${toolName}`);
    console.log(`Arguments: ${JSON.stringify(toolArgs, null, 2)}`);
    console.log('-'.repeat(50));
    
    const result = await tools[toolName](toolArgs);
    
    console.log('-'.repeat(50));
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error executing tool:', error);
    process.exit(1);
  }
}

main().catch(console.error); 