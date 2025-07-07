# API Documentation

## Overview

This document describes the API endpoints and tool interfaces for the MCP Server Template.

## Tools

### Example Tool

**Name:** `example-tool`
**Description:** An example tool for demonstration purposes

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "Input text for the tool"
    }
  },
  "required": ["input"]
}
```

**Example Usage:**
```json
{
  "name": "example-tool",
  "arguments": {
    "input": "Hello, world!"
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Example tool executed with input: Hello, world!"
    }
  ]
}
```