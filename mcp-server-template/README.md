# MCP Server Template

A comprehensive template for building MCP (Model Context Protocol) servers with TypeScript.

## Features

- **TypeScript Support**: Full TypeScript implementation with strict type checking
- **Modular Architecture**: Well-organized directory structure with separation of concerns
- **Tool System**: Extensible tool system with handlers and testing utilities
- **Database Support**: Connection pooling and query building utilities
- **Middleware System**: Error handling, validation, and security middleware
- **Configuration Management**: Environment-based configuration with validation
- **Testing Framework**: Comprehensive testing setup with tool-specific testing harness
- **Docker Support**: Docker and Docker Compose configuration for easy deployment
- **CI/CD Ready**: GitHub Actions workflow for automated testing and deployment
- **Documentation**: API documentation and deployment guides

## Directory Structure

```
mcp-server-template/
├── README.md                     # Project documentation
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Environment variables template
├── .env.test                     # Test environment variables
├── .gitignore                    # Git ignore patterns
├── .dockerignore                 # Docker ignore patterns
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Docker compose for local development
├── install.js                    # Post-install setup
├── bin/
│   ├── cli.js                    # CLI entry point
│   └── test-tool.js              # CLI for testing individual tools
├── src/
│   ├── index.ts                  # Main MCP server entry point
│   ├── config/
│   │   ├── index.ts              # Configuration management
│   │   └── validation.ts         # Config validation
│   ├── database/
│   │   ├── connection-manager.ts # Database connection pooling
│   │   ├── database-service.ts   # Database service layer
│   │   └── query-builder.ts      # Safe query construction
│   ├── middleware/
│   │   ├── error-handler.ts      # Error handling middleware
│   │   ├── validation.ts         # Input validation
│   │   └── security.ts           # Security middleware
│   ├── models/                   # Data models
│   │   └── index.ts              # Model exports
│   ├── services/
│   │   ├── base-service.ts       # Base service class
│   │   ├── external-api.ts       # External API integrations
│   │   └── auth-service.ts       # Authentication service
│   ├── tools/
│   │   ├── index.ts              # Tool registry
│   │   ├── schema.ts             # Tool schemas
│   │   ├── test-runner.ts        # Tool testing utility
│   │   └── handlers/             # Individual tool handlers
│   │       ├── data-tools.ts     # Data manipulation tools
│   │       ├── search-tools.ts   # Search and query tools
│   │       └── analysis-tools.ts # Analysis tools
│   ├── tools-testing/
│   │   ├── harness.ts            # Testing harness for tools
│   │   ├── mock-context.ts       # Mock context generator
│   │   └── fixtures/             # Test fixtures for tools
│   ├── health/
│   │   └── index.ts              # Health check endpoints
│   ├── utils/
│   │   ├── logger.ts             # Logging configuration
│   │   ├── response-formatter.ts # Response formatting
│   │   ├── validators.ts         # Input validators
│   │   └── constants.ts          # Application constants
│   └── types/
│       ├── index.ts              # Type definitions
│       ├── database.ts           # Database types
│       └── api.ts                # API types
├── dist/                         # Compiled output
├── logs/                         # Log files directory
├── scripts/
│   └── test-tool.sh              # Shell script for quick tool testing
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   ├── tool-tests/               # Dedicated tests for tools
│   └── fixtures/
├── docs/                         # Documentation
│   ├── api.md                    # API documentation
│   ├── deployment.md             # Deployment guide
│   ├── tool-testing.md           # Documentation for testing tools
│   └── openapi/                  # OpenAPI/Swagger documentation
└── .github/                      # CI/CD configuration
    └── workflows/                # GitHub Actions workflows
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Testing Tools

Test individual tools using the CLI:

```bash
# Test a tool with default data
npm run test:tools example-tool

# Test with custom data
npm run test:tools example-tool --data '{"input": "test data"}'

# Use the shell script
./scripts/test-tool.sh example-tool '{"input": "test"}'
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t mcp-server-template .
docker run -p 3000:3000 mcp-server-template
```

## Documentation

- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Tool Testing Guide](docs/tool-testing.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details