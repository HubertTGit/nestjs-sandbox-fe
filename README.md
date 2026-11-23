# nestjs-sandbox-fe

Client-side React single-page application (SPA) built to pair with the `nestjs-sandbox` NestJS backend API.

## Features

- **Google OIDC Authentication**: Sign in via Google Identity Services (`@react-oauth/google`), exchanging the Google ID token at `POST /auth/google` for a short-lived in-memory Bearer access token and an HttpOnly rotating refresh cookie (`X-Auth-Transport: cookie`).
- **Route Guards & Session Lifecycle**:
  - Unauthenticated requests to `/todo` redirect to `/` with `?redirect=/todo`.
  - Authenticated users are automatically redirected from `/` to `/todo` and remain in `/todo` until they sign out or their session expires.
  - `openapi-fetch` middleware attaches the Bearer token, proactively refreshes expiring tokens, and retries `401` responses once using single-flight refresh deduplication.
- **Todo Management (`/todo`)**:
  - Create tasks via `Enter` or the **Add** button (`POST /todos`).
  - Toggle completion with optimistic cache updates and error rollback (`PATCH /todos/{id}`).
  - Inline edit tasks with keyboard support (`Enter` to save, `Escape` to cancel) (`PATCH /todos/{id}`).
  - Delete tasks with per-item pending state (`DELETE /todos/{id}`).
  - Filter by **All**, **Active**, or **Done**, refresh cached data, and view completion progress.
- **End-to-End API Type Safety**: OpenAPI types generated directly from `${API_URL}/docs-json` via `openapi-typescript` and consumed through `openapi-fetch`.
- **Theming & Accessible UI**: Light/dark mode toggle backed by OKLCH CSS tokens, Tailwind CSS v4, and `shadcn/ui` (`base-nova` / `@base-ui/react`).

## Tech Stack

- **Package Manager**: `pnpm`
- **Build & Runtime**: Vite 8, React 19, TypeScript (`~7.0`)
- **Routing**: TanStack Router (`@tanstack/react-router`, Vite file-based routing + code splitting)
- **Server State**: TanStack Query (`@tanstack/react-query`)
- **API & Auth**: `openapi-typescript`, `openapi-fetch`, `@react-oauth/google`
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/vite`), `shadcn/ui` (`base-nova` + `@base-ui/react`), `lucide-react`, `tw-animate-css`, Geist Variable font
- **Linting & Formatting**: Biome (`biome.json`)

## Getting Started

### Prerequisites

- Node.js 22+
- `pnpm`
- Running `nestjs-sandbox` backend with `CORS_ORIGINS=http://localhost:5173`

### Environment Variables

Create a `.env` file in the project root:

```env
API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-web-client-id>
```

> `vite.config.ts` sets `envPrefix: ['VITE_', 'API_URL']` so `API_URL` is exposed to client code via `import.meta.env.API_URL` (no trailing slash).

### Install & Run

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Command          | Description                                                      |
| :--------------- | :--------------------------------------------------------------- |
| `pnpm dev`       | Start the Vite dev server with HMR                               |
| `pnpm build`     | Type-check (`tsc -b`) and build production assets (`vite build`) |
| `pnpm preview`   | Preview the production build locally                             |
| `pnpm api:types` | Regenerate `src/api/schema.d.ts` from `${API_URL}/docs-json`     |
| `pnpm check`     | Run Biome lint, format, and import organization checks           |
| `pnpm check:fix` | Auto-fix Biome lint and formatting issues                        |
| `pnpm lint`      | Run Biome linter only                                            |
| `pnpm format`    | Format files with Biome                                          |

## Project Structure

```text
.
├── index.html                          # SPA HTML entry point
├── vite.config.ts                      # Vite, TanStack Router, React, Tailwind v4, and @/* alias config
├── biome.json                          # Biome linter, formatter, and import sorting config
├── components.json                     # shadcn/ui (base-nova / lucide) configuration
├── package.json                        # Scripts and dependencies
├── tsconfig.json                       # TypeScript project references
├── tsconfig.app.json                   # App TypeScript compiler config
├── tsconfig.node.json                  # Node/Vite config TypeScript settings
└── src/
    ├── main.tsx                        # React root (GoogleOAuthProvider, ThemeProvider, QueryClient, Router)
    ├── router.tsx                      # TanStack Router setup and session-expired handler
    ├── routeTree.gen.ts                # Auto-generated TanStack Router route tree (do not edit)
    ├── index.css                       # Tailwind v4 imports and light/dark OKLCH theme tokens
    ├── vite-env.d.ts                   # ImportMetaEnv declarations (API_URL, VITE_GOOGLE_CLIENT_ID)
    ├── api/
    │   ├── schema.d.ts                 # Auto-generated OpenAPI TypeScript definitions (do not edit)
    │   ├── types.ts                    # Domain interfaces (Todo, CreateTodo, UpdateTodo, AuthUser, etc.)
    │   ├── auth-token.ts               # In-memory access token store & single-flight cookie refresh
    │   ├── client.ts                   # openapi-fetch client with Bearer & 401 retry middleware
    │   ├── auth.ts                     # Google sign-in, /auth/me query options, and logout helpers
    │   └── todos.ts                    # Todo CRUD functions, query options, and cache helpers
    ├── lib/
    │   ├── query-client.ts             # Shared TanStack QueryClient instance
    │   └── utils.ts                    # cn() class-merging utility
    ├── providers/
    │   └── theme-provider.tsx          # Light/dark/system theme context and persistence
    ├── routes/
    │   ├── __root.tsx                  # App shell, header navigation, sign-out action, theme toggle, devtools
    │   ├── index.tsx                   # Sign-in route (/) — redirects authenticated users to /todo
    │   └── todo.tsx                    # Protected Todo workspace (/todo) — redirects guests to /
    └── components/
        ├── google-sign-in-button.tsx   # Google Identity Services sign-in button wrapper
        ├── theme-toggle.tsx            # Light/dark theme switcher
        ├── todo-create-form.tsx        # Top form to create todos (Enter or button click)
        ├── todo-item.tsx               # Todo row with completion checkbox, inline edit, and delete
        └── ui/                         # shadcn/ui Base UI primitives
            ├── alert.tsx
            ├── badge.tsx
            ├── button.tsx
            ├── card.tsx
            ├── checkbox.tsx
            ├── empty.tsx
            ├── field.tsx
            ├── input.tsx
            ├── label.tsx
            ├── separator.tsx
            ├── spinner.tsx
            ├── toggle-group.tsx
            └── toggle.tsx
```

## Updating API Types

Whenever backend DTOs or endpoints change in `nestjs-sandbox`, ensure the backend is running at `API_URL` and regenerate `src/api/schema.d.ts`:

```bash
pnpm api:types
```

## Adding UI Components

This project uses `shadcn/ui` with the `base-nova` style (`@base-ui/react`) and `lucide-react` icons:

```bash
pnpm dlx shadcn@latest add <component>
```

### Install & Run

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start the Vite dev server with HMR |
| `pnpm build` | Type-check (`tsc -b`) and build production assets (`vite build`) |
| `pnpm preview` | Preview the production build locally |
| `pnpm api:types` | Regenerate `src/api/schema.d.ts` from `${API_URL}/docs-json` |
| `pnpm check` | Run Biome lint, format, and import organization checks |
| `pnpm check:fix` | Auto-fix Biome lint and formatting issues |
| `pnpm lint` | Run Biome linter only |
| `pnpm format` | Format files with Biome |

## Project Structure

```text
.
├── index.html                          # SPA HTML entry point
├── vite.config.ts                      # Vite, TanStack Router, React, Tailwind v4, and @/* alias config
├── biome.json                          # Biome linter, formatter, and import sorting config
├── components.json                     # shadcn/ui (base-nova / lucide) configuration
├── package.json                        # Scripts and dependencies
├── tsconfig.json                       # TypeScript project references
├── tsconfig.app.json                   # App TypeScript compiler config
├── tsconfig.node.json                  # Node/Vite config TypeScript settings
└── src/
    ├── main.tsx                        # React root (GoogleOAuthProvider, ThemeProvider, QueryClient, Router)
    ├── router.tsx                      # TanStack Router setup and session-expired handler
    ├── routeTree.gen.ts                # Auto-generated TanStack Router route tree (do not edit)
    ├── index.css                       # Tailwind v4 imports and light/dark OKLCH theme tokens
    ├── vite-env.d.ts                   # ImportMetaEnv declarations (API_URL, VITE_GOOGLE_CLIENT_ID)
    ├── api/
    │   ├── schema.d.ts                 # Auto-generated OpenAPI TypeScript definitions (do not edit)
    │   ├── types.ts                    # Domain interfaces (Todo, CreateTodo, UpdateTodo, AuthUser, etc.)
    │   ├── auth-token.ts               # In-memory access token store & single-flight cookie refresh
    │   ├── client.ts                   # openapi-fetch client with Bearer & 401 retry middleware
    │   ├── auth.ts                     # Google sign-in, /auth/me query options, and logout helpers
    │   └── todos.ts                    # Todo CRUD functions, query options, and cache helpers
    ├── lib/
    │   ├── query-client.ts             # Shared TanStack QueryClient instance
    │   └── utils.ts                    # cn() class-merging utility
    ├── providers/
    │   └── theme-provider.tsx          # Light/dark/system theme context and persistence
    ├── routes/
    │   ├── __root.tsx                  # App shell, header navigation, sign-out action, theme toggle, devtools
    │   ├── index.tsx                   # Sign-in route (/) — redirects authenticated users to /todo
    │   └── todo.tsx                    # Protected Todo workspace (/todo) — redirects guests to /
    └── components/
        ├── google-sign-in-button.tsx   # Google Identity Services sign-in button wrapper
        ├── theme-toggle.tsx            # Light/dark theme switcher
        ├── todo-create-form.tsx        # Top form to create todos (Enter or button click)
        ├── todo-item.tsx               # Todo row with completion checkbox, inline edit, and delete
        └── ui/                         # shadcn/ui Base UI primitives
            ├── alert.tsx
            ├── badge.tsx
            ├── button.tsx
            ├── card.tsx
            ├── checkbox.tsx
            ├── empty.tsx
            ├── field.tsx
            ├── input.tsx
            ├── label.tsx
            ├── separator.tsx
            ├── spinner.tsx
            ├── toggle-group.tsx
            └── toggle.tsx
```

## Updating API Types

Whenever backend DTOs or endpoints change in `nestjs-sandbox`, ensure the backend is running at `API_URL` and regenerate `src/api/schema.d.ts`:

```bash
pnpm api:types
```

## Adding UI Components

This project uses `shadcn/ui` with the `base-nova` style (`@base-ui/react`) and `lucide-react` icons:

```bash
pnpm dlx shadcn@latest add <component>
```
