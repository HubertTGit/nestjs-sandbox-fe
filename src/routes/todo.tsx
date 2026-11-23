import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { todosQueryOptions } from '@/api/todos'

export const Route = createFileRoute('/todo')({
  loader: ({ context: { queryClient } }) =>
    queryClient.query(todosQueryOptions),
  component: TodoPage,
})

function TodoPage() {
  const { data: todos } = useSuspenseQuery(todosQueryOptions)

  useEffect(() => {
    console.log('Todos:', todos)
  }, [todos])

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
        <p className="text-sm text-muted-foreground">
          Loaded {todos.length} todos from the API (logged to the browser
          console).
        </p>
      </div>
    </div>
  )
}
