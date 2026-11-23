import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Layers, Lock, LogOut } from 'lucide-react'
import { authMeQueryOptions, logout } from '@/api/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const router = useRouter()
  const { data: user } = useQuery(authMeQueryOptions)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await router.navigate({ to: '/', replace: true })
      void router.invalidate()
    },
  })

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link
            to={user ? '/todo' : '/'}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Layers className="size-4" />
            <span>Todo</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav
              aria-label="Primary"
              className="flex items-center gap-1 text-sm"
            >
              <Link
                to="/todo"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-muted [&.active]:font-medium [&.active]:text-foreground"
              >
                {!user ? (
                  <Lock className="size-3.5" aria-hidden="true" />
                ) : null}
                <span>Todo</span>
              </Link>
            </nav>

            {user ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={logoutMutation.isPending}
                onClick={() => {
                  logoutMutation.mutate()
                }}
              >
                <LogOut />
                <span>Sign out</span>
              </Button>
            ) : null}

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Outlet />
      </main>

      {import.meta.env.DEV ? (
        <>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </>
      ) : null}
    </div>
  )
}

function NotFound() {
  const { data: user } = useQuery(authMeQueryOptions)

  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The route you requested does not exist in this SPA.
      </p>
      <Link
        to={user ? '/todo' : '/'}
        className="text-sm font-medium text-primary underline underline-offset-4"
      >
        {user ? 'Return to Todo' : 'Return to sign in'}
      </Link>
    </div>
  )
}
