import { queryOptions } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { CreateTodo, Todo, UpdateTodo } from '@/api/types'

export async function fetchTodos(): Promise<Todo[]> {
  const { data, error, response } = await api.GET('/todos')
  if (error || !response.ok || data === undefined) {
    throw new Error(`Failed to fetch todos (${response.status})`)
  }
  return data
}

export async function fetchTodoById(id: number): Promise<Todo> {
  const { data, error, response } = await api.GET('/todos/{id}', {
    params: { path: { id } },
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
  queryKey: ['todos'],
  queryFn: fetchTodos,
})

export const todoQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['todos', id],
    queryFn: () => fetchTodoById(id),
  })
