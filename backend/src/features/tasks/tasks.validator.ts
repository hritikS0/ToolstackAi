import { z } from "zod";

const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
const statusEnum = z.enum(["todo", "in-progress", "done", "archived"]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: priorityEnum.default("medium"),
  status: statusEnum.optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
