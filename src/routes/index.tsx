import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Lock, LogOut } from 'lucide-react'
import { authMeQueryOptions, logout } from '@/api/auth'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface HomeSearch {
  redirect?: string
}

function sanitizeRedirect(value: unknown): string | undefined {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  ) {
    return value
  }
  return undefined
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(authMeQueryOptions),
  component: HomePage,
})

function HomePage() {
  const router = useRouter()
  const { redirect: redirectTo } = Route.useSearch()
  const { data: user } = useSuspenseQuery(authMeQueryOptions)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      void router.invalidate()
    },
  })

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Todo Workspace
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Sign in with your Google account to access and manage your todos.
          Short-lived access tokens are kept strictly in memory and rotated
          automatically via HttpOnly cookies.
        </p>
      </div>

      {user ? (
        <Card className="max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Authenticated session</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3.5" />
                Signed in
              </Badge>
            </div>
            <CardDescription>
              Your Bearer access token is attached automatically to all Todo API
              requests.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-1">
            {user.name ? (
              <p className="font-medium text-foreground">{user.name}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </CardContent>

          <CardFooter className="justify-between gap-3">
            <Button nativeButton={false} render={<Link to="/todo" />}>
              <span>Open Todos</span>
              <ArrowRight />
            </Button>

            <Button
              variant="outline"
              disabled={logoutMutation.isPending}
              onClick={() => {
                logoutMutation.mutate()
              }}
            >
              <LogOut />
              <span>
                {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
              </span>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Sign in with Google</CardTitle>
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3.5" />
                Protected
              </Badge>
            </div>
            <CardDescription>
              Authentication is required before you can enter the Todo route or
              create, update, and delete todos.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {redirectTo ? (
              <div
                role="status"
                className="rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground"
              >
                Please sign in to access{' '}
                <code className="font-mono text-foreground">{redirectTo}</code>.
              </div>
            ) : null}

            <GoogleSignInButton
              onSuccess={() => {
                if (redirectTo) {
                  router.history.push(redirectTo)
                }
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
