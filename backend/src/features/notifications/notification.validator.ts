import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  reminderNotifications: z.boolean().optional(),
  taskNotifications: z.boolean().optional(),
  goalNotifications: z.boolean().optional(),
  habitNotifications: z.boolean().optional(),
  browserNotifications: z.boolean().optional(),
  dailyBriefingEnabled: z.boolean().optional(),
  dailyBriefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
