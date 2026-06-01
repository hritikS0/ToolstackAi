import { z } from "zod";

export const createMemorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  category: z.enum(["Identity", "Preferences", "Projects", "Goals", "Skills", "Work", "Personal"]),
  importance: z.number().int().min(1).max(5).default(1),
  confidence: z.number().min(0).max(1).default(1.0),
  source: z.string().optional(),
});

export const updateMemorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  category: z.enum(["Identity", "Preferences", "Projects", "Goals", "Skills", "Work", "Personal"]).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  confidence: z.number().min(0).max(1).optional(),
  pinned: z.boolean().optional(),
  source: z.string().optional(),
});

export const memoryQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["newest", "oldest", "importance"]).optional().default("newest"),
  pinned: z.coerce.boolean().optional(),
});

export const updateBrainSettingsSchema = z.object({
  memoryEnabled: z.boolean().optional(),
  autoExtract: z.boolean().optional(),
  allowUpdates: z.boolean().optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
});
