import createClient, { type Middleware } from 'openapi-fetch'
import {
  API_BASE_URL,
  getAccessToken,
  isAccessTokenExpiringSoon,
  notifySessionExpired,
  refreshAccessToken,
} from '@/api/auth-token'
import type { paths } from './schema'

const AUTH_SKIP_PATHS = new Set([
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
])
const requestClones = new WeakMap<Request, Request>()

export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
})

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const pathname = new URL(request.url).pathname
    if (AUTH_SKIP_PATHS.has(pathname)) {
      return request
    }

    if (!request.headers.has('Authorization')) {
      let token = getAccessToken()
      if (token && isAccessTokenExpiringSoon()) {
        token = await refreshAccessToken()
      }
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
    }

    if (!request.headers.has('X-Auth-Retry')) {
      requestClones.set(request, request.clone())
    }

    return request
  },
  async onResponse({ request, response }) {
    const cloned = requestClones.get(request)
    requestClones.delete(request)

    if (response.status !== 401 || !cloned) {
      return response
    }

    const freshToken = await refreshAccessToken()
    if (!freshToken) {
      notifySessionExpired()
      return response
    }

    cloned.headers.set('Authorization', `Bearer ${freshToken}`)
    cloned.headers.set('X-Auth-Retry', '1')
    return fetch(cloned)
  },
}

api.use(authMiddleware)
