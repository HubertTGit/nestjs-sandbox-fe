import { Plus } from 'lucide-react'
import { type FormEvent, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

interface TodoCreateFormProps {
  isPending: boolean
  onCreate: (task: string) => Promise<void>
}

export function TodoCreateForm({ isPending, onCreate }: TodoCreateFormProps) {
  const inputId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [task, setTask] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) {
      return
    }

    const trimmed = task.trim()
    if (!trimmed) {
      setValidationError('Please enter a task description.')
      inputRef.current?.focus()
      return
    }

    setValidationError(null)
    try {
      await onCreate(trimmed)
      setTask('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } catch {
      // Mutation error banner is handled by the parent page.
    }
  }

  return (
    <form
      aria-label="Create a todo"
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
    >
      <Field data-invalid={validationError ? true : undefined}>
        <FieldLabel htmlFor={inputId} className="sr-only">
          New todo
        </FieldLabel>

        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            id={inputId}
            name="task"
            type="text"
            value={task}
            placeholder="What needs to be done?"
            autoComplete="off"
            enterKeyHint="done"
            disabled={isPending}
            aria-invalid={validationError ? true : undefined}
            aria-describedby={validationError ? errorId : undefined}
            className="flex-1"
            onChange={(event) => {
              setTask(event.target.value)
              if (validationError) {
                setValidationError(null)
              }
            }}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                <span>Adding…</span>
              </>
            ) : (
              <>
                <Plus data-icon="inline-start" aria-hidden="true" />
                <span>Add</span>
              </>
            )}
          </Button>
        </div>

        <FieldError id={errorId}>{validationError}</FieldError>
      </Field>
    </form>
  )
}
