import { z } from "zod";

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.string().optional(),
  projectId: z.string().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  targetDate: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().optional(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "completed"]).optional(),
  order: z.number().optional(),
});
