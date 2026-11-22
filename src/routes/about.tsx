import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

const stackItems = [
  {
    name: 'Vite + React',
    detail: 'Pure client-side SPA bundle with zero SSR integration.',
  },
  {
    name: 'TanStack Router',
    detail: 'File-based routing in src/routes with automatic code splitting.',
  },
  {
    name: 'TanStack Query',
    detail:
      'Shared QueryClient injected into router context for route loaders.',
  },
  {
    name: 'shadcn/ui + Tailwind CSS v4',
    detail:
      'Tokenized theme variables in src/index.css and components in src/components/ui.',
  },
] as const

function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="outline">Client Route: /about</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          About this App
        </h1>
        <p className="text-muted-foreground">
          Navigating between routes happens entirely on the client while
          preserving your TanStack Query cache.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Stack</CardTitle>
          <CardDescription>
            Ready to connect to your NestJS backend API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {stackItems.map((item) => (
              <li
                key={item.name}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/" />}
          >
            <ArrowLeft />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
