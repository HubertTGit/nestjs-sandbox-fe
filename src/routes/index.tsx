import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { authMeQueryOptions } from '@/api/auth'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
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
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const user = await queryClient.ensureQueryData(authMeQueryOptions)
    if (user) {
      if (search.redirect && search.redirect !== '/') {
        throw redirect({
          href: search.redirect,
          replace: true,
        })
      }
      throw redirect({
        to: '/todo',
        replace: true,
      })
    }
  },
  component: HomePage,
})

function HomePage() {
  const router = useRouter()
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Todo Workspace
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Sign in with your Google account to access and manage your todos.
          Short-lived access tokens are kept in memory and refreshed
          automatically using rotating refresh tokens.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Sign in with Google</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3.5" aria-hidden="true" />
              Protected
            </Badge>
          </div>
          <CardDescription>
            Authentication is required before you can enter the Todo route or
            create, update, and delete todos.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
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
              if (redirectTo && redirectTo !== '/') {
                router.history.replace(redirectTo)
              } else {
                void router.navigate({ to: '/todo', replace: true })
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
