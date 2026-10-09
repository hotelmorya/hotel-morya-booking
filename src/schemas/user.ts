import { z } from 'zod'

import { indianPhone } from './shared'

export const userRoleSchema = z.enum([
  'super_admin',
  'admin',
  'manager',
  'receptionist',
  'housekeeping',
])

export type UserRole = z.infer<typeof userRoleSchema>

export const userSchema = z.object({
  fullname: z.string().trim().min(2, 'Name is too short').max(100),
  // Optional — accept a blank field (empty input registers as "") as well as
  // a valid 10-digit number. The action normalises "" → null before insert.
  phone: indianPhone.optional().or(z.literal('')),
  role: userRoleSchema.exclude(['super_admin']), // super_admin is created via SQL only, never from the UI
  is_active: z.boolean().default(true),
})

export type UserInput = z.infer<typeof userSchema>

// Creating a new staff user adds email + temp password. Lives here (not in the
// 'use server' actions file) because a 'use server' module may only export
// async functions — exporting a schema from there breaks zodResolver on the client.
export const createUserSchema = userSchema.extend({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// z.input so the form/action accept raw data before Zod defaults run.
export type CreateUserInput = z.input<typeof createUserSchema>

// Editing an existing staff member — profile fields only. Email + password are
// auth concerns handled separately; is_active is toggled via its own action.
export const updateUserSchema = z.object({
  fullname: z.string().trim().min(2, 'Name is too short').max(100),
  phone: indianPhone.optional().or(z.literal('')),
  role: userRoleSchema.exclude(['super_admin']),
})

export type UpdateUserInput = z.input<typeof updateUserSchema>

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Self-service "Forgot password?" — just the email to send a recovery link to.
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// Setting a new password after following a recovery link.
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>
