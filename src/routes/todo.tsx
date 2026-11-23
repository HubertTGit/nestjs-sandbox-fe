import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, ListTodo, RefreshCw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { authMeQueryOptions } from '@/api/auth'
import {
  createTodo,
  deleteTodo,
  invalidateTodosCache,
  removeTodoFromCache,
  todoKeys,
  todosQueryOptions,
  updateTodo,
  upsertTodoInCache,
} from '@/api/todos'
import type { Todo, UpdateTodo } from '@/api/types'
import { TodoCreateForm } from '@/components/todo-create-form'
import { TodoItem } from '@/components/todo-item'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

type TodoFilter = 'all' | 'active' | 'completed'

export const Route = createFileRoute('/todo')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query(authMeQueryOptions)
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
    queryClient.query(todosQueryOptions),
  component: TodoPage,
})

function TodoPage() {
  const queryClient = useQueryClient()
  const {
    data: todos,
    dataUpdatedAt,
    isFetching,
  } = useSuspenseQuery(todosQueryOptions)

  const [filter, setFilter] = useState<TodoFilter>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [updatingIds, setUpdatingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  )
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  )
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.isCompleted).length,
    [todos],
  )
  const activeCount = todos.length - completedCount

  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter((todo) => !todo.isCompleted)
    }
    if (filter === 'completed') {
      return todos.filter((todo) => todo.isCompleted)
    }
    return todos
  }, [filter, todos])

  const createMutation = useMutation({
    mutationFn: (task: string) => createTodo({ task, isCompleted: false }),
    onMutate: () => {
      setMutationError(null)
    },
    onSuccess: (created) => {
      upsertTodoInCache(queryClient, created)
      setStatusMessage(`Added "${created.task}".`)
    },
    onError: (error) => {
      setMutationError(
        error instanceof Error ? error.message : 'Failed to create todo.',
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTodo }) =>
      updateTodo(id, body),
    onMutate: async ({ id, body }) => {
      setMutationError(null)
      setUpdatingIds((previous) => new Set(previous).add(id))

      await queryClient.cancelQueries({ queryKey: todoKeys.list() })
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.list())

      if (previousTodos) {
        queryClient.setQueryData<Todo[]>(
          todoKeys.list(),
          previousTodos.map((item) =>
            item.id === id ? { ...item, ...body } : item,
          ),
        )
      }

      return { previousTodos }
    },
    onSuccess: (updated, { body }) => {
      upsertTodoInCache(queryClient, updated)
      if (body.task !== undefined) {
        setEditingId((current) => (current === updated.id ? null : current))
        setStatusMessage(`Updated "${updated.task}".`)
      } else if (body.isCompleted !== undefined) {
        setStatusMessage(
          `Marked "${updated.task}" as ${updated.isCompleted ? 'completed' : 'active'}.`,
        )
      }
    },
    onError: (error, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.list(), context.previousTodos)
      }
      setMutationError(
        error instanceof Error ? error.message : 'Failed to update todo.',
      )
    },
    onSettled: (_data, _error, { id }) => {
      setUpdatingIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: number; task: string }) => deleteTodo(id),
    onMutate: async ({ id }) => {
      setMutationError(null)
      setDeletingIds((previous) => new Set(previous).add(id))
      await queryClient.cancelQueries({ queryKey: todoKeys.list() })
    },
    onSuccess: (_data, { id, task }) => {
      removeTodoFromCache(queryClient, id)
      setEditingId((current) => (current === id ? null : current))
      setStatusMessage(`Deleted "${task}".`)
    },
    onError: (error) => {
      setMutationError(
        error instanceof Error ? error.message : 'Failed to delete todo.',
      )
    },
    onSettled: (_data, _error, { id }) => {
      setDeletingIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    },
  })

  async function handleCreateTodo(task: string) {
    await createMutation.mutateAsync(task)
  }

  async function handleSaveEdit(id: number, task: string) {
    await updateMutation.mutateAsync({ id, body: { task } })
  }

  function handleToggleComplete(todo: Todo, isCompleted: boolean) {
    updateMutation.mutate({ id: todo.id, body: { isCompleted } })
  }

  function handleDeleteTodo(todo: Todo) {
    deleteMutation.mutate({ id: todo.id, task: todo.task })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
            <Badge variant="secondary">
              {isFetching ? 'Refreshing…' : `${activeCount} remaining`}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {todos.length === 0
              ? 'Create and manage your tasks below.'
              : `${completedCount} of ${todos.length} completed. Last synced: ${dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}.`}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => {
            void invalidateTodosCache(queryClient)
          }}
        >
          <RefreshCw
            data-icon="inline-start"
            className={cn(isFetching && 'animate-spin')}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </Button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            Press Enter or click Add to create a task. Toggle, edit, or delete
            items below.
          </CardDescription>
          <CardAction>
            <ToggleGroup
              aria-label="Filter todos"
              variant="outline"
              size="sm"
              spacing={0}
              value={[filter]}
              onValueChange={(nextValue) => {
                const selected = nextValue[0]
                if (
                  selected === 'all' ||
                  selected === 'active' ||
                  selected === 'completed'
                ) {
                  setFilter(selected)
                }
              }}
            >
              <ToggleGroupItem value="all">
                All ({todos.length})
              </ToggleGroupItem>
              <ToggleGroupItem value="active">
                Active ({activeCount})
              </ToggleGroupItem>
              <ToggleGroupItem value="completed">
                Done ({completedCount})
              </ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <TodoCreateForm
            isPending={createMutation.isPending}
            onCreate={handleCreateTodo}
          />

          {mutationError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>{mutationError}</AlertDescription>
              <AlertAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Dismiss error"
                  onClick={() => {
                    setMutationError(null)
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              </AlertAction>
            </Alert>
          ) : null}

          <Separator />

          {todos.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListTodo aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No todos yet</EmptyTitle>
                <EmptyDescription>
                  Add your first task in the input above to get started.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : filteredTodos.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === 'active'
                    ? 'All caught up'
                    : 'No completed todos yet'}
                </EmptyTitle>
                <EmptyDescription>
                  {filter === 'active'
                    ? 'Every task in your list is marked as completed.'
                    : 'Complete a task to see it listed here.'}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilter('all')
                  }}
                >
                  Show all todos
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            // biome-ignore lint/a11y/noRedundantRoles: Safari strips list semantics from styled flex/list-none ul elements
            <ul role="list" className="flex flex-col divide-y divide-border">
              {filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isEditing={editingId === todo.id}
                  isUpdating={updatingIds.has(todo.id)}
                  isDeleting={deletingIds.has(todo.id)}
                  onStartEdit={(item) => {
                    setEditingId(item.id)
                  }}
                  onCancelEdit={() => {
                    setEditingId(null)
                  }}
                  onSaveEdit={handleSaveEdit}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteTodo}
                />
              ))}
            </ul>
          )}
        </CardContent>

        {todos.length > 0 ? (
          <CardFooter className="justify-between text-xs text-muted-foreground">
            <span>
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'} left
            </span>
            <span>{completedCount} completed</span>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
