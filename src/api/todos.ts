import { type QueryClient, queryOptions } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { CreateTodo, Todo, UpdateTodo } from '@/api/types'
import { queryClient as defaultQueryClient } from '@/lib/query-client'

export const TODO_CACHE_STALE_TIME = 5 * 60 * 1000
export const TODO_CACHE_GC_TIME = 30 * 60 * 1000

export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: () => [...todoKeys.lists()] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

export async function fetchTodos(signal?: AbortSignal): Promise<Todo[]> {
  const { data, error, response } = await api.GET('/todos', { signal })
  if (error || !response.ok || data === undefined) {
    throw new Error(`Failed to fetch todos (${response.status})`)
  }
  return data
}

export async function fetchTodoById(
  id: number,
  signal?: AbortSignal,
): Promise<Todo> {
  const { data, error, response } = await api.GET('/todos/{id}', {
    params: { path: { id } },
    signal,
  })
  if (error || !response.ok || data === undefined) {
    throw new Error(`Failed to fetch todo ${id} (${response.status})`)
  }
  return data
}

export async function createTodo(body: CreateTodo): Promise<Todo> {
  const { data, error, response } = await api.POST('/todos', {
    body,
  })
  if (error || !response.ok || data === undefined) {
    throw new Error(`Failed to create todo (${response.status})`)
  }
  return data
}

export async function updateTodo(id: number, body: UpdateTodo): Promise<Todo> {
  const { data, error, response } = await api.PATCH('/todos/{id}', {
    params: { path: { id } },
    body,
  })
  if (error || !response.ok || data === undefined) {
    throw new Error(`Failed to update todo ${id} (${response.status})`)
  }
  return data
}

export async function deleteTodo(id: number): Promise<void> {
  const { error, response } = await api.DELETE('/todos/{id}', {
    params: { path: { id } },
  })
  if (error || !response.ok) {
    throw new Error(`Failed to delete todo ${id} (${response.status})`)
  }
}

export const todosQueryOptions = queryOptions({
  queryKey: todoKeys.list(),
  queryFn: ({ signal }) => fetchTodos(signal),
  staleTime: TODO_CACHE_STALE_TIME,
  gcTime: TODO_CACHE_GC_TIME,
})

export const todoQueryOptions = (
  id: number,
  client: QueryClient = defaultQueryClient,
) =>
  queryOptions({
    queryKey: todoKeys.detail(id),
    queryFn: ({ signal }) => fetchTodoById(id, signal),
    staleTime: TODO_CACHE_STALE_TIME,
    gcTime: TODO_CACHE_GC_TIME,
    initialData: () =>
      client.getQueryData<Todo[]>(todoKeys.list())?.find((t) => t.id === id),
    initialDataUpdatedAt: () =>
      client.getQueryState(todoKeys.list())?.dataUpdatedAt,
  })

export function invalidateTodosCache(client: QueryClient) {
  return client.invalidateQueries({ queryKey: todoKeys.all })
}

export function upsertTodoInCache(client: QueryClient, todo: Todo) {
  client.setQueryData<Todo>(todoKeys.detail(todo.id), todo)
  client.setQueryData<Todo[]>(todoKeys.list(), (previous) => {
    if (!previous) return [todo]
    const exists = previous.some((item) => item.id === todo.id)
    return exists
      ? previous.map((item) => (item.id === todo.id ? todo : item))
      : [...previous, todo]
  })
}

export function removeTodoFromCache(client: QueryClient, id: number) {
  client.removeQueries({ queryKey: todoKeys.detail(id), exact: true })
  client.setQueryData<Todo[]>(todoKeys.list(), (previous) =>
    previous ? previous.filter((item) => item.id !== id) : previous,
  )
}
