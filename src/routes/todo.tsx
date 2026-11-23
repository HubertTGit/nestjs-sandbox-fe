import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { authMeQueryOptions } from '@/api/auth'
import { invalidateTodosCache, todosQueryOptions } from '@/api/todos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/todo')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.ensureQueryData(authMeQueryOptions)
    if (!user) {
      throw redirect({
        to: '/',
        search: {
          redirect: location.href,
        },
      })
    }
    return { user }
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(todosQueryOptions),
  component: TodoPage,
})

function TodoPage() {
  const queryClient = useQueryClient()
  const {
    data: todos,
    dataUpdatedAt,
    isFetching,
  } = useSuspenseQuery(todosQueryOptions)

  useEffect(() => {
    console.log('Todos:', todos)
  }, [todos])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
            <Badge variant="secondary">
              {isFetching ? 'Refreshing…' : 'Cached'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Loaded {todos.length} todos from the API (logged to the browser
            console). Last synced:{' '}
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
            .
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => {
            void invalidateTodosCache(queryClient)
          }}
        >
          <RefreshCw className={isFetching ? 'animate-spin' : undefined} />
          Refresh
        </Button>
      </div>
    </div>
  )
}
