import {z} from "zod"

export const coversationSchema = z.object({
     title: z.string().optional(),
     userId : z.string().optional()
})

export const messageSchema = z.object({
     message:z.string().min(2).max(1000),
     conversationId : z.string().min(1),
     userId : z.string().optional()
})
export const getMessageSchema = z.object({
     userId : z.string().optional()
})