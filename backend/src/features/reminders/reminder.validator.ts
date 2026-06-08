import { z } from "zod";

export const createReminderSchema = z.object({
  title: z.string().min(1),
  message: z.string().optional(),
  remindAt: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date"),
  frequency: z.enum(["once", "daily", "weekly"]).optional().default("once"),
});

export const updateReminderSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().optional(),
  remindAt: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date").optional(),
  frequency: z.enum(["once", "daily", "weekly"]).optional(),
  enabled: z.boolean().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
