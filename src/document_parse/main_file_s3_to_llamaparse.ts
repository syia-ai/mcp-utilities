import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import https from 'https';
import { fileURLToPath } from 'url';
import { parseDocumentFile, parseDocumentToMarkdown, extractMarkdownFromJson } from './llamaparse.js';
import { config } from '../config.js';

// Get the current directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the download directory as a constant - create it in the document_parse folder
const DEFAULT_DOWNLOAD_DIR = path.join(__dirname, 'downloaded_documents');

// Get API keys from centralized config
const LLAMA_API_KEY = config.llamaIndex.apiKey;

export function isUrl(urlPath: string): boolean {
  /**
   * Check if the given path is a URL
   * 
   * Args:
   *   urlPath: The path to check
   *   
   * Returns:
   *   boolean: True if the path is a URL, False otherwise
   */
  try {
    const url = new URL(urlPath);
    return !!(url.protocol && url.hostname);
  } catch {
    return false;
  }
}


export async function downloadDocument(url: string, outputPath: string): Promise<boolean> {
  /**
   * Download a document from a URL and save it to the specified path.
   * First tries a simple direct download, then falls back to browser simulation if needed.
   * 
   * Args:
   *   url: URL of the document to download
   *   outputPath: Path to save the downloaded document
   * 
   * Returns:
   *   True if successful, False otherwise
   */
  
  // STEP 1: Try the simple direct approach first
  try {
    console.log('Step 1: Trying simple direct download...');
    // Send GET request to the URL with SSL verification disabled
    const response = await axios.get(url, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: 'arraybuffer'
    });
    
    // Check if the request was successful
    if (response.status === 200 && response.data && response.data.byteLength > 1000) {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath) || '.', { recursive: true });
      
      // Write the content to a file
      await fs.writeFile(outputPath, Buffer.from(response.data));
      
      console.log(`Document downloaded successfully to ${outputPath}`);
      return true;
    }
  } catch (error) {
    console.log(`Simple download failed:`, error);
  }
  
  // STEP 2: If simple approach failed, try browser simulation
  console.log('Step 2: Trying browser simulation approach...');
  
  try {
    // Fix URL by properly handling backslashes and ensuring proper path structure
    let fixedUrl = url.replace(/\\/g, '/');
    
    // Make sure there's a slash between the directory and filename
    if (fixedUrl.includes('UploadedFiles') && !fixedUrl.includes('/UploadedFiles/')) {
      fixedUrl = fixedUrl.replace('/UploadedFiles', '/UploadedFiles/');
    }
    
    console.log(`Attempting to download from: ${fixedUrl}`);
    
    // Browser-like headers to mimic a real browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Referer': fixedUrl.replace(/\/[^/]*$/, '/'), // Set referer to the base URL path
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };
    
    // Create axios instance with cookies
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      withCredentials: true
    });
    
    // First visit the base website to get cookies
    const baseUrl = fixedUrl.match(/^(https?:\/\/[^/]+)/)?.[1];
    if (baseUrl) {
      console.log(`Visiting base URL to establish session: ${baseUrl}`);
      await axiosInstance.get(baseUrl, { headers });
    }
    
    // Now try to download the file with the session cookies
    console.log('Downloading file with established session...');
    const response = await axiosInstance.get(fixedUrl, {
      headers,
      responseType: 'arraybuffer',
      maxRedirects: 5
    });
    
    // Check if the request was successful
    if (response.status === 200 && response.data && response.data.byteLength > 1000) {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath) || '.', { recursive: true });
      
      // Write the content to a file
      await fs.writeFile(outputPath, Buffer.from(response.data));
      
      console.log(`Document downloaded successfully to ${outputPath}`);
      return true;
    } else {
      console.log(`Failed to download document. Status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`Browser simulation failed:`, error);
    return false;
  }
}

export async function deleteDownloadFolder(folderPath: string): Promise<void> {
  /**
   * Delete the download folder and all its contents
   * 
   * Args:
   *   folderPath: Path to the folder to delete
   */
  try {
    const stats = await fs.stat(folderPath);
    if (stats.isDirectory()) {
      await fs.rm(folderPath, { recursive: true, force: true });
      console.log(`Successfully deleted folder: ${folderPath}`);
    } else {
      console.log(`Path is not a directory: ${folderPath}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`Folder does not exist: ${folderPath}`);
    } else {
      console.log(`Error deleting folder ${folderPath}:`, error);
    }
  }
}

export async function parseToDocumentLink(
  documentLink: string,
  downloadPath?: string,
  jsonOutput?: string,
  mdOutput?: string,
  parsingInstruction?: string,
  format: 'json' | 'md' = 'json',
  extractOnly: boolean = false,
  llamaApiKey?: string,
  vendorModel?: string,
  deleteDownloads: boolean = true
): Promise<[boolean, string | null]> {
  /**
   * Process a document (from URL or local path) with LlamaParse
   * 
   * Args:
   *   documentLink: URL or local path of the document to process
   *   downloadPath: Path to save the downloaded document (default: derived from URL)
   *   jsonOutput: Path to save the JSON output (default: derived from download_path)
   *   mdOutput: Path to save the markdown output (default: derived from download_path)
   *   parsingInstruction: Custom parsing instruction for LlamaParse
   *   format: Output format ('json' or 'md')
   *   extractOnly: If True, only extract markdown from an existing JSON file
   *   llamaApiKey: API key for LlamaParse
   *   vendorModel: Model to use for parsing (e.g., 'anthropic-sonnet-3.7')
   *   deleteDownloads: If True, delete downloaded documents after processing (default: True)
   *   
   * Returns:
   *   If successful: Tuple containing [true, markdown_content]
   *   If failed: Tuple containing [false, null]
   */
  
  // Create the download directory if it doesn't exist
  try {
    await fs.mkdir(DEFAULT_DOWNLOAD_DIR, { recursive: true });
    console.log(`Created download directory: ${DEFAULT_DOWNLOAD_DIR}`);
  } catch (error: any) {
    console.error(`Failed to create download directory ${DEFAULT_DOWNLOAD_DIR}:`, error);
    return [false, null];
  }
  
  // Ensure we have the API key
  const apiKey = llamaApiKey || LLAMA_API_KEY;
  if (!apiKey) {
    console.log('LLAMAINDEX_API_KEY is required. Set it as an environment variable or pass it to the function.');
    return [false, null];
  }
  
  // Check if document_link is a URL or local file path
  const isDocumentUrl = isUrl(documentLink);
  let inputPath: string;
  
  // If it's a local file, set the input path directly
  if (!isDocumentUrl) {
    try {
      await fs.access(documentLink);
      inputPath = documentLink;
      console.log(`Using local file: ${inputPath}`);
    } catch {
      console.log(`Local file not found: ${documentLink}`);
      return [false, null];
    }
  } else {
    // Determine download path if not specified (for URLs)
    if (!downloadPath) {
      // Extract filename from URL and use it as download path
      const urlParts = documentLink.split('?')[0].split('/');
      const filename = urlParts[urlParts.length - 1] || 'downloaded_document.pdf';
      downloadPath = path.join(DEFAULT_DOWNLOAD_DIR, filename);
    } else if (!path.dirname(downloadPath) || path.dirname(downloadPath) === '.') {
      // If only a filename was provided without a directory, put it in the default download directory
      downloadPath = path.join(DEFAULT_DOWNLOAD_DIR, downloadPath);
    }
    
    // Download the document if it's a URL and not in extract-only mode
    if (isDocumentUrl && !extractOnly) {
      const downloadSuccess = await downloadDocument(documentLink, downloadPath);
      if (!downloadSuccess) {
        return [false, null];
      }
    }
    
    inputPath = downloadPath;
  }
  
  // If extract-only mode is requested, extract markdown from an existing JSON file
  if (extractOnly && inputPath.endsWith('.json')) {
    // Determine default markdown output path if not provided
    if (!mdOutput) {
      const baseName = path.parse(inputPath).name;
      mdOutput = path.join(DEFAULT_DOWNLOAD_DIR, `${baseName}.md`);
    }
    
    const markdown = await extractMarkdownFromJson(inputPath, mdOutput);
    
    // Read and return the markdown content
    if (markdown !== null) {
      try {
        const mdContent = await fs.readFile(mdOutput, 'utf-8');
        
        // Delete DEFAULT_DOWNLOAD_DIR if delete_downloads is True
        if (deleteDownloads) {
          await deleteDownloadFolder(DEFAULT_DOWNLOAD_DIR);
        }
        
        return [true, mdContent];
      } catch (error) {
        console.log(`Error reading markdown file:`, error);
        return [false, null];
      }
    }
    return [false, null];
  }
  
  // Set input path for LlamaParse
  console.log('Sending document directly to LlamaParse without format checks or conversion...');
  
  // Determine default output paths if not provided
  if (!jsonOutput) {
    const baseName = path.parse(inputPath).name;
    jsonOutput = path.join(DEFAULT_DOWNLOAD_DIR, `${baseName}.json`);
  }
  
  if (!mdOutput) {
    const baseName = path.parse(inputPath).name;
    mdOutput = path.join(DEFAULT_DOWNLOAD_DIR, `${baseName}.md`);
  }
  
  // Process to both formats using imported function
  const success = await parseDocumentToMarkdown(
    inputPath,
    jsonOutput,
    mdOutput,
    parsingInstruction,
    apiKey,
    vendorModel
  );
  
  if (success) {
    try {
      // Read and return the markdown content
      const mdContent = await fs.readFile(mdOutput, 'utf-8');
      
      // Delete DEFAULT_DOWNLOAD_DIR if delete_downloads is True
      if (deleteDownloads) {
        await deleteDownloadFolder(DEFAULT_DOWNLOAD_DIR);
      }
      
      return [true, mdContent];
    } catch (error) {
      console.log(`Error reading markdown file:`, error);
      return [false, null];
    }
  }
  
  return [false, null];
}

// CLI functionality - can be called directly if needed
export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Simple argument parsing
  const argsMap: Record<string, string> = {};
  const flags: Set<string> = new Set();
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        argsMap[key] = args[i + 1];
        i++; // Skip next argument since it's the value
      } else {
        flags.add(key);
      }
    }
  }
  
  if (!argsMap['s3-url'] && !argsMap['document-link']) {
    console.log(`
Usage: node main_file_s3_to_llamaparse.js --s3-url <URL> [options]

Options:
  --s3-url, --document-link    Document URL to download and process (required)
  --download-path              Path to save the downloaded document
  --instruction, -i            Custom parsing instruction for LlamaParse
  --format, -f                 Result format preference (json or md, default: json)
  --json-output               Path to save the JSON output
  --md-output, -m             Path to save the markdown output
  --extract-only              Only extract markdown from an existing JSON file
  --llama-api-key             API key for LlamaParse
  --vendor-model              Model to use for parsing
`);
    process.exit(1);
  }
  
  const documentLink = argsMap['s3-url'] || argsMap['document-link'];
  
  // Process the document
  const [success, mdContent] = await parseToDocumentLink(
    documentLink,
    argsMap['download-path'],
    argsMap['json-output'],
    argsMap['md-output'] || argsMap['m'],
    argsMap['instruction'] || argsMap['i'],
    (argsMap['format'] || argsMap['f'] || 'json') as 'json' | 'md',
    flags.has('extract-only'),
    argsMap['llama-api-key'],
    argsMap['vendor-model']
  );
  
  if (success) {
    console.log('Document processing completed successfully.');
    // Always print markdown content without requiring a flag
    if (mdContent) {
      console.log('\nMarkdown Content:');
      console.log(mdContent);
    }
    process.exit(0);
  } else {
    console.log('Document processing failed.');
    process.exit(1);
  }
}

// If this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
} 