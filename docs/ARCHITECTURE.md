# Architecture Overview

## Directory Structure

```
mcp-server/
├── 📁 src/
│   ├── 📁 database/
│   │   ├── connection-manager.ts      # MongoDB connection pooling
│   │   ├── database-service.ts        # Database abstraction layer
│   │   ├── query-builder.ts          # Safe query construction
│   │   └── query-sanitizer.ts        # Input sanitization for queries
│   ├── 📁 middleware/
│   │   ├── error-handler.ts          # Centralized error handling
│   │   ├── validation-middleware.ts   # Input validation & type checking
│   │   └── sanitization-middleware.ts # Input sanitization & security
│   ├── 📁 services/
│   │   ├── base-service.ts           # Common service interface
│   │   ├── external-api-service.ts   # External API integrations
│   │   └── cache-service.ts          # Caching layer (Redis/Memory)
│   ├── 📁 tools/
│   │   ├── 📁 communication/         # Email, WhatsApp tools
│   │   ├── 📁 vessel-management/     # Vessel info, personnel tools
│   │   ├── 📁 document-processing/   # Document parsing, search tools
│   │   ├── index.ts                  # Main tool handler orchestrator
│   │   └── schema.ts                 # Tool schemas & validation
│   ├── 📁 utils/
│   │   ├── config.ts                 # Configuration management
│   │   ├── logger.ts                 # Logging utilities
│   │   ├── validator.ts              # Common validation functions
│   │   └── response-formatter.ts     # Response formatting utilities
│   └── index.ts                      # Main server entry point
├── 📁 tests/
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── test-tools.cjs               # MCP testing utilities
├── 📁 docs/
│   ├── API.md                       # API documentation
│   ├── DEPLOYMENT.md                # Deployment guide
│   └── ARCHITECTURE.md              # Architecture overview
├── 📁 logs/                         # Log files directory
├── package.json
├── tsconfig.json
├── .env.example                     # Environment variables template
├── CLAUDE.md                        # Claude Code instructions
└── README.md
```

## Key Principles

1. **Category-based Tool Organization**: Tools are organized by functionality rather than generic handlers
2. **Focused Core Services**: Only essential services are included
3. **Clean Separation of Concerns**: Database, middleware, services, and tools are clearly separated
4. **Minimal Configuration**: Simplified config management
5. **Essential Documentation**: Only necessary documentation files