# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx monorepo containing an Angular blog application with frontend and backend components:

- **blog** (apps/blog): Angular 20 SSR application with SCSS styling
- **blog-be** (apps/blog-be): Express.js backend API
- **blog-e2e**: Playwright E2E tests for the frontend
- **blog-be-e2e**: Jest E2E tests for the backend

## Development Commands

### Serve Applications
```bash
# Start frontend dev server (Angular SSR)
npx nx serve blog

# Start backend API server (Express)
npx nx serve blog-be
```

### Build Applications
```bash
# Build frontend for production
npx nx build blog

# Build backend
npx nx build blog-be

# Build all projects
npx nx run-many --target=build --all
```

### Testing
```bash
# Run unit tests for frontend
npx nx test blog

# Run unit tests for backend
npx nx test blog-be

# Run E2E tests for frontend
npx nx e2e blog-e2e

# Run E2E tests for backend
npx nx e2e blog-be-e2e

# Run all tests
npx nx run-many --target=test --all
```

### Linting
```bash
# Lint frontend
npx nx lint blog

# Lint backend
npx nx lint blog-be

# Lint all projects
npx nx run-many --target=lint --all
```

### Project Information
```bash
# View available targets for a project
npx nx show project blog
npx nx show project blog-be

# Visualize project dependencies
npx nx graph
```

## Architecture

### Frontend (Angular)
- **Framework**: Angular 20 with standalone components
- **Styling**: SCSS
- **Routing**: Angular Router
- **SSR**: Server-side rendering enabled
- **Entry Points**: 
  - Client: apps/blog/src/main.ts
  - Server: apps/blog/src/main.server.ts
  - SSR: apps/blog/src/server.ts

### Backend (Express)
- **Framework**: Express.js
- **Entry Point**: apps/blog-be/src/main.ts
- **Default Port**: 3333
- **API Endpoint**: /api

### Testing Strategy
- **Unit Tests**: Jest with jest-preset-angular for Angular components
- **E2E Tests**: Playwright for frontend, Jest for backend API
- **Configuration**: Test configurations in individual jest.config.ts files

### Nx Configuration
- **Workspace**: Configured with Nx 21.3.1
- **Plugins**: Angular, ESLint, Jest, Playwright, Webpack
- **Default Base Branch**: master
- **Cloud**: Connected to Nx Cloud (ID: 687d797cec3beb26477ada26)

## Docker Development

### Start Development Environment
```bash
# Start both frontend and backend with hot reload
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down
```

### Access Applications
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3333/api

### Docker Features
- **Hot Reload**: Changes in source code automatically trigger recompilation
- **Volume Mounting**: Source code is mounted for real-time development
- **Nx Cache Isolation**: `.nx` directory is excluded to prevent Windows cache conflicts
- **Node 22 Alpine**: Clean environment with latest Node.js
- **Proxy Configuration**: Frontend automatically proxies `/api/*` requests to backend (no CORS issues)

### Rebuild Services
```bash
# Rebuild specific service
docker-compose build frontend
docker-compose build backend

# Rebuild and restart
docker-compose up --build
```

## Code Generation

```bash
# Generate new Angular application
npx nx g @nx/angular:app my-app

# Generate new Angular library
npx nx g @nx/angular:lib my-lib

# List available generators
npx nx list
npx nx list @nx/angular
```