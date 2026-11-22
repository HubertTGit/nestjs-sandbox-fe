import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/providers/theme-provider'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun
        aria-hidden="true"
        className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90"
      />
      <Moon
        aria-hidden="true"
        className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
      />
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
      <span className="sr-only dark:hidden">Switch to dark theme</span>
    </Button>
  )
}
