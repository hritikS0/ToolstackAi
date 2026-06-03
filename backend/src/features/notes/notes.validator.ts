import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});

export const updateNoteSchema = createNoteSchema.partial();

export const noteIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
