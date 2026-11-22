# AGENTS.md

## Project Overview

`nestjs-sandbox-fe` is a client-side React single-page application (no SSR) built to pair with a NestJS backend API.

## Tech Stack

- **Package Manager**: `pnpm` (always use `pnpm` / `pnpm dlx`, not `npm` or `yarn`)
- **Build & Runtime**: Vite 8, React 19, TypeScript (`~7.0`)
- **Routing**: TanStack Router (`@tanstack/react-router`) with Vite file-based routing and automatic code splitting
- **Server State**: TanStack Query (`@tanstack/react-query`)
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/vite`), `shadcn/ui` (`base-nova` style backed by `@base-ui/react`), `lucide-react`, `tw-animate-css`, Geist Variable font
- **Linting & Formatting**: Biome (`biome.json`)

## Commands

- `pnpm dev` — start the Vite dev server
- `pnpm build` — run TypeScript project build (`tsc -b`) and Vite production bundle
- `pnpm preview` — preview the production build locally
- `pnpm check` — run Biome linter, formatter, and import organizer checks
- `pnpm check:fix` — auto-fix Biome lint/format issues
- `pnpm lint` — run Biome linter only
- `pnpm format` — format files with Biome

## Directory Structure

- `index.html` — SPA HTML entry point
- `src/main.tsx` — React root mounting `QueryClientProvider` and `RouterProvider`
- `src/router.tsx` — TanStack Router setup with shared `queryClient` context
- `src/routeTree.gen.ts` — **auto-generated** by `@tanstack/router-plugin`; never edit manually
- `src/routes/` — file-based routes (`__root.tsx`, `index.tsx`, `about.tsx`, etc.)
- `src/components/ui/` — `shadcn/ui` primitives (Base UI-based; use `pnpm dlx shadcn@latest add <component>`)
- `src/lib/query-client.ts` — shared TanStack `QueryClient` configuration
- `src/lib/utils.ts` — exports `cn` class-name helper
- `src/index.css` — Tailwind v4 imports, `@theme inline` tokens, light/dark OKLCH CSS variables, and base layer styles

## Conventions & Guidelines

### TypeScript
- Use the `@/*` path alias for imports from `src/` (e.g., `@/components/ui/button`).
- Respect strict compiler settings: `verbatimModuleSyntax` (use `import type` for type-only imports), `erasableSyntaxOnly` (avoid `enum`, `namespace`, parameter properties), `noUnusedLocals`, and `noUnusedParameters`.

### Routing & Data Fetching
- Add pages as route files under `src/routes/` using `createFileRoute`.
- Define reusable `queryOptions(...)`, prefetch in route `loader`s via `context.queryClient.ensureQueryData(...)`, and read data in components with `useSuspenseQuery(...)`.

### UI & Styling
- Use semantic Tailwind theme tokens defined in `src/index.css` (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border`, etc.) rather than hardcoded color values.
- `shadcn/ui` components use `@base-ui/react` (`base-nova` style), so polymorphic links/triggers use the `render` prop (e.g., `nativeButton={false} render={<Link to="..." />}`) rather than Radix `asChild`.
- Prefer `cn()` from `@/lib/utils` for conditional class merging.

### Code Quality & Verification
- Follow Biome rules (`biome.json`): 2-space indent, single quotes, no unnecessary semicolons, organized imports, and recommended React + TanStack Query lint rules.
- After making code changes, run `pnpm check` and `pnpm build` to verify formatting, linting, types, and the production build.
