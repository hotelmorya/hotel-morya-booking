'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  IconCheck,
  IconCopy,
  IconKey,
  IconPlus,
  IconPencil,
  IconUserOff,
  IconUserCheck,
  IconX,
} from '@tabler/icons-react'
import { useEffect, useState, useTransition } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createStaffUser,
  generatePasswordResetLink,
  toggleUserActive,
  updateStaffUser,
} from '@/lib/actions/users'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/schemas/user'
import type { Tables } from '@/types/database'

type UserRow = Tables<'users'>
// Email is resolved from auth.users on the server and merged into each row.
export type StaffUserRow = UserRow & { email: string | null }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  receptionist: 'Receptionist',
  housekeeping: 'Housekeeping',
}

const ROLE_PILL_CLASSES: Record<string, string> = {
  admin: 'bg-accent-50 text-accent-700 border border-accent-100',
  manager: 'bg-[#dbeafe] text-[#1e40af]',
  receptionist: 'bg-[#f3e8ff] text-[#6b21a8]',
  housekeeping: 'bg-[#fef3c7] text-[#92400e]',
}

function RolePill({ role }: { role: string }) {
  const classes = ROLE_PILL_CLASSES[role] ?? 'bg-surface-2 text-text-secondary'
  return (
    <span className={`pill ${classes}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Staff Dialog — uses shadcn Dialog + Input primitives
// NOTE: The role <select> is kept as native — it uses register() directly and
// converting to Base UI Select would require a Controller<string> refactor
// that adds risk without benefit here. It is styled with inputCls.
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  'h-9 w-full rounded border border-border bg-surface-1 px-3 text-body text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-[3px] focus:ring-accent-50 focus:border-accent-500'

function AddStaffDialogContent({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'receptionist',
      is_active: true,
    },
  })

  const onSubmit: SubmitHandler<CreateUserInput> = async (data) => {
    setServerError(null)
    const result = await createStaffUser(data)
    if (result.success) {
      onSuccess()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Full name */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Full name <span className="text-danger">*</span>
        </label>
        <Input
          type="text"
          {...register('fullname')}
          placeholder="Priya Sharma"
        />
        {errors.fullname && (
          <p className="mt-1 text-small text-danger">{errors.fullname.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Email <span className="text-danger">*</span>
        </label>
        <Input
          type="email"
          {...register('email')}
          placeholder="priya@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-small text-danger">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Phone (optional)
        </label>
        <Input
          type="tel"
          {...register('phone')}
          placeholder="9876543210"
        />
        {errors.phone && (
          <p className="mt-1 text-small text-danger">{errors.phone.message}</p>
        )}
      </div>

      {/* Role — kept as native <select>; see comment above */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Role <span className="text-danger">*</span>
        </label>
        <select {...register('role')} className={inputCls}>
          <option value="admin">Admin (hotel owner)</option>
          <option value="manager">Manager</option>
          <option value="receptionist">Receptionist</option>
          <option value="housekeeping">Housekeeping</option>
        </select>
        {errors.role && (
          <p className="mt-1 text-small text-danger">{errors.role.message}</p>
        )}
      </div>

      {/* Temp password */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Temporary password <span className="text-danger">*</span>
        </label>
        <Input
          type="password"
          {...register('password')}
          placeholder="Min 8 characters"
          autoComplete="new-password"
        />
        <p className="mt-1 text-small text-text-tertiary">
          Ask staff to change this after first login.
        </p>
        {errors.password && (
          <p className="mt-1 text-small text-danger">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
          <IconX size={14} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-accent-500 hover:bg-accent-700"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Staff Dialog — profile fields only (no email/password change here)
// ─────────────────────────────────────────────────────────────────────────────

function EditStaffDialogContent({
  user,
  isSelf,
  onClose,
  onSuccess,
}: {
  user: UserRow
  isSelf: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullname: user.fullname,
      phone: user.phone ?? '',
      role: user.role as UpdateUserInput['role'],
    },
  })

  const onSubmit: SubmitHandler<UpdateUserInput> = async (data) => {
    setServerError(null)
    const result = await updateStaffUser(user.id, data)
    if (result.success) {
      onSuccess()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Full name */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Full name <span className="text-danger">*</span>
        </label>
        <Input type="text" {...register('fullname')} placeholder="Priya Sharma" />
        {errors.fullname && (
          <p className="mt-1 text-small text-danger">{errors.fullname.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Phone (optional)
        </label>
        <Input type="tel" {...register('phone')} placeholder="9876543210" />
        {errors.phone && (
          <p className="mt-1 text-small text-danger">{errors.phone.message}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label className="mb-1.5 block text-small font-medium text-text-secondary">
          Role <span className="text-danger">*</span>
        </label>
        <select {...register('role')} className={inputCls} disabled={isSelf}>
          <option value="admin">Admin (hotel owner)</option>
          <option value="manager">Manager</option>
          <option value="receptionist">Receptionist</option>
          <option value="housekeeping">Housekeeping</option>
        </select>
        {isSelf && (
          <p className="mt-1 text-small text-text-tertiary">
            You can&apos;t change your own role.
          </p>
        )}
        {errors.role && (
          <p className="mt-1 text-small text-danger">{errors.role.message}</p>
        )}
      </div>

      {serverError && (
        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
          <IconX size={14} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-accent-500 hover:bg-accent-700"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset Password Dialog — generates a one-time recovery link the admin copies
// and sends to the staff member (e.g. via WhatsApp). No email/SMTP dependency.
// ─────────────────────────────────────────────────────────────────────────────

function ResetPasswordDialogContent({
  user,
  onClose,
}: {
  user: StaffUserRow
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    generatePasswordResetLink(user.id).then((result) => {
      if (!active) return
      if (result.success) setLink(result.link)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user.id])

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy — select the link and copy it manually.')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-small text-text-secondary">
        Send this one-time link to <strong>{user.fullname}</strong>
        {user.email ? ` (${user.email})` : ''}. Opening it lets them set a new
        password. The link is single-use and expires in about 1 hour.
      </p>

      {loading && (
        <p className="text-small text-text-tertiary">Generating link…</p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
          <IconX size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {link && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-small"
            />
            <Button
              type="button"
              variant="outline"
              onClick={copy}
              className="shrink-0"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-small text-text-tertiary">
            Tip: paste it into WhatsApp or SMS to the staff member.
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main table
// ─────────────────────────────────────────────────────────────────────────────

interface StaffUsersTableProps {
  users: StaffUserRow[]
  currentUserId: string
}

export function StaffUsersTable({ users, currentUserId }: StaffUsersTableProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUserRow | null>(null)
  const [resettingUser, setResettingUser] = useState<StaffUserRow | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [toggleSuccess, setToggleSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Optimistic local state
  const [localUsers, setLocalUsers] = useState<StaffUserRow[]>(users)

  function handleToggleActive(userId: string, current: boolean) {
    setToggleError(null)
    const nextActive = !current
    // Optimistic update
    setLocalUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: nextActive } : u))
    )

    startTransition(async () => {
      const result = await toggleUserActive(userId, nextActive)
      if (!result.success) {
        // Roll back
        setLocalUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: current } : u))
        )
        setToggleError(result.error)
      } else {
        setToggleSuccess(nextActive ? 'Account activated' : 'Account deactivated')
        setTimeout(() => setToggleSuccess(null), 3000)
      }
    })
  }

  function handleAddSuccess() {
    setShowAddDialog(false)
    // Reload to get fresh data — in a real app we'd revalidate via router.refresh()
    window.location.reload()
  }

  function handleEditSuccess() {
    setEditingUser(null)
    window.location.reload()
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-small text-text-secondary">
              {localUsers.length} staff member{localUsers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="bg-accent-500 hover:bg-accent-700"
          >
            <IconPlus size={16} />
            Add staff
          </Button>
        </div>

        {/* Feedback banners */}
        {toggleError && (
          <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger/5 px-4 py-3 text-small text-danger">
            <IconX size={14} className="shrink-0 mt-0.5" />
            {toggleError}
          </div>
        )}
        {toggleSuccess && (
          <div className="flex items-center gap-2 rounded border border-success/40 bg-success/5 px-4 py-2 text-small text-success">
            <IconCheck size={14} />
            {toggleSuccess}
          </div>
        )}

        {localUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded border border-border bg-surface-1 py-12 text-center">
            <p className="text-body text-text-secondary">No staff members yet.</p>
            <Button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="bg-accent-500 hover:bg-accent-700"
            >
              <IconPlus size={16} />
              Add first staff member
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table — shadcn Table family */}
            <div className="hidden sm:block overflow-x-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-1">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Name
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Email
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Phone
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Role
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                      Added
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localUsers.map((user) => (
                    <TableRow key={user.id} className="bg-bg hover:bg-surface-1 transition-colors">
                      <TableCell className="font-medium text-text-primary">
                        {user.fullname}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-[11px] text-text-tertiary">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {user.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {user.phone ?? '—'}
                      </TableCell>
                      <TableCell>
                        <RolePill role={user.role} />
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <span className="pill bg-[#dcfce7] text-[#14532d]">Active</span>
                        ) : (
                          <span className="pill bg-surface-2 text-text-tertiary">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell className="text-text-tertiary text-small">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingUser(user)}
                            title="Edit"
                            aria-label={`Edit ${user.fullname}`}
                          >
                            <IconPencil size={15} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setResettingUser(user)}
                            title="Reset password"
                            aria-label={`Reset password for ${user.fullname}`}
                          >
                            <IconKey size={15} />
                          </Button>
                          {user.id !== currentUserId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={isPending}
                              onClick={() => handleToggleActive(user.id, user.is_active ?? true)}
                              title={user.is_active ? 'Deactivate' : 'Reactivate'}
                              aria-label={`${user.is_active ? 'Deactivate' : 'Reactivate'} ${user.fullname}`}
                            >
                              {user.is_active ? (
                                <>
                                  <IconUserOff size={15} />
                                </>
                              ) : (
                                <>
                                  <IconUserCheck size={15} />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="space-y-2 sm:hidden">
              {localUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded border border-border bg-surface-1 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {user.fullname}
                        {user.id === currentUserId && (
                          <span className="ml-1 text-small text-text-tertiary">(you)</span>
                        )}
                      </p>
                      {user.email && (
                        <p className="text-small text-text-secondary break-all">{user.email}</p>
                      )}
                      {user.phone && (
                        <p className="text-small text-text-secondary">{user.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <RolePill role={user.role} />
                      {user.is_active ? (
                        <span className="pill bg-[#dcfce7] text-[#14532d]">Active</span>
                      ) : (
                        <span className="pill bg-surface-2 text-text-tertiary">Inactive</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                    >
                      <IconPencil size={13} />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setResettingUser(user)}
                    >
                      <IconKey size={13} />
                      Reset password
                    </Button>
                    {user.id !== currentUserId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleActive(user.id, user.is_active ?? true)}
                      >
                        {user.is_active ? (
                          <>
                            <IconUserOff size={13} />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <IconUserCheck size={13} />
                            Reactivate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add staff dialog — shadcn Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-full max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <AddStaffDialogContent
            onClose={() => setShowAddDialog(false)}
            onSuccess={handleAddSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Edit staff dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="w-full max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit staff member</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <EditStaffDialogContent
              user={editingUser}
              isSelf={editingUser.id === currentUserId}
              onClose={() => setEditingUser(null)}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={!!resettingUser}
        onOpenChange={(open) => !open && setResettingUser(null)}
      >
        <DialogContent className="w-full max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          {resettingUser && (
            <ResetPasswordDialogContent
              user={resettingUser}
              onClose={() => setResettingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
