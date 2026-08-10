import { z } from "zod";

export const createPomodoroSessionSchema = z.object({
  mode: z.enum(["focus", "shortBreak", "longBreak"]).default("focus"),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationSeconds: z.number().int().positive(),
});

export const listPomodoroSessionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
