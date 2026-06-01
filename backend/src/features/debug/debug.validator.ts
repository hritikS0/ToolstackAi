import { z } from "zod";

export const debugSchema = z.object({
  code: z.string().min(1, "Code is required").max(50000, "Code too long"),
  language: z.string().min(1, "Language is required"),
});
