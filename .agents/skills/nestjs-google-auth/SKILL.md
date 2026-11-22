---
name: nestjs-google-auth
description: Guides implementing Google OIDC authentication in this React 19 + Vite SPA against the nestjs-sandbox backend (/auth/google, /auth/refresh, /auth/me, /auth/logout) using @react-oauth/google, HttpOnly cookie refresh token rotation with single-flight deduplication, in-memory Bearer access tokens, openapi-fetch middleware, and TanStack Query/Router. Use when adding Google Sign-In, auth state, token refresh, protected routes, or logout flows.
---

# NestJS Sandbox Google Authentication Workflow

This skill covers implementing end-to-end Google Sign-In and session management in this React 19 + Vite SPA against the `nestjs-sandbox` authentication API.

## Backend Auth Contract

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/google` | Public | Exchange a Google OIDC `id_token` (`RS256` JWT) for app tokens |
| `POST` | `/auth/refresh` | Public | Rotate a single-use refresh token (cookie or body) for a fresh token pair |
| `GET` | `/auth/me` | Bearer | Return the currently authenticated user (`AuthUserDto`) |
| `POST` | `/auth/logout` | Public | Revoke refresh token family, clear `refresh_token` cookie, and clear OIDC session |

### Key Token & Transport Rules

- **Google ID token only**: `POST /auth/google` verifies a Google-signed OIDC `id_token` (`RS256` JWT starting with `eyJ...`) whose `aud` matches `GOOGLE_CLIENT_ID` (or `GOOGLE_ALLOWED_CLIENT_IDS`). Never pass a raw `GOOGLE_CLIENT_ID` or an opaque Google OAuth `access_token` (`ya29...`).
- **Use `cookie` transport in this Web SPA**: Send `X-Auth-Transport: cookie` and `credentials: 'include'`. The backend returns `{ accessToken, expiresIn, user }` in JSON and stores the 30-day `refresh_token` in an `HttpOnly; SameSite=Lax; Path=/auth` cookie (`Secure` is added automatically when backend `APP_URL` is `https://`). Never manually set a `Cookie` header in browser JS.
- **In-memory `accessToken` only**: Access tokens are stateless 15-minute JWTs. Keep `accessToken` strictly in memory (never in `localStorage` or `sessionStorage`).
- **Single-use refresh token rotation**: Every `POST /auth/refresh` invalidates the previous refresh token. **Reusing an already-rotated token revokes the entire token family and returns `401`.** Always serialize refresh calls with a single-flight Promise mutex.

---

## Library Recommendation

### Recommended: `@react-oauth/google` (using `<GoogleLogin />`)

Use **`@react-oauth/google`** — the standard React wrapper over Google's official **Google Identity Services (GIS)** SDK (`https://accounts.google.com/gsi/client`):

- `<GoogleLogin />` runs Google's OpenID Connect (OIDC) sign-in flow (with FedCM support) and delivers `credentialResponse.credential`, which is the exact **Google `id_token` JWT** required by `POST /auth/google`.
- Automatically loads and cleans up the external GIS script with built-in TypeScript types.
- **Critical pitfall**: Do **not** use `useGoogleLogin()` in its default implicit mode — it returns a Google OAuth `access_token` (`ya29...`), which `POST /auth/google` rejects with `401 Invalid Google ID token`. Only use `<GoogleLogin />` (or `useGoogleOneTapLogin`) to obtain a Google `id_token`.
- **React 19 compatibility**: Works reliably at runtime in React 19 (it delegates rendering to Google's GIS script). `pnpm add @react-oauth/google` may print a peer-dependency warning if the installed version pins `react: ^18`; it is safe to ignore or silence via `pnpm.peerDependencyRules`.

### Zero-Dependency Alternative: Direct GIS Script + `@types/google.accounts`

If you want zero React wrapper dependencies or full low-level control over FedCM options (`google.accounts.id.initialize`, `renderButton`, `prompt`), load `<script src="https://accounts.google.com/gsi/client" async defer></script>` in `index.html` and install `pnpm add -D @types/google.accounts`.

### Avoid

- `react-google-login` (deprecated legacy `gapi` library).
- Heavy third-party auth SDKs (Auth0/Clerk/Firebase Auth) when `nestjs-sandbox` already owns token verification, rotation, and cookie sessions.

---

## Step 1: Configure Google Cloud Console & Environment Variables

1. In **Google Cloud Console → APIs & Services → Credentials**, open the Web OAuth 2.0 Client ID matching the backend's `GOOGLE_CLIENT_ID`.
2. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost` (recommended alongside the explicit port for local GIS/FedCM checks)
   - Your production `https://` origin (FedCM requires HTTPS outside `localhost`).
   *(Origin changes can take 5–15 minutes to propagate.)*
3. In this SPA's `.env` (never commit secrets; the Client ID is public, never expose `GOOGLE_CLIENT_SECRET`):
   ```env
   API_URL=<your-api-url>
   VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
   ```
4. Expose `API_URL` to browser code in `vite.config.ts` (by default Vite only exposes `VITE_*` variables) and declare its type in `src/vite-env.d.ts`:
   ```ts
   // vite.config.ts
   export default defineConfig({
     envPrefix: ['VITE_', 'API_URL'],
     // ...existing plugins and resolve config
   })
   ```
   ```ts
   // src/vite-env.d.ts
   /// <reference types="vite/client" />

   interface ImportMetaEnv {
     readonly API_URL: string
     readonly VITE_GOOGLE_CLIENT_ID: string
   }
   ```
5. In the `nestjs-sandbox` backend `.env`, ensure CORS allows the SPA origin:
   ```env
   CORS_ORIGINS=http://localhost:5173
   ```

---

## Step 2: Install `@react-oauth/google` and Mount the Provider

1. Install the package with `pnpm`:
   ```bash
   pnpm add @react-oauth/google
   ```
2. Wrap the app root in `src/main.tsx` with `<GoogleOAuthProvider>`:
   ```tsx
   import { GoogleOAuthProvider } from '@react-oauth/google'
   import { QueryClientProvider } from '@tanstack/react-query'
   import { RouterProvider } from '@tanstack/react-router'
   import { queryClient } from '@/lib/query-client'
   import { router } from '@/router'

   const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

   // Inside createRoot(...).render(...)
   <GoogleOAuthProvider clientId={googleClientId}>
     <QueryClientProvider client={queryClient}>
       <RouterProvider router={router} />
     </QueryClientProvider>
   </GoogleOAuthProvider>
   ```

---

## Step 3: Build In-Memory Token Store & Auth Middleware

Split the in-memory token store (`src/api/auth-token.ts`) from the `openapi-fetch` client (`src/api/client.ts`) and auth actions (`src/api/auth.ts`) to avoid circular imports.

Use a **single-flight Promise mutex** for `refreshAccessToken()` so concurrent `401`s or React 19 Strict Mode double-invocations never submit the same single-use `refresh_token` cookie twice.

### `src/api/auth-token.ts`

```ts
const API_BASE_URL = import.meta.env.API_URL

let accessToken: string | null = null
let refreshInFlight: Promise<string | null> | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
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
        headers: { 'X-Auth-Transport': 'cookie' },
      })

      if (!res.ok) {
        setAccessToken(null)
        return null
      }

      const data = (await res.json()) as { accessToken?: string }
      const nextToken = data.accessToken ?? null
      setAccessToken(nextToken)
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
```

### `src/api/client.ts` (`openapi-fetch` Middleware)

Attach `Authorization: Bearer <accessToken>` on outgoing requests, clone requests in `onRequest` so `POST`/`PATCH` bodies can be retried safely, and retry once on `401` after `refreshAccessToken()`:

```ts
import createClient, { type Middleware } from 'openapi-fetch'
import { getAccessToken, refreshAccessToken } from '@/api/auth-token'
import type { paths } from '@/api/schema'

const AUTH_SKIP_PATHS = new Set(['/auth/google', '/auth/refresh', '/auth/logout'])
const requestClones = new WeakMap<Request, Request>()

export const api = createClient<paths>({
  baseUrl: import.meta.env.API_URL,
  credentials: 'include',
})

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getAccessToken()
    if (token && !request.headers.has('Authorization')) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }

    const pathname = new URL(request.url).pathname
    if (!AUTH_SKIP_PATHS.has(pathname) && !request.headers.has('X-Auth-Retry')) {
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
      return response
    }

    cloned.headers.set('Authorization', `Bearer ${freshToken}`)
    cloned.headers.set('X-Auth-Retry', '1')
    return fetch(cloned)
  },
}

api.use(authMiddleware)
```

---

## Step 4: Auth Actions & TanStack Query Integration (`src/api/auth.ts`)

Reuse generated OpenAPI types from `src/api/types.ts` (see the `openapi-typescript-todo` skill: `AuthUser`, `GoogleAuthRequest`, `AccessTokenResponse`).

```ts
import { googleLogout } from '@react-oauth/google'
import { queryOptions } from '@tanstack/react-query'
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from '@/api/auth-token'
import { api } from '@/api/client'
import type { AuthUser } from '@/api/types'
import { queryClient } from '@/lib/query-client'

export const authMeQueryKey = ['auth', 'me'] as const

/**
 * Exchange a Google OIDC id_token (from <GoogleLogin /> credentialResponse.credential)
 * for an in-memory accessToken and an HttpOnly refresh_token cookie.
 */
export async function loginWithGoogleIdToken(
  idToken: string,
): Promise<AuthUser> {
  const { data, error } = await api.POST('/auth/google', {
    headers: { 'X-Auth-Transport': 'cookie' },
    body: { idToken },
  })

  if (error || !data) {
    throw new Error('Google sign-in failed')
  }

  setAccessToken(data.accessToken)
  queryClient.setQueryData<AuthUser | null>(authMeQueryKey, data.user)
  return data.user
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

  const { data, error } = await api.GET('/auth/me')
  if (error || !data) {
    return null
  }

  return data
}

export const authMeQueryOptions = queryOptions({
  queryKey: authMeQueryKey,
  queryFn: fetchCurrentUser,
  retry: false,
})

/**
 * Revoke the refresh token family, clear the HttpOnly cookie, and discard in-memory state.
 */
export async function logout(): Promise<void> {
  try {
    await api.POST('/auth/logout', {
      headers: { 'X-Auth-Transport': 'cookie' },
    })
  } finally {
    setAccessToken(null)
    googleLogout()
    queryClient.setQueryData<AuthUser | null>(authMeQueryKey, null)
    await queryClient.invalidateQueries({ queryKey: ['todos'] })
  }
}
```

> **Schema check**: Verify the exact generated request/response types of `POST /auth/google` and `POST /auth/logout` in `src/api/schema.d.ts` (for example whether `headers` / `body` are typed as optional when using cookie transport).

---

## Step 5: Render the Google Sign-In Button & Wire TanStack Router

### Google Sign-In Component

```tsx
import { type CredentialResponse, GoogleLogin } from '@react-oauth/google'
import { useMutation } from '@tanstack/react-query'
import { loginWithGoogleIdToken } from '@/api/auth'

export function GoogleSignInButton({ onSuccess }: { onSuccess?: () => void }) {
  const mutation = useMutation({
    mutationFn: loginWithGoogleIdToken,
    onSuccess: () => onSuccess?.(),
  })

  function handleCredentialSuccess(response: CredentialResponse) {
    if (!response.credential) {
      return
    }
    mutation.mutate(response.credential)
  }

  return (
    <div className="space-y-2">
      <GoogleLogin
        onSuccess={handleCredentialSuccess}
        onError={() => {
          console.error('Google Sign-In failed')
        }}
        use_fedcm_for_prompt
      />
      {mutation.isError ? (
        <p className="text-sm text-destructive">
          Sign-in failed. Please try again.
        </p>
      ) : null}
    </div>
  )
}
```

### Protecting Routes with TanStack Router `beforeLoad`

Prefetch `authMeQueryOptions` in a route's `beforeLoad` to guard authenticated routes and redirect unauthenticated users cleanly:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { authMeQueryOptions } from '@/api/auth'

export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.ensureQueryData(authMeQueryOptions)
    if (!user) {
      throw redirect({
        to: '/',
        search: { redirect: location.href },
      })
    }
  },
  component: ProfilePage,
})
```

---

## Validation Checklist

1. **Sign-in**: Click the Google Sign-In button → confirm `POST /auth/google` sends `{ idToken: "eyJ..." }` with `X-Auth-Transport: cookie`, returns `200`/`201`, and sets the `HttpOnly` `refresh_token` cookie (DevTools → **Application → Cookies → `<API_URL>` origin**).
2. **Session hydration**: Reload the page → confirm a **single** `POST /auth/refresh` call succeeds (even in React 19 Strict Mode) and `GET /auth/me` returns the user with `Authorization: Bearer ...`.
3. **Token refresh on expiry**: Let `accessToken` expire (or clear in-memory token) and invoke a protected endpoint → confirm one `POST /auth/refresh` rotates the cookie and retries the request once.
4. **Logout**: Call `logout()` → confirm `POST /auth/logout` returns `204 No Content`, clears `refresh_token` (`Max-Age=0`), clears in-memory `accessToken`, and subsequent `GET /auth/me` / page reloads stay logged out.
5. **Code quality**: Run `pnpm check && pnpm build`.

## Troubleshooting

- **`import.meta.env.API_URL` is `undefined` in the browser**: Confirm `API_URL` is set in `.env`, `envPrefix: ['VITE_', 'API_URL']` is configured in `vite.config.ts`, and restart `pnpm dev`.
- **`401 Invalid Google ID token`**: Ensure you used `<GoogleLogin />` (`credentialResponse.credential`, starting with `eyJ...`), not `useGoogleLogin()` (`ya29...`), and that `VITE_GOOGLE_CLIENT_ID` matches the backend's `GOOGLE_CLIENT_ID`.
- **Unexpected `401` right after refresh (token family revoked)**: Two concurrent `POST /auth/refresh` calls ran with the same single-use cookie (often triggered by React 19 Strict Mode or parallel queries). Ensure all refreshes share the single-flight `refreshInFlight` promise.
- **Cookie not stored or not sent on `/auth/refresh` / `/auth/logout`**: Confirm `credentials: 'include'` is set on the client, backend `CORS_ORIGINS` includes `http://localhost:5173` (not `*`), and you are not using different sites/ports that violate `SameSite=Lax`.
- **GIS / FedCM origin error on `localhost:5173`**: Add both `http://localhost:5173` and `http://localhost` to **Authorized JavaScript origins** in Google Cloud Console and wait 5–15 minutes for propagation.
- **`401 malformed token` on `GET /auth/me` or `/todos`**: Verify the `Authorization` header has a single `Bearer <accessToken>` prefix, no surrounding quotes, and uses `accessToken` (not `refreshToken`).
