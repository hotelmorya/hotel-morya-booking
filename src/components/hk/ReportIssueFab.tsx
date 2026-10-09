'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { SideDrawer } from '@/components/shared/side-drawer'
import { reportIssueSchema, type ReportIssueInput } from '@/schemas/maintenance'
import { useReportIssue, type HkRoom } from '@/hooks/use-housekeeping'
import { currentDateIST } from '@/lib/format'

type Props = {
  availableRooms: HkRoom[]
  defaultRoomId?: string
  defaultRoomNumber?: string
}

export function ReportIssueFab({ availableRooms, defaultRoomId }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useReportIssue()

  const form = useForm<ReportIssueInput>({
    resolver: zodResolver(reportIssueSchema),
    defaultValues: {
      room_id: defaultRoomId ?? availableRooms[0]?.id ?? '',
      reason: '',
      from_date: currentDateIST(),
      to_date: currentDateIST(),
    },
  })

  async function onSubmit(values: ReportIssueInput) {
    try {
      await mutation.mutateAsync(values)
      toast.success('Issue reported')
      setOpen(false)
      form.reset({
        ...form.formState.defaultValues,
        from_date: currentDateIST(),
        to_date: currentDateIST(),
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to report issue')
    }
  }

  return (
    <>
      {/* FAB — sits above mobile bottom bar (bottom-20) on small screens, bottom-6 on desktop */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg transition-transform hover:bg-accent-700 active:scale-95 lg:bottom-6 lg:right-6"
        aria-label="Report maintenance issue"
      >
        <IconAlertTriangle className="h-6 w-6" />
      </button>

      <SideDrawer
        open={open}
        onClose={setOpen}
        title="Report issue"
        description="Room number, issue type, and description"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Room select */}
            <FormField
              control={form.control}
              name="room_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <FormControl>
                    {availableRooms.length > 0 ? (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              Room {r.room_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        {...field}
                        placeholder="No rooms in queue — start a cleaning task first"
                        className="h-11 text-muted-foreground"
                        disabled
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v || undefined)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="cleaning">Cleaning supplies</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the issue in detail..."
                      rows={4}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo URL */}
            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo link (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="url"
                      placeholder="https://..."
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Until date */}
            <FormField
              control={form.control}
              name="to_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Until (estimated)</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden from_date */}
            <input type="hidden" {...form.register('from_date')} />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={() => {
                  setOpen(false)
                  form.reset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 flex-1 bg-accent-500 text-white hover:bg-accent-700"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Submitting...' : 'Report issue'}
              </Button>
            </div>
          </form>
        </Form>
      </SideDrawer>
    </>
  )
}
