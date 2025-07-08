# Deployment Guide

## Prerequisites

- Node.js 18 or higher
- npm package manager
- MongoDB (if using database features)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Docker Deployment

```bash
docker build -t mcp-server .
docker run -p 3000:3000 mcp-server
```