#!/bin/bash

# Shell script for quick tool testing
# Usage: ./scripts/test-tool.sh <tool-name> [test-data]

TOOL_NAME="$1"
TEST_DATA="${2:-{}}"

if [ -z "$TOOL_NAME" ]; then
  echo "Usage: $0 <tool-name> [test-data]"
  echo "Example: $0 example-tool '{\"input\": \"test\"}'"
  exit 1
fi

echo "Testing tool: $TOOL_NAME"
echo "Test data: $TEST_DATA"

# Run the test tool CLI
node bin/test-tool.js "$TOOL_NAME" --data "$TEST_DATA" --verbose