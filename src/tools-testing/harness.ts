import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Tool Testing Harness
 * 
 * This utility allows testing individual tool handlers with environment variables
 * loaded from .env or .env.test files
 */

interface TestHarnessOptions {
  envFile?: string;
  mockContext?: any;
}

export class ToolTestHarness {
  private envFile: string;
  private mockContext: any;
  
  constructor(options: TestHarnessOptions = {}) {
    this.envFile = options.envFile || '.env.test';
    this.mockContext = options.mockContext || {};
  }
  
  /**
   * Load environment variables from file
   */
  async loadEnv(): Promise<void> {
    const envPath = path.resolve(process.cwd(), this.envFile);
    try {
      await fs.access(envPath);
      dotenv.config({ path: envPath });
      console.log(`Loaded environment from ${this.envFile}`);
    } catch (error) {
      console.warn(`Warning: ${this.envFile} not found, using process.env`);
    }
  }
  
  /**
   * Run a tool handler function with arguments
   * @param handlerFn The tool handler function to test
   * @param args Arguments to pass to the handler
   */
  async runTool<T, R>(handlerFn: (args: T) => Promise<R>, args: T): Promise<R> {
    await this.loadEnv();
    
    // Create a context with environment variables and mock data
    const context = {
      env: process.env,
      ...this.mockContext
    };
    
    // Bind the function to the context
    const boundHandler = handlerFn.bind(context);
    
    // Run the handler with args
    return boundHandler(args);
  }
  
  /**
   * Set mock context data for testing
   */
  setMockContext(mockData: any): void {
    this.mockContext = {
      ...this.mockContext,
      ...mockData
    };
  }
}

// Export a convenience function to quickly test a tool
export async function testTool<T, R>(
  handlerFn: (args: T) => Promise<R>,
  args: T,
  options: TestHarnessOptions = {}
): Promise<R> {
  const harness = new ToolTestHarness(options);
  return harness.runTool(handlerFn, args);
} 