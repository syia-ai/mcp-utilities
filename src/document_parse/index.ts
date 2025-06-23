/**
 * Document Parse - TypeScript version
 * 
 * A TypeScript utility for parsing and extracting structured content from documents using LlamaParse.
 * Converted from Python to TypeScript for seamless integration with Node.js applications.
 */

export {
  LlamaParseClient,
  parseDocumentFile,
  extractMarkdownFromJson,
  parseDocumentToMarkdown,
  parseDocument,
  parsePdf,
  parseDocumentToMarkdownAlias,
  type ParseResult,
  type ParseResultType
} from './llamaparse.js';

export {
  isUrl,
  downloadDocument,
  deleteDownloadFolder,
  parseToDocumentLink,
  runCli
} from './main_file_s3_to_llamaparse.js';

// Version
export const version = '0.1.0'; 