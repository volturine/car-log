---
applyTo: "**/*.svelte, **/*.ts"
---

You are an expert in Svelte 5, SvelteKit, TypeScript, and modern web development.

Key Principles

- Write concise, technical code with accurate Svelte 5 and SvelteKit examples.
- Leverage SvelteKit's server-side rendering (SSR) and static site generation (SSG) capabilities.
- Prioritize performance optimization and minimal JavaScript for optimal user experience.
- Use descriptive variable names and follow Svelte and SvelteKit conventions.
- Organize files using SvelteKit's file-based routing system.

Code Style and Structure

- Write concise, technical TypeScript or JavaScript code with accurate examples.
- Use functional and declarative programming patterns; avoid unnecessary classes except for state machines.
- Prefer iteration and modularization over code duplication.
- Structure files: component logic, markup, styles, helpers, types.
- Follow Svelte's official documentation for setup and configuration: https://svelte.dev/docs

Naming Conventions

- Use lowercase with hyphens for component files (e.g., `components/auth-form.svelte`).
- Use PascalCase for component names in imports and usage.
- Use camelCase for variables, functions, and props.

TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use const objects instead.
- Use functional components with TypeScript interfaces for props.
- Enable strict mode in TypeScript for better type safety.

Svelte Runes

- `$state`: Declare reactive state
  ```typescript
  let count = $state(0);
  ```
- `$derived`: Compute derived values
  ```typescript
  let doubled = $derived(count * 2);
  ```
- `$effect`: Manage side effects and lifecycle
  ```typescript
  $effect(() => {
    console.log(`Count is now ${count}`);
  });
  ```
- `$props`: Declare component props
  ```typescript
  let { optionalProp = 42, requiredProp } = $props();
  ```
- `$bindable`: Create two-way bindable props
  ```typescript
  let { bindableProp = $bindable() } = $props();
  ```
- `$inspect`: Debug reactive state (development only)
  ```typescript
  $inspect(count);
  ```

UI and Styling

- Use Tailwind CSS for utility-first styling approach.
- Organize Tailwind classes using the `cn()` utility from `$lib/utils`.
- Use Svelte's built-in transition and animation features.

Shadcn Color Conventions

- Use `background` and `foreground` convention for colors.
- Define CSS variables without color space function:
  ```css
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  ```
- Usage example:
  ```svelte
  <div class="bg-primary text-primary-foreground">Hello</div>
  ```
- Key color variables:
  - `--background`, `--foreground`: Default body colors
  - `--muted`, `--muted-foreground`: Muted backgrounds
  - `--card`, `--card-foreground`: Card backgrounds
  - `--popover`, `--popover-foreground`: Popover backgrounds
  - `--border`: Default border color
  - `--input`: Input border color
  - `--primary`, `--primary-foreground`: Primary button colors
  - `--secondary`, `--secondary-foreground`: Secondary button colors
  - `--accent`, `--accent-foreground`: Accent colors
  - `--destructive`, `--destructive-foreground`: Destructive action colors
  - `--ring`: Focus ring color
  - `--radius`: Border radius for components

SvelteKit Project Structure

- Use the recommended SvelteKit project structure:
  ```
  - src/
    - lib/
    - routes/
    - app.html
  - static/
  - svelte.config.js
  - vite.config.js
  ```

Component Development

- Create .svelte files for Svelte components.
- Use .svelte.ts files for component logic and state machines.
- Implement proper component composition and reusability.
- Use Svelte's props for data passing.
- Leverage Svelte's reactive declarations for local state management.

State Management

- Use classes for complex state management (state machines):

  ```typescript
  // counter.svelte.ts
  class Counter {
    count = $state(0);
    incrementor = $state(1);

    increment() {
      this.count += this.incrementor;
    }

    resetCount() {
      this.count = 0;
    }

    resetIncrementor() {
      this.incrementor = 1;
    }
  }

  export const counter = new Counter();
  ```

- Use in components:

  ```svelte
  <script lang="ts">
  import { counter } from './counter.svelte.ts';
  </script>

  <button on:click={() => counter.increment()}>
    Count: {counter.count}
  </button>
  ```

Routing and Pages

- Utilize SvelteKit's file-based routing system in the src/routes/ directory.
- Implement dynamic routes using [slug] syntax.
- Use load functions for server-side data fetching and pre-rendering.
- Implement proper error handling with +error.svelte pages.

Server-Side Rendering (SSR) and Static Site Generation (SSG)

- Leverage SvelteKit's SSR capabilities for dynamic content.
- Implement SSG for static pages using prerender option.
- Use the adapter-auto for automatic deployment configuration.

Performance Optimization

- Leverage Svelte's compile-time optimizations.
- Use `{#key}` blocks to force re-rendering of components when needed.
- Implement code splitting using dynamic imports for large applications.
- Profile and monitor performance using browser developer tools.
- Use `$effect.tracking()` to optimize effect dependencies.
- Minimize use of client-side JavaScript; leverage SvelteKit's SSR and SSG.
- Implement proper lazy loading for images and other assets.

Data Fetching and API Routes

- Use load functions for server-side data fetching.
- Implement proper error handling for data fetching operations.
- Create API routes in the src/routes/api/ directory.
- Implement proper request handling and response formatting in API routes.
- Use SvelteKit's hooks for global API middleware.

SEO and Meta Tags

- Use Svelte:head component for adding meta information.
- Implement canonical URLs for proper SEO.
- Create reusable SEO components for consistent meta tag management.

Forms and Actions

- Utilize SvelteKit's form actions for server-side form handling.
- Implement proper client-side form validation using Svelte's reactive declarations.
- Use progressive enhancement for JavaScript-optional form submissions.

Internationalization (i18n) with Paraglide.js

- Use Paraglide.js for internationalization: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
- Install Paraglide.js: `npm install @inlang/paraglide-js`
- Set up language files in the `languages` directory.
- Use the `t` function to translate strings:

  ```svelte
  <script>
  import { t } from '@inlang/paraglide-js';
  </script>

  <h1>{t('welcome_message')}</h1>
  ```

- Support multiple languages and RTL layouts.
- Ensure text scaling and font adjustments for accessibility.

Accessibility

- Ensure proper semantic HTML structure in Svelte components.
- Implement ARIA attributes where necessary.
- Ensure keyboard navigation support for interactive elements.
- Use Svelte's bind:this for managing focus programmatically.

Key Conventions

1. Embrace Svelte's simplicity and avoid over-engineering solutions.
2. Use SvelteKit for full-stack applications with SSR and API routes.
3. Prioritize Web Vitals (LCP, FID, CLS) for performance optimization.
4. Use environment variables for configuration management.
5. Follow Svelte's best practices for component composition and state management.
6. Ensure cross-browser compatibility by testing on multiple platforms.
7. Keep your Svelte and SvelteKit versions up to date.

Documentation

- Svelte 5 Runes: https://svelte-5-preview.vercel.app/docs/runes
- Svelte Documentation: https://svelte.dev/docs
- SvelteKit Documentation: https://kit.svelte.dev/docs
- Paraglide.js Documentation: https://inlang.com/m/gerre34r/library-inlang-paraglideJs/usage

Refer to Svelte, SvelteKit, and Paraglide.js documentation for detailed information on components, internationalization, and best practices.

For all python use 'uv' packadge manager.

Backend (FastAPI) Guidelines — aligned with existing structure

- You are an expert in Python, FastAPI, and scalable API development.
- Keep the current backend layout (`backend/` with `api/`, `modules/`, `tests/`, `main.py`) and use lowercase_with_underscores for files (e.g., `api/v1/router.py`, `modules/filter/service.py`).
- Write concise, technical responses with accurate Python examples; prefer functional, declarative code over classes when possible.
- Favor iteration and modularization over duplication; name exports explicitly (routers, utilities) and apply the Receive an Object, Return an Object (RORO) pattern.

Python/FastAPI conventions

- Use `def` for pure functions and `async def` for I/O; add type hints everywhere. Prefer Pydantic v2 models for input/output validation.
- Structure per feature: exported router, sub-routes, utilities, types/schemas/models, static content where relevant.
- Use descriptive variable names with auxiliary verbs (e.g., `is_active`, `has_permission`).
- Use concise one-line conditionals when appropriate (e.g., `if not items: return []`). Avoid unnecessary `else`; use guard clauses and early returns.

Error handling and validation

- Handle errors and edge cases first; return early on invalid state. Keep the happy path last.
- Use FastAPI `HTTPException` for expected HTTP errors; centralize unexpected error handling in middleware. Log errors with context.
- Prefer custom error types/factories for consistency; surface user-friendly messages.

Dependencies

- Core: FastAPI, Pydantic v2. DB/IO: asyncpg/aiomysql or SQLAlchemy 2.0 with async engine.

FastAPI patterns

- Declare routes declaratively with clear return type annotations. Favor dependency injection for shared state/resources.
- Use lifespan context managers instead of `@app.on_event` for startup/shutdown when possible.
- Use middleware for logging, error monitoring, performance, and unexpected errors.
- Optimize for performance: async for I/O-bound work, caching (Redis or in-memory) for hot data, lazy loading for large payloads, efficient Pydantic serialization.

Key conventions for this repo

- Keep routers in `backend/api/v1/` and feature code in `backend/modules/<feature>/` (e.g., `filter`, `word_definition`) with `routes.py`, `schemas.py`, `service.py`, `models.py` as already present.
- Export router instances from `routes.py`/`router.py` and import them into `backend/main.py` via a central aggregator.
- Use Pydantic models for request/response schemas (`schemas.py`), pure functions in `service.py`, and keep DB/model logic in `models.py` when applicable.
- Prefer RORO helpers and pure functions; keep side effects at the edge (DB, network).
- Tests live in `backend/tests/`; add focused, fast tests for services and routers.
