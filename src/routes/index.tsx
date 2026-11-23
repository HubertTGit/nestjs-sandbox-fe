import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { todosQueryOptions } from '@/api/todos'

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(todosQueryOptions),
  component: HomePage,
})

function HomePage() {
  const { data: todos } = useSuspenseQuery(todosQueryOptions)

  useEffect(() => {
    console.log('Todos:', todos)
  }, [todos])

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
        <p className="text-sm text-muted-foreground">
          Loaded {todos.length} todos from the API (logged to the browser
          console).
        </p>
      </div>
    </div>
  )
}
