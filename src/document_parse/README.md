# Document Link Parser

A TypeScript utility for parsing and extracting structured content from documents using LlamaParse.

## Overview

This tool helps you extract and structure content from various document formats (PDF, Office documents, images) stored in S3 or accessible via direct URLs. It downloads the documents and uses LlamaParse to parse the content into well-formatted markdown.

## Features

- Download documents from S3 or direct URLs
- Extract structured content using LlamaParse API
- Output content in both JSON and markdown formats
- Process images with text extraction
- Handle tables and maintain document structure
- Full TypeScript support with type definitions
- Promise-based async/await API

## Installation

This module is part of the larger TypeScript project. Make sure you have the required dependencies installed:

```bash
npm install
```

## Configuration

The tool requires API keys to function properly. Create a `.env` file in the project root with the following variables:

```
# LlamaParse API Key
LLAMA_API_KEY=your_llama_api_key

# Vendor Model (Anthropic or other model provider)
VENDOR_MODEL=your_vendor_model
```

## Usage

### Basic Usage in TypeScript/JavaScript

```typescript
import { parseToDocumentLink } from './src/utils/document_parse/index.js';

// Convert document from S3 URL to markdown
const [success, markdownContent] = await parseToDocumentLink(
  "https://your-bucket.s3.amazonaws.com/path/to/document.pdf"
);

if (success && markdownContent) {
  console.log(markdownContent);
  // Do something with the markdown content...
}
```

### Using LlamaParse Client Directly

```typescript
import { LlamaParseClient } from './src/utils/document_parse/index.js';

const client = new LlamaParseClient(apiKey, vendorModel);

// Parse document file to JSON and/or markdown
const [success, result] = await client.parseDocument(
  "path/to/document.pdf",
  undefined, // parsing instruction
  20, // max retries
  5, // retry delay
  "json" // result format
);
```

### Using Individual Functions

```typescript
import { 
  parseDocumentFile, 
  extractMarkdownFromJson,
  parseDocumentToMarkdown 
} from './src/utils/document_parse/index.js';

// Parse document file
const [success, outputPath, result] = await parseDocumentFile(
  "path/to/document.pdf",
  "output.json", // output path
  "Extract all content", // parsing instruction
  "json", // format
  apiKey,
  vendorModel
);

// Extract markdown from JSON
const markdown = await extractMarkdownFromJson(
  "document.json",
  "document.md"
);

// Parse to both JSON and markdown
const success = await parseDocumentToMarkdown(
  "path/to/document.pdf",
  "output.json",
  "output.md",
  "Extract all content",
  apiKey,
  vendorModel
);
```

### Command Line Usage

You can also run it from the command line:

```bash
# Using ts-node or tsx
npx tsx src/utils/document_parse/main_file_s3_to_llamaparse.ts --s3-url "https://your-bucket.s3.amazonaws.com/path/to/document.pdf"

# Or compile and run
npm run build
node dist/utils/document_parse/main_file_s3_to_llamaparse.js --s3-url "https://your-bucket.s3.amazonaws.com/path/to/document.pdf"
```

## API Reference

### Classes

#### `LlamaParseClient`

Main client for interacting with the LlamaParse API.

**Constructor:**
```typescript
new LlamaParseClient(llamaApiKey?: string, vendorModel?: string)
```

**Methods:**
- `parseDocument(filePath, parsingInstruction?, maxRetries?, retryDelay?, resultFormat?)`: Parse a document and return results

### Functions

#### `parseToDocumentLink(documentLink, options?)`

Main function to process documents from URLs or local paths.

**Parameters:**
- `documentLink: string` - URL or local path of the document
- `downloadPath?: string` - Path to save downloaded document
- `jsonOutput?: string` - Path to save JSON output
- `mdOutput?: string` - Path to save markdown output
- `parsingInstruction?: string` - Custom parsing instruction
- `format?: 'json' | 'md'` - Output format preference
- `extractOnly?: boolean` - Only extract markdown from existing JSON
- `llamaApiKey?: string` - API key for LlamaParse
- `vendorModel?: string` - Model to use for parsing
- `deleteDownloads?: boolean` - Delete downloaded files after processing

**Returns:** `Promise<[boolean, string | null]>`

#### `parseDocumentFile(filePath, outputPath?, parsingInstruction?, resultFormat?, apiKey?, vendorModel?)`

Parse a document file and save the result.

#### `extractMarkdownFromJson(jsonFilePath, outputMdPath?)`

Extract markdown content from a LlamaParse JSON result file.

#### `parseDocumentToMarkdown(filePath, jsonOutputPath?, mdOutputPath?, parsingInstruction?, apiKey?, vendorModel?)`

Process a document to both JSON and markdown formats.

## Command Line Arguments

```
--s3-url, --document-link    Document URL to download and process (required)
--download-path              Path to save the downloaded document (optional)
--instruction, -i            Custom parsing instruction for LlamaParse (optional)
--format, -f                 Result format preference (json or md, default: json)
--json-output               Path to save the JSON output (optional)
--md-output, -m             Path to save the markdown output (optional)
--extract-only              Only extract markdown from an existing JSON file (no download or parsing)
--llama-api-key             API key for LlamaParse (optional, can also use .env file)
--vendor-model              Model to use for parsing (optional, can also use .env file)
```

## TypeScript Support

This module is written in TypeScript and provides full type definitions:

```typescript
import type { ParseResult, ParseResultType } from './src/utils/document_parse/index.js';

// ParseResult interface
interface ParseResult {
  pages: Array<{
    page: number;
    md: string;
  }>;
}

// ParseResultType union
type ParseResultType = string | ParseResult;
```

## Dependencies

- `axios` - HTTP client for API requests and downloads
- `form-data` - For multipart form data uploads
- `dotenv` - Environment variable management
- `fs/promises` - File system operations
- `path` - Path utilities

## Error Handling

All functions use proper TypeScript error handling with try-catch blocks and return tuples indicating success/failure status along with results or error information.

## Migration from Python

This TypeScript version maintains full compatibility with the Python version's API while providing:
- Better type safety
- Promise-based async operations
- Modern ES modules syntax
- Integration with existing TypeScript/JavaScript projects

## License

MIT License

Copyright (c) 2023-2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. 