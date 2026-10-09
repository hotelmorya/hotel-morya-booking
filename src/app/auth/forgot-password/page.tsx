'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { requestPasswordReset } from '@/lib/actions/users'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/user'

function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null)
    // Sends a hotel-branded reset email via Resend (never Supabase). Always
    // resolves to success so we don't reveal whether the account exists.
    const result = await requestPasswordReset(values)
    if (!result.success) {
      setFormError(result.error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded border border-success/40 bg-success/5 px-3 py-3 text-small text-success"
        >
          If an account exists for that email, we&apos;ve sent a link to reset
          the password. Check the inbox (and spam folder).
        </p>
        <a
          href="/auth/login"
          className="inline-block text-small font-medium text-accent-700 hover:text-accent-900"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-small text-text-secondary">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-label font-medium uppercase text-text-tertiary"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="h-9 w-full rounded border border-border-emphasis bg-bg px-3 text-body text-text-primary placeholder:text-text-disabled focus:ring-focus"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-small text-danger">{errors.email.message}</p>
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
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>

      <a
        href="/auth/login"
        className="block text-center text-small font-medium text-accent-700 hover:text-accent-900"
      >
        Back to sign in
      </a>
    </form>
  )
}

export default function ForgotPasswordPage() {
  const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-xl border-hairline border-border bg-surface-1 p-6 sm:p-8">
        <div className="mb-6 space-y-1">
          <p className="text-micro font-medium uppercase text-text-tertiary">
            {hotelName}
          </p>
          <h1 className="text-page font-medium text-text-primary">
            Reset password
          </h1>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
