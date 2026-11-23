import { queryOptions } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

interface AppStatus {
  mode: string
  fetchedAt: string
  requestCount: number
}

let requestCounter = 0

async function fetchAppStatus(): Promise<AppStatus> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  requestCounter += 1
  return {
    mode: 'Client-side SPA (No SSR)',
    fetchedAt: new Date().toLocaleTimeString(),
    requestCount: requestCounter,
  }
}

const appStatusQueryOptions = queryOptions({
  queryKey: ['app-status'],
  queryFn: fetchAppStatus,
})

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(appStatusQueryOptions),
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
