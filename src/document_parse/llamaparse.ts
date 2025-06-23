import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { config } from '../config.js';
// Using built-in path module for mime type detection

// Get API keys from centralized config
const LLAMA_API_KEY = config.llamaIndex.apiKey;
const VENDOR_MODEL = config.llamaIndex.vendorModel;

export interface ParseResult {
  pages: Array<{
    page: number;
    md: string;
  }>;
}

export type ParseResultType = string | ParseResult;

export class LlamaParseClient {
  private llamaApiKey: string;
  private vendorModel: string;

  constructor(llamaApiKey?: string, vendorModel?: string) {
    this.llamaApiKey = llamaApiKey || LLAMA_API_KEY || '';
    this.vendorModel = vendorModel || VENDOR_MODEL || '';
    
    if (!this.llamaApiKey) {
      throw new Error('LLAMAINDEX_API_KEY is required. Set it as an environment variable or pass it to the constructor.');
    }
  }

  async parseDocument(
    filePath: string, 
    parsingInstruction?: string,
    maxRetries: number = 20,
    retryDelay: number = 5,
    resultFormat: 'json' | 'md' = 'json'
  ): Promise<[boolean, ParseResultType | null]> {
    try {
      await fs.access(filePath);
    } catch {
      console.log(`Error: File not found at ${filePath}`);
      return [false, null];
    }

    const fileName = path.basename(filePath);
    console.log(`Submitting '${fileName}' to LlamaParse...`);

    // Submit parsing job
    const jobId = await this.submitParsingJob(filePath, parsingInstruction);
    if (!jobId) {
      console.log(`Failed to submit parsing job for ${fileName}`);
      return [false, null];
    }

    console.log(`Job submitted successfully. Job ID: ${jobId}`);
    console.log('Waiting for parsing results...');

    // Initial wait before first retrieval attempt
    await this.sleep(10000); // Wait 10 seconds initially

    // Retrieve result
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`Attempt ${attempt + 1}/${maxRetries} to retrieve ${resultFormat} results...`);

      let result: ParseResultType | null;
      if (resultFormat === 'json') {
        result = await this.getJsonResult(jobId);
      } else {
        result = await this.getMarkdownResult(jobId);
      }

      if (result !== null) {
        console.log(`Successfully retrieved ${resultFormat} for ${fileName}`);
        return [true, result];
      }

      if (attempt < maxRetries - 1) {
        console.log(`Waiting ${retryDelay} seconds before next attempt...`);
        await this.sleep(retryDelay * 1000);
      }
    }

    console.log(`Failed to retrieve ${resultFormat} results after ${maxRetries} attempts`);

    // As a fallback, try the other format
    const fallbackFormat = resultFormat === 'json' ? 'md' : 'json';
    console.log(`Trying fallback format: ${fallbackFormat}`);

    let result: ParseResultType | null;
    if (fallbackFormat === 'json') {
      result = await this.getJsonResult(jobId);
    } else {
      result = await this.getMarkdownResult(jobId);
    }

    if (result !== null) {
      console.log(`Successfully retrieved ${fallbackFormat} for ${fileName} (fallback)`);
      return [true, result];
    }

    return [false, null];
  }

  private async submitParsingJob(filePath: string, parsingInstruction?: string): Promise<string | null> {
    const uploadUrl = 'https://api.cloud.llamaindex.ai/api/parsing/upload';
    const headers = {
      'Authorization': `Bearer ${this.llamaApiKey}`,
      'accept': 'application/json'
    };

    // Default parsing instruction if none provided
    if (!parsingInstruction) {
      parsingInstruction = `
Extract the text content from this document maintaining headers, paragraphs, and section structure. 

If it's a table, keep the layout intact. If it's an image, diagram, or picture, provide a detailed description.

Ensure everything about the document is included in the generated response:
* All text paragraphs, lists, etc.
* Tables (formatted as HTML) and Figure Descriptions appearing between two section headers are part of the *first* section's content.

Extract and describe content elements:
* Extract all textual content. Maintain paragraph structure.
* Represent tables using standard HTML tags (<table>, <thead>, <tbody>, <tr>, <th>, <td>). Include table content accurately.
* For figures, images, or diagrams: Describe based on visual analysis and context from surrounding text using the format "Figure Description: [Your detailed description here]".
  * Identify Type: Start by stating the type of visual (e.g., "Flowchart:", "Bar graph:", "Photograph:", "Technical drawing:", "Illustration:").
  * Describe Content Thoroughly: Detail the main subject, all visible text including labels, annotations, and data points, mention exact data, trends, or key comparisons shown, symbols and their meanings within the context, relationships depicted (e.g., connections in flowcharts, hierarchies in diagrams), significant colors if they convey meaning, and the overall composition or layout. For photos, describe the scene, objects, people (if depicted, describe neutrally and factually based on visual cues), and setting realistically and completely.
  * Be Specific & Accurate: Ensure all details present in the visual are described.
  * Transcribe text within the image exactly as it appears. Use quantifiable descriptions where appropriate (e.g., "shows a 3-stage process", "contains 5 columns labeled...").
* Crucially, do NOT treat figure captions or titles as section headers. They are part of the figure's descriptive context or textual content.
`;
    }

    const fileName = path.basename(filePath);

    try {
      const form = new FormData();
      form.append('parsing_instruction', parsingInstruction);
      form.append('invalidate_cache', 'true');
      form.append('use_vendor_multimodal_model', 'false');
      form.append('vendor_multimodal_model_name', this.vendorModel);
      form.append('output_tables_as_html', 'true');
      form.append('parse_mode', 'parse_page_with_lvm');

      // Determine file MIME type based on extension
      const ext = path.extname(filePath).toLowerCase();
      let mimeType: string;
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === '.png') {
        mimeType = 'image/png';
      } else if (ext === '.gif') {
        mimeType = 'image/gif';
      } else if (ext === '.bmp') {
        mimeType = 'image/bmp';
      } else if (ext === '.tiff' || ext === '.tif') {
        mimeType = 'image/tiff';
      } else {
        mimeType = 'application/octet-stream';
      }

      const fileBuffer = await fs.readFile(filePath);
      form.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType
      });

      console.log(`Sending request to LlamaParse API for ${mimeType} file...`);
      const response = await axios.post(uploadUrl, form, {
        headers: {
          ...headers,
          ...form.getHeaders()
        }
      });
      console.log(`API response status code: ${response.status}`);

      if (response.status === 200) {
        const responseData = response.data;
        const jobId = responseData.id;
        if (jobId) {
          return jobId;
        } else {
          console.log(`API response OK, but 'id' key not found:`, responseData);
        }
      } else {
        console.log(`API submission failed: ${response.status} - ${response.data}`);
      }
    } catch (error) {
      console.log(`Error submitting parsing job:`, error);
    }

    return null;
  }

  private async getMarkdownResult(jobId: string): Promise<string | null> {
    const resultUrl = `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/md`;
    const headers = {
      'accept': 'application/json',
      'Authorization': `Bearer ${this.llamaApiKey}`
    };

    try {
      console.log(`Requesting markdown from: ${resultUrl}`);
      const response = await axios.get(resultUrl, { headers });
      console.log(`Markdown response status: ${response.status}`);

      if (response.status === 200) {
        return response.data;
      } else if (response.status === 404) {
        console.log(`Markdown result not found or job ${jobId} not ready yet (404).`);
      } else if (response.status === 401) {
        console.log(`Unauthorized (401) when retrieving markdown for job ${jobId}.`);
        return null;
      } else {
        console.log(`Failed to retrieve markdown: ${response.status}`);
        console.log(`Response text: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`Error retrieving markdown result:`, error);
    }

    return null;
  }

  private async getJsonResult(jobId: string): Promise<ParseResult | null> {
    const resultUrl = `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/json`;
    const headers = {
      'accept': 'application/json',
      'Authorization': `Bearer ${this.llamaApiKey}`
    };

    try {
      console.log(`Requesting JSON from: ${resultUrl}`);
      const response = await axios.get(resultUrl, { headers });
      console.log(`JSON response status: ${response.status}`);

      if (response.status === 200) {
        try {
          return response.data;
        } catch (error) {
          console.log('Received response is not valid JSON');
          console.log(`Raw response: ${JSON.stringify(response.data).substring(0, 200)}...`);
          return null;
        }
      } else if (response.status === 404) {
        console.log(`JSON result not found or job ${jobId} not ready yet (404).`);
      } else if (response.status === 401) {
        console.log(`Unauthorized (401) when retrieving JSON for job ${jobId}.`);
        return null;
      } else {
        console.log(`Failed to retrieve JSON: ${response.status}`);
        console.log(`Response text: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`Error retrieving JSON result:`, error);
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export async function parseDocumentFile(
  filePath: string,
  outputPath?: string,
  parsingInstruction?: string,
  resultFormat: 'json' | 'md' = 'json',
  apiKey?: string,
  vendorModel?: string
): Promise<[boolean, string | null, ParseResultType | null]> {
  try {
    // Get client
    const client = new LlamaParseClient(apiKey, vendorModel);

    // Parse document
    const [success, result] = await client.parseDocument(filePath, parsingInstruction, 20, 5, resultFormat);

    if (success && result) {
      // Determine output path if not specified
      if (!outputPath) {
        const baseName = path.parse(filePath).name;
        const ext = resultFormat === 'json' || typeof result === 'object' ? '.json' : '.md';
        outputPath = path.join(path.dirname(filePath), `${baseName}${ext}`);
      }

      // Save result to file
      try {
        const content = typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
        await fs.writeFile(outputPath, content, 'utf-8');
        console.log(`Result saved to: ${outputPath}`);
        return [true, outputPath, result];
      } catch (error) {
        console.log(`Error saving result to file:`, error);
      }
    }

    return [false, null, null];
  } catch (error) {
    console.log(`Error in parseDocumentFile:`, error);
    return [false, null, null];
  }
}

export async function extractMarkdownFromJson(
  jsonFilePath: string,
  outputMdPath?: string
): Promise<string | null> {
  try {
    // Read and parse the JSON file
    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
    const data: ParseResult = JSON.parse(jsonContent);

    // Extract markdown content from each page
    if (!data.pages) {
      console.log(`Error: JSON file ${jsonFilePath} does not contain 'pages' key`);
      return null;
    }

    // Combine markdown from all pages
    let markdownContent = '';
    for (let i = 0; i < data.pages.length; i++) {
      const page = data.pages[i];
      if (page.md) {
        if (i > 0) {
          markdownContent += '\n\n'; // Add separator between pages
        }

        // Add centered page number before content
        const pageNumber = page.page || (i + 1); // Use page number from JSON or fallback to index+1
        const pageSeparator = `\n\n*************** Page ${pageNumber} ***************\n\n`;
        markdownContent += pageSeparator + page.md;
      } else {
        console.log(`Warning: Page ${i + 1} does not contain markdown content`);
      }
    }

    if (!markdownContent) {
      console.log(`Error: No markdown content found in ${jsonFilePath}`);
      return null;
    }

    // Save to file if requested
    if (outputMdPath) {
      try {
        await fs.writeFile(outputMdPath, markdownContent, 'utf-8');
        console.log(`Markdown content extracted and saved to: ${outputMdPath}`);
      } catch (error) {
        console.log(`Error saving markdown to file ${outputMdPath}:`, error);
      }
    }

    return markdownContent;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log(`Error parsing JSON file ${jsonFilePath}:`, error);
    } else if ((error as any).code === 'ENOENT') {
      console.log(`Error: File ${jsonFilePath} not found`);
    } else {
      console.log(`Unexpected error processing ${jsonFilePath}:`, error);
    }
    return null;
  }
}

export async function parseDocumentToMarkdown(
  filePath: string,
  jsonOutputPath?: string,
  mdOutputPath?: string,
  parsingInstruction?: string,
  apiKey?: string,
  vendorModel?: string
): Promise<boolean> {
  console.log(`Processing document to extract both JSON and markdown: ${filePath}`);

  // Step 1: Parse document to JSON
  const [success, jsonPath, jsonResult] = await parseDocumentFile(
    filePath,
    jsonOutputPath,
    parsingInstruction,
    'json',
    apiKey,
    vendorModel
  );

  if (!success || !jsonPath || !jsonResult) {
    console.log(`Failed to parse document to JSON: ${filePath}`);
    return false;
  }

  console.log(`Successfully parsed document to JSON: ${jsonPath}`);

  // Step 2: Extract markdown from JSON result
  if (typeof jsonResult === 'object' && 'pages' in jsonResult) {
    // If we have the JSON result in memory, extract markdown from it directly
    let markdownContent = '';
    for (let i = 0; i < jsonResult.pages.length; i++) {
      const page = jsonResult.pages[i];
      if (page.md) {
        if (i > 0) {
          markdownContent += '\n\n'; // Add separator between pages
        }

        // Add centered page number before content
        const pageNumber = page.page || (i + 1);
        const pageSeparator = `\n\n*************** Page ${pageNumber} ***************\n\n`;
        markdownContent += pageSeparator + page.md;
      }
    }

    // Determine markdown output path if not specified
    if (!mdOutputPath) {
      const baseName = path.parse(filePath).name;
      mdOutputPath = path.join(path.dirname(filePath), `${baseName}.md`);
    }

    // Save markdown to file
    try {
      await fs.writeFile(mdOutputPath, markdownContent, 'utf-8');
      console.log(`Markdown content extracted and saved to: ${mdOutputPath}`);
      return true;
    } catch (error) {
      console.log(`Error saving markdown to file ${mdOutputPath}:`, error);
      return false;
    }
  }

  // Fall back to extracting from the saved JSON file if needed
  const markdown = await extractMarkdownFromJson(jsonPath, mdOutputPath);
  return markdown !== null;
}

// Alias for backward compatibility
export const parseDocument = parseDocumentFile;
export const parsePdf = parseDocumentFile;
export const parseDocumentToMarkdownAlias = parseDocumentToMarkdown; 