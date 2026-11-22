---
name: openapi-typescript-todo
description: Guides generating TypeScript definitions from the nestjs-sandbox OpenAPI spec (/docs-json) with openapi-typescript, implementing and exporting the Todo interface and related DTO types, and wiring end-to-end typed Todo requests with openapi-fetch and TanStack Query. Use when setting up OpenAPI type generation, refreshing backend API types, or implementing Todo data fetching and mutations in this SPA.
---

# OpenAPI TypeScript & Todo Interface Workflow

This skill covers generating TypeScript types from the `nestjs-sandbox` backend OpenAPI specification using `openapi-typescript`, implementing the `Todo` interface (and related DTO types), and consuming Todo endpoints safely in this React + Vite + TanStack SPA.

## Backend OpenAPI & Todo Endpoint Reference

The NestJS backend exposes Swagger/OpenAPI at the base URL configured in `.env` (`API_URL`):

- **Swagger UI**: `GET ${API_URL}/docs`
- **OpenAPI 3.0 JSON**: `GET ${API_URL}/docs-json` (YAML at `GET ${API_URL}/docs-yaml`) — includes all request/response DTO models under `components.schemas`.

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/todos` | Public | List all todos |
| `GET` | `/todos/:id` | Public | Get a todo by ID |
| `POST` | `/todos` | Bearer | Create a todo |
| `PATCH` | `/todos/:id` | Bearer | Update a todo |
| `DELETE` | `/todos/:id` | Bearer | Delete a todo |

---

## Step 1: Configure `.env` (`API_URL`) and Verify Backend & CORS

Before generating types or calling endpoints from the Vite dev server (`http://localhost:5173`):

1. Set `API_URL` in this SPA's `.env` (no trailing slash):
   ```env
   API_URL=<your-api-url>
   ```
2. Expose `API_URL` to browser code in `vite.config.ts` (by default Vite only exposes `VITE_*` variables):
   ```ts
   export default defineConfig({
     envPrefix: ['VITE_', 'API_URL'],
     // ...existing plugins and resolve config
   })
   ```
   And declare its type in `src/vite-env.d.ts`:
   ```ts
   /// <reference types="vite/client" />

   interface ImportMetaEnv {
     readonly API_URL: string
   }
   ```
3. Ensure `nestjs-sandbox` is running (`pnpm start:dev`) and reachable at `API_URL`, and that the backend `.env` allows this SPA's origin:
   ```env
   CORS_ORIGINS=http://localhost:5173
   ```
4. Verify the OpenAPI JSON spec is reachable using `API_URL` from `.env`:
   ```bash
   set -a && . ./.env && set +a && curl -fsS "$API_URL/docs-json" | head -c 200
   ```

---

## Step 2: Install `openapi-typescript` and Configure Scripts & Biome

1. Install `openapi-typescript` as a dev dependency with `pnpm`:
   ```bash
   pnpm add -D openapi-typescript
   ```
2. Add the `api:types` script to `package.json`, loading `API_URL` from `.env`:
   ```json
   {
     "scripts": {
       "api:types": "set -a && . ./.env && set +a && openapi-typescript \"$API_URL/docs-json\" -o src/api/schema.d.ts"
     }
   }
   ```
3. Exclude the generated file from Biome in `biome.json` (just like `src/routeTree.gen.ts`) so `pnpm check` does not fail on generated formatting:
   ```json
   {
     "files": {
       "includes": [
         "**",
         "!!**/dist",
         "!!**/.tanstack",
         "!!**/.pnpm-store",
         "!!**/public",
         "!!**/src/routeTree.gen.ts",
         "!!**/src/api/schema.d.ts"
       ]
     }
   }
   ```

---

## Step 3: Generate OpenAPI Type Definitions

Run the generator against `$API_URL/docs-json`:

```bash
pnpm api:types
```

Or run it directly with `.env` loaded:

```bash
set -a && . ./.env && set +a && pnpm exec openapi-typescript "$API_URL/docs-json" -o src/api/schema.d.ts
```

- Treat `src/api/schema.d.ts` as **auto-generated** — never edit it manually.
- Re-run `pnpm api:types` whenever backend DTOs or controller routes change.

---

## Step 4: Implement and Export the `Todo` Interface (`src/api/types.ts`)

Create `src/api/types.ts` to expose clean domain types backed by the generated `components['schemas']`. Always use `import type` to satisfy `verbatimModuleSyntax` in `tsconfig.app.json`.

### Option A: Export as `interface` (recommended when extending or enforcing interface contracts)

```ts
import type { components } from './schema'

export interface Todo extends components['schemas']['TodoDto'] {}
export interface CreateTodo extends components['schemas']['CreateTodoDto'] {}
export interface UpdateTodo extends components['schemas']['UpdateTodoDto'] {}
```

### Option B: Direct type alias re-exports (all backend DTOs)

```ts
import type { components } from './schema'

export type Todo = components['schemas']['TodoDto']
export type CreateTodo = components['schemas']['CreateTodoDto']
export type UpdateTodo = components['schemas']['UpdateTodoDto']
export type AuthUser = components['schemas']['AuthUserDto']
export type GoogleAuthRequest = components['schemas']['GoogleAuthDto']
export type RefreshTokenRequest = components['schemas']['RefreshTokenDto']
export type LogoutRequest = components['schemas']['LogoutDto']
export type AccessTokenResponse =
  components['schemas']['AccessTokenResponseDto']
```

Use whichever form matches the codebase's needs (e.g., `interface Todo extends components['schemas']['TodoDto'] {}` when you need interface declaration merging/extension, and `type` aliases for the remaining DTOs).

---

## Step 5: Typed API Client with `openapi-fetch` (Recommended)

Pair the generated `paths` type with `openapi-fetch` for end-to-end type-safe requests without hand-written fetch wrappers.

1. Install `openapi-fetch`:
   ```bash
   pnpm add openapi-fetch
   ```
2. Create `src/api/client.ts` reading `API_URL` from `.env`:
   ```ts
   import createClient from 'openapi-fetch'
   import type { paths } from './schema'

   export const api = createClient<paths>({
     baseUrl: import.meta.env.API_URL,
     credentials: 'include',
   })
   ```
3. Build Todo API helpers and TanStack Query options (e.g., `src/api/todos.ts`) following the workspace's `queryOptions` + route `loader` + `useSuspenseQuery` convention:

   ```ts
   import { queryOptions } from '@tanstack/react-query'
   import { api } from '@/api/client'
   import type { CreateTodo, Todo, UpdateTodo } from '@/api/types'

   export async function fetchTodos(): Promise<Todo[]> {
     const { data, error } = await api.GET('/todos')
     if (error) {
       throw new Error('Failed to fetch todos')
     }
     return data
   }

   export async function fetchTodoById(id: string): Promise<Todo> {
     const { data, error } = await api.GET('/todos/{id}', {
       params: { path: { id } },
     })
     if (error) {
       throw new Error(`Failed to fetch todo ${id}`)
     }
     return data
   }

   export async function createTodo(
     body: CreateTodo,
     accessToken: string,
   ): Promise<Todo> {
     const { data, error } = await api.POST('/todos', {
       body,
       headers: { Authorization: `Bearer ${accessToken}` },
     })
     if (error) {
       throw new Error('Failed to create todo')
     }
     return data
   }

   export async function updateTodo(
     id: string,
     body: UpdateTodo,
     accessToken: string,
   ): Promise<Todo> {
     const { data, error } = await api.PATCH('/todos/{id}', {
       params: { path: { id } },
       body,
       headers: { Authorization: `Bearer ${accessToken}` },
     })
     if (error) {
       throw new Error(`Failed to update todo ${id}`)
     }
     return data
   }

   export async function deleteTodo(
     id: string,
     accessToken: string,
   ): Promise<void> {
     const { error } = await api.DELETE('/todos/{id}', {
       params: { path: { id } },
       headers: { Authorization: `Bearer ${accessToken}` },
     })
     if (error) {
       throw new Error(`Failed to delete todo ${id}`)
     }
   }

   export const todosQueryOptions = queryOptions({
     queryKey: ['todos'],
     queryFn: fetchTodos,
   })

   export const todoQueryOptions = (id: string) =>
     queryOptions({
       queryKey: ['todos', id],
       queryFn: () => fetchTodoById(id),
     })
   ```

   > **Path param type check**: After running `pnpm api:types`, verify whether `paths['/todos/{id}']` types `id` as `string` or `number` in `src/api/schema.d.ts` and match the parameter type in `fetchTodoById`, `updateTodo`, and `deleteTodo`.

4. Prefetch in a TanStack Router route `loader` and read with `useSuspenseQuery`:
   ```tsx
   import { useSuspenseQuery } from '@tanstack/react-query'
   import { createFileRoute } from '@tanstack/react-router'
   import { todosQueryOptions } from '@/api/todos'

   export const Route = createFileRoute('/todos')({
     loader: ({ context: { queryClient } }) =>
       queryClient.ensureQueryData(todosQueryOptions),
     component: TodosPage,
   })

   function TodosPage() {
     const { data: todos } = useSuspenseQuery(todosQueryOptions)
     // Render todos...
     return null
   }
   ```

---

## Validation Checklist

After completing the setup or regenerating types:

1. Confirm `src/api/schema.d.ts` exists and includes `TodoDto`, `CreateTodoDto`, and `UpdateTodoDto` under `components['schemas']`.
2. Confirm `src/api/schema.d.ts` is ignored in `biome.json` (`"!!**/src/api/schema.d.ts"`).
3. Run workspace checks to verify formatting, linting, TypeScript strictness (`verbatimModuleSyntax`, `erasableSyntaxOnly`), and the production bundle:
   ```bash
   pnpm check && pnpm build
   ```

## Troubleshooting

- **Cannot fetch `$API_URL/docs-json`**: Confirm `API_URL` is set in `.env` (without a trailing slash) and that the `nestjs-sandbox` server is running and reachable at that URL.
- **`import.meta.env.API_URL` is `undefined` in the browser**: Add `envPrefix: ['VITE_', 'API_URL']` in `vite.config.ts` and restart `pnpm dev`.
- **Browser CORS error**: Add `CORS_ORIGINS=http://localhost:5173` in the backend `.env` and restart the API.
- **`401 Unauthorized` on `POST`/`PATCH`/`DELETE /todos`**: These routes require a Bearer JWT `accessToken` in the `Authorization: Bearer <accessToken>` header (`GET /todos` and `GET /todos/:id` are public).
- **Biome lint/format errors in `src/api/schema.d.ts`**: Add `"!!**/src/api/schema.d.ts"` to `files.includes` in `biome.json`.
