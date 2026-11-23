const apiUrl = import.meta.env.API_URL?.replace(/\/+$/, '')

if (!apiUrl) {
  throw new Error('Missing API_URL environment variable')
}

export const API_BASE_URL = apiUrl

const REFRESH_BUFFER_MS = 30_000

let accessToken: string | null = null
let accessTokenExpiresAt: number | null = null
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
  sessionExpiredHandler?.()
}

/**
 * Single-flight refresh using the HttpOnly refresh_token cookie.
 * Deduplicates concurrent calls so single-use token rotation never triggers reuse revocation.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Transport': 'cookie',
        },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        setAccessToken(null)
        return null
      }

      const data = (await res.json()) as {
        accessToken?: string
        expiresIn?: number
      }
      const nextToken = data.accessToken ?? null
      setAccessToken(nextToken, data.expiresIn)
      return nextToken
    } catch {
      setAccessToken(null)
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}
