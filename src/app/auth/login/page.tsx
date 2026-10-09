'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'

import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/schemas/user'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error || !data.user) {
      setFormError('Incorrect email or password.')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('auth_user_id', data.user.id)
      .single()

    if (!profile || profile.is_active === false) {
      await supabase.auth.signOut()
      setFormError(
        profile
          ? 'This account has been deactivated. Contact the hotel admin.'
          : 'This account is not set up for staff access. Contact the hotel admin.'
      )
      return
    }

    if (profile.role === 'housekeeping') {
      router.replace('/admin/housekeeping')
      return
    }

    const next = searchParams.get('next')
    router.replace(next && next.startsWith('/admin') ? next : '/admin')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {resetSuccess && (
        <p
          role="status"
          className="rounded border border-success/40 bg-success/5 px-3 py-2 text-small text-success"
        >
          Password updated. Sign in with your new password.
        </p>
      )}
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

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-label font-medium uppercase text-text-tertiary"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="h-9 w-full rounded border border-border-emphasis bg-bg pl-3 pr-10 text-body text-text-primary placeholder:text-text-disabled focus:ring-focus"
            placeholder="••••••••"
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
        <div className="pt-0.5 text-right">
          <a
            href="/auth/forgot-password"
            className="text-small font-medium text-accent-700 hover:text-accent-900"
          >
            Forgot password?
          </a>
        </div>
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
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  const hotelName = process.env.NEXT_PUBLIC_HOTEL_NAME ?? 'Hotel Morya Lodging'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-xl border-hairline border-border bg-surface-1 p-6 sm:p-8">
        <div className="mb-6 space-y-1">
          <p className="text-micro font-medium uppercase text-text-tertiary">
            Staff login
          </p>
          <h1 className="text-page font-medium text-text-primary">
            {hotelName}
          </h1>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
