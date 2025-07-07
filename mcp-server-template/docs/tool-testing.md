# Tool Testing Documentation

## Overview

This document describes how to test individual tools in the MCP Server Template.

## Testing Tools

### Command Line Interface

Use the test tool CLI to test individual tools:

```bash
# Test a tool with default data
npm run test:tools example-tool

# Test a tool with custom data
npm run test:tools example-tool --data '{"input": "test data"}'

# Test with verbose output
npm run test:tools example-tool --data '{"input": "test"}' --verbose
```

### Shell Script

Use the shell script for quick testing:

```bash
# Make the script executable
chmod +x scripts/test-tool.sh

# Run a test
./scripts/test-tool.sh example-tool '{"input": "test"}'
```

## Test Harness

The test harness provides utilities for:
- Mock context generation
- Test data fixtures
- Automated testing of tool behavior

## Writing Tests

1. Create test files in `tests/tool-tests/`
2. Use the test harness utilities for consistent testing
3. Include both unit and integration tests
4. Test error conditions and edge cases

## Best Practices

- Test all tool input validation
- Verify expected output formats
- Test error handling
- Include performance benchmarks for resource-intensive tools