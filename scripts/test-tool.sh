#!/bin/bash

# Test Tool Runner Script
# This script makes it easy to test individual tool handlers

# Check if tool name is provided
if [ -z "$1" ]; then
  echo "Error: Tool name required"
  echo "Usage: ./scripts/test-tool.sh <tool-name> [json-args]"
  exit 1
fi

TOOL_NAME=$1
ARGS=${2:-'{}'}

# Check if .env.test exists, create if not
if [ ! -f .env.test ]; then
  echo "Creating default .env.test file..."
  cat > .env.test << EOL
# Test environment variables for tool testing
# Database connection
MONGODB_URI=mongodb://localhost:27017/dev-syia-api
MONGODB_DB_NAME=dev-syia-api

# API keys and credentials
# Add any API keys needed for testing tools

# Test user data
TEST_USER_EMAIL=test.user@example.com
EOL
  echo ".env.test created. Please update with your actual test credentials."
fi

# Build the project if dist directory doesn't exist
if [ ! -d "dist" ]; then
  echo "Building project..."
  npm run build
fi

# Run the test tool
echo "Testing tool: $TOOL_NAME"
echo "Arguments: $ARGS"
echo "--------------------------------------------------"
node bin/test-tool.js "$TOOL_NAME" "$ARGS" 