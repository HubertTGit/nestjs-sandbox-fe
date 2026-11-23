import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          React SPA Starter
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Client-side single-page application powered by Vite, type-safe
          file-based routing, cached server-state management, and accessible
          shadcn/ui primitives.
        </p>
      </div>
    </div>
  )
}
