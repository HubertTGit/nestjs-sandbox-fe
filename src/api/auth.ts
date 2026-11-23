import { googleLogout } from '@react-oauth/google'
import { queryOptions } from '@tanstack/react-query'
import {
  API_BASE_URL,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from '@/api/auth-token'
import { api } from '@/api/client'
import type { components } from '@/api/schema'
import { todoKeys } from '@/api/todos'
import type { AuthUser } from '@/api/types'
import { queryClient } from '@/lib/query-client'

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}

export const authMeQueryKey = authKeys.me()

function normalizeAuthUser(
  raw: components['schemas']['AuthUserDto'],
): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    name: typeof raw.name === 'string' ? raw.name : null,
  }
}

/**
 * Exchange a Google OIDC id_token (from <GoogleLogin /> credentialResponse.credential)
 * for an in-memory accessToken and an HttpOnly refresh_token cookie.
 */
export async function loginWithGoogleIdToken(
  idToken: string,
): Promise<AuthUser> {
  const { data, error, response } = await api.POST('/auth/google', {
    params: {
      header: {
        'X-Auth-Transport': 'cookie',
      },
    },
    body: { idToken },
  })

  if (error || !response.ok || !data) {
    throw new Error(`Google sign-in failed (${response.status})`)
  }

  setAccessToken(data.accessToken, data.expiresIn)
  const user = normalizeAuthUser(data.user)
  queryClient.setQueryData<AuthUser | null>(authMeQueryKey, user)
  return user
}

/**
 * Fetch the currently authenticated user via GET /auth/me (Bearer).
 * Attempts one silent cookie refresh on cold page reload before returning null.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAccessToken() ?? (await refreshAccessToken())
  if (!token) {
    return null
  }

  const { data, error, response } = await api.GET('/auth/me')
  if (error || !response.ok || !data) {
    return null
  }

  return normalizeAuthUser(data)
}

export const authMeQueryOptions = queryOptions({
  queryKey: authMeQueryKey,
  queryFn: fetchCurrentUser,
  retry: false,
  staleTime: 5 * 60 * 1000,
})

export function clearAuthCache(): void {
  setAccessToken(null)
  queryClient.setQueryData<AuthUser | null>(authMeQueryKey, null)
  queryClient.removeQueries({ queryKey: todoKeys.all })
}

/**
 * Revoke the refresh token family, clear the HttpOnly cookie, and discard in-memory state.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Transport': 'cookie',
      },
      body: JSON.stringify({}),
    })
  } finally {
    googleLogout()
    clearAuthCache()
  }
}
