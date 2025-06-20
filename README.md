# Communication MCP Server

A Node.js TypeScript implementation of an MCP (Model Context Protocol) server that provides comprehensive email and WhatsApp communication capabilities. This is a complete conversion from the original Python implementation, maintaining 100% feature parity while adding TypeScript enhancements.

## ✨ Features

- **📧 Email Communication**: Send professional emails via Gmail API with OAuth2 authentication
- **📱 WhatsApp Communication**: Send WhatsApp messages via WhatsApp Business API
- **👤 User Management**: Retrieve user information from MongoDB with ObjectId support
- **🔗 MCP Compatible**: Full compatibility with Model Context Protocol
- **🔒 Secure Authentication**: OAuth2 flows with automatic token refresh
- **⚙️ Flexible Configuration**: Environment variables and CLI argument support

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build
```

### Configuration

Set up your environment variables:

```bash
# MongoDB Configuration
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB_NAME="mcp_communication"

# Gmail OAuth Configuration
export OAUTH_CLIENT_ID="your_gmail_oauth_client_id"
export OAUTH_CLIENT_SECRET="your_gmail_oauth_client_secret"
export GMAIL_SCOPES="https://www.googleapis.com/auth/gmail.send"

# WhatsApp Business API Configuration
export WHATSAPP_TOKEN="your_whatsapp_api_token"
export WHATSAPP_URL="https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages"
```

### Gmail OAuth Setup

Run the interactive OAuth setup wizard:

```bash
npm run oauth-setup
```

### Usage

```bash
# Start the server
npx mcp-utilities

# With custom configuration
npx mcp-utilities --mongodb-uri mongodb://localhost:27017 --debug

# Development mode
npm run dev
```

## 🛠️ Tools

### mail_communication
Send formal emails with HTML content support, CC, and BCC capabilities.

**Parameters:**
- `subject` (string): Email subject line (max 100 characters)
- `content` (string): HTML email content with formatting support
- `recipient` (array): Main recipient email addresses
- `cc` (array, optional): Carbon copy recipients
- `bcc` (array, optional): Blind carbon copy recipients

**Example:**
```json
{
  "subject": "Meeting Invitation",
  "content": "<h1>Team Meeting</h1><p>Join us tomorrow at 10 AM.</p><br>Best regards,<br>Syia",
  "recipient": ["team@company.com"],
  "cc": ["manager@company.com"]
}
```

### whatsapp_communication
Send quick WhatsApp messages to individual recipients.

**Parameters:**
- `content` (string): Plain text message content
- `recipient` (string): WhatsApp phone number (E.164 or local format)

**Example:**
```json
{
  "content": "Hello! Your appointment is confirmed for tomorrow at 2 PM.",
  "recipient": "+1234567890"
}
```

## 📦 Resources

### user://details/<user_id>
Retrieve detailed user information from MongoDB by user ID.

**Returns:** User object with firstName, lastName, email, and phone fields.

## 💬 Prompts

### general_instructions
Provides contextual instructions for working with the Communication system, including current date information.

## ⚙️ Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | MongoDB database name | `mcp_communication` |
| `OAUTH_CLIENT_ID` | Gmail OAuth client ID | - |
| `OAUTH_CLIENT_SECRET` | Gmail OAuth client secret | - |
| `GMAIL_SCOPES` | Gmail OAuth scopes | `https://www.googleapis.com/auth/gmail.send` |
| `WHATSAPP_TOKEN` | WhatsApp Business API token | - |
| `WHATSAPP_URL` | WhatsApp API endpoint | - |

### CLI Arguments

```bash
Options:
  --mongodb-uri URI         Set MongoDB URI
  --mongodb-db-name NAME    Set MongoDB database name
  --oauth-client-id ID      Set OAuth client ID
  --oauth-client-secret SECRET Set OAuth client secret
  --whatsapp-token TOKEN    Set WhatsApp API token
  --whatsapp-url URL        Set WhatsApp API URL
  --debug                   Enable debug logging
  --help, -h               Show help message
```

## 🔧 Development

### Project Structure

```
mcp-utilities/
├── src/
│   ├── config.ts           # Configuration management
│   ├── database.ts         # MongoDB client and operations
│   ├── index.ts           # Main server entry point
│   ├── oauth-setup.ts     # Interactive OAuth setup
│   ├── prompts.ts         # MCP prompt handlers
│   ├── resources.ts       # MCP resource handlers
│   ├── tools.ts           # Tool implementations
│   └── tool-schemas.ts    # Tool schema definitions
├── bin/cli.js             # Executable CLI script
├── scripts/install.js     # Installation helper
└── dist/                  # Compiled JavaScript output
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Clean build files
npm run clean

# Set up Gmail OAuth
npm run oauth-setup
```

## 🔐 Authentication Setup

### Gmail OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API
4. Create OAuth 2.0 credentials (Desktop application)
5. Set authorized redirect URIs: `http://localhost:3000/oauth2callback`
6. Export your credentials:
   ```bash
   export OAUTH_CLIENT_ID="your_client_id"
   export OAUTH_CLIENT_SECRET="your_client_secret"
   ```
7. Run the setup wizard: `npm run oauth-setup`

### WhatsApp Business API

1. Set up WhatsApp Business API account
2. Create a message template named "whatsapp_template"
3. Get your phone number ID and access token
4. Configure environment variables:
   ```bash
   export WHATSAPP_TOKEN="your_access_token"
   export WHATSAPP_URL="https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages"
   ```

### MongoDB Setup

Ensure MongoDB is running with a `users` collection:

```javascript
// Example user document structure
{
  "_id": ObjectId("..."),
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890"
}
```

## 📋 System Requirements

- **Node.js**: ≥18.0.0
- **MongoDB**: ≥4.0
- **TypeScript**: ≥5.0

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🏢 About

Developed by [Syia AI](https://syia.ai) - Advancing communication through intelligent automation.

## 🔄 Migration from Python

This TypeScript implementation provides 100% feature parity with the original Python version while offering:

- ✅ Enhanced type safety with TypeScript
- ✅ Automatic OAuth token refresh
- ✅ Interactive setup wizards
- ✅ Modern ESM module support
- ✅ Comprehensive CLI help
- ✅ Better error handling
- ✅ npm package ecosystem benefits

For migration assistance or questions, please open an issue. 