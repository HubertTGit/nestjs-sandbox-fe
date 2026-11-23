import { type CredentialResponse, GoogleLogin } from '@react-oauth/google'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { loginWithGoogleIdToken } from '@/api/auth'
import type { AuthUser } from '@/api/types'
import { useTheme } from '@/providers/theme-provider'

interface GoogleSignInButtonProps {
  onSuccess?: (user: AuthUser) => void
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const { resolvedTheme } = useTheme()
  const [gsiError, setGsiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: loginWithGoogleIdToken,
    onSuccess: (user) => {
      setGsiError(null)
      onSuccess?.(user)
    },
  })

  if (!googleClientId) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
      >
        Missing <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in{' '}
        <code className="font-mono">.env</code>. Add your Web OAuth 2.0 Client
        ID and restart the dev server to enable Google Sign-In.
      </div>
    )
  }

  function handleCredentialSuccess(response: CredentialResponse) {
    if (!response.credential) {
      setGsiError('Google did not return an ID token. Please try again.')
      return
    }

    setGsiError(null)
    mutation.mutate(response.credential)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <GoogleLogin
          key={resolvedTheme}
          theme={resolvedTheme === 'dark' ? 'filled_black' : 'outline'}
          shape="rectangular"
          size="large"
          onSuccess={handleCredentialSuccess}
          onError={() => {
            setGsiError('Google Sign-In failed. Please try again.')
          }}
          use_fedcm_for_prompt
        />
        {mutation.isPending ? (
          <span className="text-sm text-muted-foreground">Signing in…</span>
        ) : null}
      </div>

      {gsiError ? (
        <p role="alert" className="text-sm text-destructive">
          {gsiError}
        </p>
      ) : null}

      {mutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Sign-in failed. Please try again.
        </p>
      ) : null}
    </div>
  )
}
