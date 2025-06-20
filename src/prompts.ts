import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetPromptRequestSchema, ListPromptsRequestSchema, Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

const promptList: Prompt[] = [
  {
    name: 'general_instructions',
    description: 'general instructions for the user to work with the Communication system',
    arguments: []
  }
];

export function registerPrompts(server: Server): void {
  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: promptList };
  });

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      if (name === 'general_instructions') {
        return getGeneralInstructions(args);
      } else {
        throw new Error(`Unknown prompt: ${name}`);
      }
    } catch (error) {
      console.error(`Error calling prompt ${name}:`, error);
      throw error;
    }
  });
}

function getGeneralInstructions(args?: Record<string, string>): GetPromptResult {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are a helpful assistant that can help user to Communicate with external world. Today's date is ${today}.`
        }
      }
    ]
  };
} 