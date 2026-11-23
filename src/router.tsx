import { createRouter } from '@tanstack/react-router'
import { clearAuthCache } from '@/api/auth'
import { setSessionExpiredHandler } from '@/api/auth-token'
import { queryClient } from '@/lib/query-client'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

setSessionExpiredHandler(() => {
  clearAuthCache()
  void router.invalidate()
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
