'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'

const guestSchema = z.object({
  fullname: z.string().trim().min(2, 'Name is too short').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, 'Enter a 10-digit mobile number starting with 6-9'),
  email: z.string().trim().email('Enter a valid email').max(255),
  city: z.string().trim().min(1, 'City is required').max(50),
  special_requests: z.string().trim().max(500).optional(),
  preferred_language: z.enum(['en', 'mr']),
})

export type GuestFormData = z.infer<typeof guestSchema>

type Props = {
  locale: string
  onContinue: (data: GuestFormData) => void
}

export function GuestDetailsPanel({ locale, onContinue }: Props) {
  const t = useTranslations('booking')

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullname: '',
      phone: '',
      email: '',
      city: '',
      special_requests: '',
      preferred_language: locale === 'mr' ? 'mr' : 'en',
    },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onContinue)}
        className="space-y-4"
        noValidate
      >
        {/* Full Name */}
        <FormField
          control={form.control}
          name="fullname"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-xs font-bold uppercase tracking-wider">
                {t('fullName')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('fullNamePlaceholder')}
                  autoComplete="name"
                  className="h-11 border-border bg-background text-foreground text-sm font-medium"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mobile Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-xs font-bold uppercase tracking-wider">
                {t('mobileNumber')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <div className="flex">
                  <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-border bg-muted/60 px-3 text-sm font-bold text-muted-foreground">
                    +91
                  </span>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    autoComplete="tel"
                    className="h-11 flex-1 rounded-l-none border-border bg-background text-foreground text-sm font-medium"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-xs font-bold uppercase tracking-wider">
                {t('email')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="devotee@example.com"
                  autoComplete="email"
                  className="h-11 border-border bg-background text-foreground text-sm font-medium"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City / Native Village */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-xs font-bold uppercase tracking-wider">
                {t('city')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('cityPlaceholder')}
                  autoComplete="address-level2"
                  className="h-11 border-border bg-background text-foreground text-sm font-medium"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Special Requests */}
        <FormField
          control={form.control}
          name="special_requests"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-xs font-bold uppercase tracking-wider">
                {t('specialRequests')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder={t('specialRequestsPlaceholder')}
                  className="border-border bg-background text-foreground text-sm font-medium resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <input type="hidden" {...form.register('preferred_language')} />

        <button
          type="submit"
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99]"
        >
          {t('continue')}
        </button>
      </form>
    </Form>
  )
}
