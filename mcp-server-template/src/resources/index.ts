import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema, Resource } from '@modelcontextprotocol/sdk/types.js';
import { getUserDetails } from '../../database.js';

const resourceList: Resource[] = [
  {
    uri: 'user://details/<user_id>',
    name: 'User Details',
    description: 'Details about the user based on the given user id',
    mimeType: 'application/json'
  }
];

export function registerResources(server: Server): void {
  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: resourceList };
  });

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const uriString = String(uri);
    
    try {
      const url = new URL(uriString);
      const resourceType = url.hostname; // e.g., 'details'
      const identifier = url.pathname.substring(1); // Remove leading '/'

      if (url.protocol === 'user:' && resourceType === 'details') {
        const userDetails = await getUserDetails(identifier);
        return {
          contents: [
            {
              uri: uriString,
              mimeType: 'application/json',
              text: JSON.stringify(userDetails, null, 2)
            }
          ]
        };
      } else {
        throw new Error(`Resource not found for uri: ${uriString}`);
      }
    } catch (error) {
      return {
        contents: [
          {
            uri: uriString,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Resource not found for uri: ${uriString}` }, null, 2)
          }
        ]
      };
    }
  });
} 