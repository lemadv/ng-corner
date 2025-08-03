---
description: This rule provides comprehensive best practices and coding standards for Angular development, focusing on modern TypeScript, standalone components, signals, and performance optimizations.
globs: ["**/*.{ts,html,scss,css}"]
---

# Angular Best Practices

This project adheres to modern Angular best practices, emphasizing maintainability, performance, accessibility, and scalability.

## TypeScript Best Practices

* **Strict Type Checking:** Always enable and adhere to strict type checking. This helps catch errors early and improves code quality.
* **Prefer Type Inference:** Allow TypeScript to infer types when they are obvious from the context. This reduces verbosity while maintaining type safety.
    * **Bad:**
        ```typescript
        let name: string = 'Angular';
        ```
    * **Good:**
        ```typescript
        let name = 'Angular';
        ```
* **Avoid `any`:** Do not use the `any` type unless absolutely necessary as it bypasses type checking. Prefer `unknown` when a type is uncertain and you need to handle it safely.

## Angular Best Practices

* **Standalone Components:** Always use standalone components, directives, and pipes. Avoid using `NgModules` for new features or refactoring existing ones.
* **Implicit Standalone:** When creating standalone components, you do not need to explicitly set `standalone: true` inside the `@Component`, `@Directive` and `@Pipe` decorators, as it is implied by default.
    * **Bad:**
        ```typescript
        @Component({
          standalone: true,
          // ...
        })
        export class MyComponent {}
        ```
    * **Good:**
        ```typescript
        @Component({
          // `standalone: true` is implied
          // ...
        })
        export class MyComponent {}
        ```
* **Signals for State Management:** Utilize Angular Signals for reactive state management within components and services.
* **Lazy Loading:** Implement lazy loading for feature routes to improve initial load times of your application.
* **NgOptimizedImage:** Use `NgOptimizedImage` for all static images to automatically optimize image loading and performance.
* **Host bindings:** Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead.

## Components

* **Single Responsibility:** Keep components small, focused, and responsible for a single piece of functionality.
* **`input()` and `output()` Functions:** Prefer `input()` and `output()` functions over the `@Input()` and `@Output()` decorators for defining component inputs and outputs.
    * **Old Decorator Syntax:**
        ```typescript
        @Input() userId!: string;
        @Output() userSelected = new EventEmitter<string>();
        ```
    * **New Function Syntax:**
        ```typescript
        import { input, output } from '@angular/core';

        // ...
        userId = input<string>('');
        userSelected = output<string>();
        ```
* **`computed()` for Derived State:** Use the `computed()` function from `@angular/core` for derived state based on signals.
* **`ChangeDetectionStrategy.OnPush`:** Always set `changeDetection: ChangeDetectionStrategy.OnPush` in the `@Component` decorator for performance benefits by reducing unnecessary change detection cycles.
* **Inline Templates:** Prefer inline templates (template: `...`) for small components to keep related code together. For larger templates, use external HTML files.
* **Reactive Forms:** Prefer Reactive forms over Template-driven forms for complex forms, validation, and dynamic controls due to their explicit, immutable, and synchronous nature.
* **No `ngClass` / `NgClass`:** Do not use the `ngClass` directive. Instead, use native `class` bindings for conditional styling.
    * **Bad:**
        ```html
        <section [ngClass]="{'active': isActive}"></section>
        ```
    * **Good:**
        ```html
        <section [class.active]="isActive"></section>
        <section [class]="{'active': isActive}"></section>
        <section [class]="myClasses"></section>
        ```
* **No `ngStyle` / `NgStyle`:** Do not use the `ngStyle` directive. Instead, use native `style` bindings for conditional inline styles.
    * **Bad:**
        ```html
        <section [ngStyle]="{'font-size': fontSize + 'px'}"></section>
        ```
    * **Good:**
        ```html
        <section [style.font-size.px]="fontSize"></section>
        <section [style]="myStyles"></section>
        ```

## State Management

* **Signals for Local State:** Use signals for managing local component state.
* **`computed()` for Derived State:** Leverage `computed()` for any state that can be derived from other signals.
* **Pure and Predictable Transformations:** Ensure state transformations are pure functions (no side effects) and predictable.
* **Signal value updates:** Do NOT use `mutate` on signals, use `update` or `set` instead.

## Templates

* **Simple Templates:** Keep templates as simple as possible, avoiding complex logic directly in the template. Delegate complex logic to the component's TypeScript code.
* **Native Control Flow:** Use the new built-in control flow syntax (`@if`, `@for`, `@switch`) instead of the older structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`).
    * **Old Syntax:**
        ```html
        <section *ngIf="isVisible">Content</section>
        <section *ngFor="let item of items">{{ item }}</section>
        ```
    * **New Syntax:**
        ```html
        @if (isVisible) {
          <section>Content</section>
        }
        @for (item of items; track item.id) {
          <section>{{ item }}</section>
        }
        ```
* **Async Pipe:** Use the `async` pipe to handle observables in templates. This automatically subscribes and unsubscribes, preventing memory leaks.

## Services

* **Single Responsibility:** Design services around a single, well-defined responsibility.
* **`providedIn: 'root'`:** Use the `providedIn: 'root'` option when declaring injectable services to ensure they are singletons and tree-shakable.
* **`inject()` Function:** Prefer the `inject()` function over constructor injection when injecting dependencies, especially within `provide` functions, `computed` properties, or outside of constructor context.
    * **Old Constructor Injection:**
        ```typescript
        constructor(private myService: MyService) {}
        ```
    * **New `inject()` Function:**
        ```typescript
        import { inject } from '@angular/core';

        export class MyComponent {
          private myService = inject(MyService);
          // ...
        }
        ```


# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx monorepo containing an Angular blog application with frontend and backend components:

- **blog** (apps/blog): Angular 20 SSR application with SCSS styling
- **blog-be** (apps/blog-be): Express.js backend API with PostgreSQL and Prisma
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
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Entry Point**: apps/blog-be/src/main.ts
- **Default Port**: 3333
- **API Endpoint**: /api
- **Features**: JWT authentication, password reset, user management
- **Security**: Helmet, CORS, rate limiting, request validation

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
- **PostgreSQL**: localhost:5432 (blog_db/blog_user/blog_password)

### Docker Features
- **Hot Reload**: Changes in source code automatically trigger recompilation
- **Volume Mounting**: Source code is mounted for real-time development
- **Nx Cache Isolation**: `.nx` directory is excluded to prevent Windows cache conflicts
- **Node 22 Alpine**: Clean environment with latest Node.js
- **Proxy Configuration**: Frontend automatically proxies `/api/*` requests to backend (no CORS issues)
- **PostgreSQL Service**: Includes health checks and automatic database initialization

### Rebuild Services
```bash
# Rebuild specific service
docker-compose build frontend
docker-compose build backend

# Rebuild and restart
docker-compose up --build
```

## Database Management

### Prisma Commands
```bash
# Generate Prisma client
DATABASE_URL="postgresql://blog_user:blog_password@localhost:5432/blog_db" npx prisma generate

# Run database migrations
DATABASE_URL="postgresql://blog_user:blog_password@localhost:5432/blog_db" npx prisma migrate dev --name init

# Reset database (development only)
DATABASE_URL="postgresql://blog_user:blog_password@localhost:5432/blog_db" npx prisma migrate reset --force

# Access Prisma Studio
DATABASE_URL="postgresql://blog_user:blog_password@localhost:5432/blog_db" npx prisma studio
```

### Database Schema
- **Users**: Authentication, profiles, OAuth support (Google, GitHub)
- **RefreshTokens**: Secure token management with device tracking
- **BlogPosts**: Content management with SEO fields
- **Tags**: Categorization system with many-to-many relationships

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

## Important Architecture Patterns

### Frontend Architecture
- **State Management**: NgRx Signal Store for complex state, Angular Signals for local state
- **Component Structure**: Standalone components with OnPush change detection
- **Data Access**: Service layer with proper HTTP interceptors
- **Routing**: Lazy-loaded routes with resolvers for data fetching

### Backend Architecture
- **Authentication**: JWT tokens with refresh token rotation
- **Security**: Multi-layer security with rate limiting, validation middleware
- **Database**: Prisma ORM with migrations and connection pooling
- **Error Handling**: Centralized error handling with proper logging
- **API Structure**: RESTful endpoints with consistent response formats

### Key Dependencies
- **Frontend**: Angular 20, NgRx Signals, RxJS, Angular Material (potential)
- **Backend**: Express.js, Prisma, PostgreSQL, JWT, bcrypt, Helmet, CORS
- **Development**: Nx 21.3.1, TypeScript 5.8, ESLint, Prettier, Jest, Playwright
