import { googleLogout } from '@react-oauth/google'
import { queryOptions } from '@tanstack/react-query'
import {
  API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  setAccessToken,
  setRefreshToken,
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
 * for an in-memory accessToken and a rotating refreshToken via JSON body transport.
 */
export async function loginWithGoogleIdToken(
  idToken: string,
): Promise<AuthUser> {
  const { data, error, response } = await api.POST('/auth/google', {
    params: {
      header: {
        'X-Auth-Transport': 'body',
      },
    },
    body: { idToken },
  })

  if (error || !response.ok || !data) {
    throw new Error(`Google sign-in failed (${response.status})`)
  }

  setAccessToken(data.accessToken, data.expiresIn)
  setRefreshToken(data.refreshToken ?? null)
  const user = normalizeAuthUser(data.user)
  queryClient.setQueryData<AuthUser | null>(authMeQueryKey, user)
  return user
}

/**
 * Fetch the currently authenticated user via GET /auth/me (Bearer).
 * Attempts one silent token refresh on cold page reload before returning null.
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
  setRefreshToken(null)
  queryClient.setQueryData<AuthUser | null>(authMeQueryKey, null)
  queryClient.removeQueries({ queryKey: todoKeys.all })
}

/**
 * Revoke the refresh token family on the backend and discard local tokens and cached state.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Transport': 'body',
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    })
  } finally {
    googleLogout()
    clearAuthCache()
  }
}
