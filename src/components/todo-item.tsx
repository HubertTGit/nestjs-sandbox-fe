import { Check, Pencil, Trash2, X } from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { Todo } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface TodoItemProps {
  todo: Todo
  isEditing: boolean
  isUpdating: boolean
  isDeleting: boolean
  onStartEdit: (todo: Todo) => void
  onCancelEdit: () => void
  onSaveEdit: (id: number, task: string) => Promise<void>
  onToggleComplete: (todo: Todo, isCompleted: boolean) => void
  onDelete: (todo: Todo) => void
}

export function TodoItem({
  todo,
  isEditing,
  isUpdating,
  isDeleting,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleComplete,
  onDelete,
}: TodoItemProps) {
  const checkboxId = useId()
  const editInputId = useId()
  const editErrorId = useId()
  const editInputRef = useRef<HTMLInputElement>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const shouldRestoreFocusRef = useRef(false)

  const [draft, setDraft] = useState(todo.task)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      setDraft(todo.task)
      setEditError(null)
      const frame = requestAnimationFrame(() => {
        const input = editInputRef.current
        if (input) {
          input.focus()
          input.select()
        }
      })
      return () => cancelAnimationFrame(frame)
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false
      requestAnimationFrame(() => {
        editButtonRef.current?.focus()
      })
    }
  }, [isEditing, todo.task])

  function handleCancel() {
    shouldRestoreFocusRef.current = true
    setEditError(null)
    onCancelEdit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === 'Escape' &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== 229
    ) {
      event.preventDefault()
      handleCancel()
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isUpdating) {
      return
    }

    const trimmed = draft.trim()
    if (!trimmed) {
      setEditError('Task description cannot be empty.')
      editInputRef.current?.focus()
      return
    }

    if (trimmed === todo.task) {
      handleCancel()
      return
    }

    setEditError(null)
    try {
      shouldRestoreFocusRef.current = true
      await onSaveEdit(todo.id, trimmed)
    } catch {
      shouldRestoreFocusRef.current = false
    }
  }

  const isBusy = isUpdating || isDeleting

  if (isEditing) {
    return (
      <li className="py-3">
        <form
          aria-label={`Edit "${todo.task}"`}
          noValidate
          onSubmit={(event) => {
            void handleSave(event)
          }}
        >
          <Field data-invalid={editError ? true : undefined}>
            <FieldLabel htmlFor={editInputId} className="sr-only">
              Edit task
            </FieldLabel>

            <div className="flex items-center gap-2">
              <Input
                ref={editInputRef}
                id={editInputId}
                name="task"
                type="text"
                value={draft}
                autoComplete="off"
                enterKeyHint="done"
                disabled={isUpdating}
                aria-invalid={editError ? true : undefined}
                aria-describedby={editError ? editErrorId : undefined}
                className="flex-1"
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (editError) {
                    setEditError(null)
                  }
                }}
                onKeyDown={handleKeyDown}
              />

              <Button
                type="submit"
                size="icon"
                disabled={isUpdating}
                aria-label={`Save "${todo.task}"`}
              >
                {isUpdating ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <Check aria-hidden="true" />
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isUpdating}
                aria-label={`Cancel editing "${todo.task}"`}
                onClick={handleCancel}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <FieldError id={editErrorId}>{editError}</FieldError>
          </Field>
        </form>
      </li>
    )
  }

  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 py-3 transition-opacity',
        isDeleting && 'opacity-60',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Checkbox
          id={checkboxId}
          checked={todo.isCompleted}
          disabled={isBusy}
          onCheckedChange={(checked) => {
            onToggleComplete(todo, checked)
          }}
        />

        <Label
          htmlFor={checkboxId}
          className={cn(
            'min-w-0 flex-1 cursor-pointer py-1 font-normal leading-snug break-words',
            todo.isCompleted && 'text-muted-foreground line-through',
          )}
        >
          {todo.task}
        </Label>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          ref={editButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          disabled={isBusy}
          aria-label={`Edit "${todo.task}"`}
          onClick={() => {
            onStartEdit(todo)
          }}
        >
          <Pencil aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="destructive"
          size="icon"
          disabled={isBusy}
          aria-label={`Delete "${todo.task}"`}
          onClick={() => {
            onDelete(todo)
          }}
        >
          {isDeleting ? (
            <Spinner aria-hidden="true" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
        </Button>
      </div>
    </li>
  )
}
