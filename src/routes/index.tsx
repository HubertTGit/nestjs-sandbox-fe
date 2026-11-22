import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
  const { data, isFetching, refetch } = useSuspenseQuery(appStatusQueryOptions)

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Vite SPA</Badge>
          <Badge variant="outline">TanStack Router</Badge>
          <Badge variant="outline">TanStack Query</Badge>
          <Badge variant="outline">shadcn/ui + Tailwind v4</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          React SPA Starter
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Client-side single-page application powered by Vite, type-safe
          file-based routing, cached server-state management, and accessible
          shadcn/ui primitives.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TanStack Query Integration</CardTitle>
          <CardDescription>
            Prefetched via the route loader with{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              queryClient.ensureQueryData
            </code>{' '}
            and read with{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              useSuspenseQuery
            </code>
            .
          </CardDescription>
          <CardAction>
            <Badge variant={isFetching ? 'secondary' : 'default'}>
              {isFetching ? 'Syncing' : 'Fresh'}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Rendering</dt>
              <dd className="mt-1 text-sm font-medium">{data.mode}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Last Fetched</dt>
              <dd className="mt-1 font-mono text-sm font-medium">
                {data.fetchedAt}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Fetch Count</dt>
              <dd className="mt-1 font-mono text-sm font-medium">
                {data.requestCount}
              </dd>
            </div>
          </dl>
        </CardContent>

        <CardFooter className="justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
            Refetch Query
          </Button>

          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link to="/about" />}
          >
            Explore Routing
            <ArrowRight />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
