import { z } from "zod";

export const createHabitSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  targetCount: z.string().optional(),
  projectId: z.string().optional(),
});

export const updateHabitSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  targetCount: z.string().optional(),
  active: z.boolean().optional(),
});
