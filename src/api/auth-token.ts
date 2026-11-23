const apiUrl = import.meta.env.API_URL?.replace(/\/+$/, '')

if (!apiUrl) {
  throw new Error('Missing API_URL environment variable')
}

export const API_BASE_URL = apiUrl

const REFRESH_BUFFER_MS = 30_000
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token'
const REFRESH_LOCK_NAME = 'auth_refresh'

let accessToken: string | null = null
let accessTokenExpiresAt: number | null = null
let fallbackRefreshToken: string | null = null
let refreshInFlight: Promise<string | null> | null = null
let sessionExpiredHandler: (() => void) | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(
  token: string | null,
  expiresInSeconds?: number,
): void {
  accessToken = token
  accessTokenExpiresAt =
    token && typeof expiresInSeconds === 'number' && expiresInSeconds > 0
      ? Date.now() + expiresInSeconds * 1000
      : null
}

export function getRefreshToken(): string | null {
  try {
    const stored = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (stored) {
      fallbackRefreshToken = stored
      return stored
    }
    return null
  } catch {
    return fallbackRefreshToken
  }
}

export function setRefreshToken(token: string | null): void {
  fallbackRefreshToken = token
  try {
    if (token) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    }
  } catch {
    // Fallback to in-memory refresh token when storage is unavailable
  }
}

export function isAccessTokenExpiringSoon(
  bufferMs = REFRESH_BUFFER_MS,
): boolean {
  if (!accessToken || accessTokenExpiresAt === null) {
    return false
  }
  return Date.now() + bufferMs >= accessTokenExpiresAt
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler
}

export function notifySessionExpired(): void {
  setAccessToken(null)
  setRefreshToken(null)
  sessionExpiredHandler?.()
}

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK_NAME, fn)
  }
  return fn()
}

/**
 * Single-flight refresh using JSON body transport and a persisted rotating refresh token.
 * Deduplicates concurrent in-tab calls and serializes cross-tab rotations via Web Locks
 * so single-use token rotation never triggers reuse revocation.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = withRefreshLock(async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      setAccessToken(null)
      return null
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Transport': 'body',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        setAccessToken(null)
        if (
          (res.status === 400 || res.status === 401 || res.status === 403) &&
          getRefreshToken() === refreshToken
        ) {
          setRefreshToken(null)
        }
        return null
      }

      const data = (await res.json()) as {
        accessToken?: string
        refreshToken?: string
        expiresIn?: number
      }
      const nextToken = data.accessToken ?? null
      setAccessToken(nextToken, data.expiresIn)
      if (
        typeof data.refreshToken === 'string' &&
        data.refreshToken.length > 0
      ) {
        setRefreshToken(data.refreshToken)
      }
      return nextToken
    } catch {
      setAccessToken(null)
      return null
    }
  }).finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}
