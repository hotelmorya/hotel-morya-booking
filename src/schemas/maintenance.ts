import { z } from 'zod'
import { uuidLike } from './shared'

export const reportIssueSchema = z.object({
  room_id: uuidLike,
  reason: z.string().min(5).max(255),
  category: z
    .enum(['electrical', 'plumbing', 'furniture', 'cleaning', 'other'])
    .optional(),
  photo_url: z.string().url().optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // IST date YYYY-MM-DD
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type ReportIssueInput = z.infer<typeof reportIssueSchema>
