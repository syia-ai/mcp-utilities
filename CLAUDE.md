# MCP Server Development Instructions

## Project Structure

This is an MCP (Model Context Protocol) server with a category-based tool organization:

- `src/tools/communication/` - Email and WhatsApp tools
- `src/tools/vessel-management/` - Vessel info and personnel tools  
- `src/tools/document-processing/` - Document parsing and search tools
- `src/database/` - MongoDB connection and query utilities
- `src/middleware/` - Error handling and validation
- `src/services/` - External API integrations and caching
- `src/utils/` - Configuration, logging, and utilities

## Development Guidelines

1. **Tool Organization**: Place new tools in appropriate category directories
2. **Error Handling**: Use the centralized error handler in middleware
3. **Database**: Use the connection manager for MongoDB operations
4. **Configuration**: Add new config options to `src/utils/config.ts`
5. **Testing**: Add tests to `tests/unit/` or `tests/integration/`

## Key Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Check code style

## Environment Variables

Copy `.env.example` to `.env` and configure:
- Database connections
- API keys for external services
- Logging configuration