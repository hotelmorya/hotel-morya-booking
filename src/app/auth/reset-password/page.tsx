'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordInput } from '@/schemas/user'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [linkError, setLinkError] = useState(
    searchParams.get('error') === 'invalid'
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // A valid recovery link gives us a session — either already set in cookies by
  // /auth/confirm, or picked up from the URL (?code=) by the browser client.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true)
        setLinkError(false)
        setChecking(false)
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true)
      setChecking(false)
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null)
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })
    if (error) {
      setFormError(error.message)
      return
    }
    // Sign out so they log in fresh with the new password.
    await supabase.auth.signOut()
    setDone(true)
    setTimeout(() => router.replace('/auth/login?reset=success'), 1800)
  }

  if (done) {
    return (
      <p
        role="status"
        className="rounded border border-success/40 bg-success/5 px-3 py-3 text-small text-success"
      >
        Password updated. Redirecting you to sign in…
      </p>
    )
  }

  if (checking) {
    return <p className="text-small text-text-tertiary">Verifying your link…</p>
  }

  if (!hasSession || linkError) {
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="rounded border border-booking-cancelled-border bg-booking-cancelled-bg px-3 py-2 text-small text-booking-cancelled-text"
        >
          This password reset link is invalid or has expired.
        </p>
        <a
          href="/auth/forgot-password"
          className="inline-block text-small font-medium text-accent-700 hover:text-accent-900"
        >
          Request a new link
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-label font-medium uppercase text-text-tertiary"
        >
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="h-9 w-full rounded border border-border-emphasis bg-bg pl-3 pr-10 text-body text-text-primary placeholder:text-text-disabled focus:ring-focus"
            placeholder="Min 8 characters"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-focus"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-small text-danger">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm"
          className="block text-label font-medium uppercase text-text-tertiary"
        >
          Confirm password
        </label>
        <input
          id="confirm"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          className="h-9 w-full rounded border border-border-emphasis bg-bg px-3 text-body text-text-primary placeholder:text-text-disabled focus:ring-focus"
          placeholder="Re-enter password"
          {...register('confirm')}
        />
        {errors.confirm && (
          <p className="text-small text-danger">{errors.confirm.message}</p>
        )}
      </div>

      {formError && (
        <p
          role="alert"
          className="rounded border border-booking-cancelled-border bg-booking-cancelled-bg px-3 py-2 text-small text-booking-cancelled-text"
        >
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-10 w-full rounded bg-accent-500 text-subsection font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-xl border-hairline border-border bg-surface-1 p-6 sm:p-8">
        <div className="mb-6 space-y-1">
          <p className="text-micro font-medium uppercase text-text-tertiary">
            {hotelName}
          </p>
          <h1 className="text-page font-medium text-text-primary">
            Set a new password
          </h1>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
