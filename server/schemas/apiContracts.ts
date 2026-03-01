import { z } from "zod";

/** Schema for POST /api/posts/:id/comment */
export const insertCommentSchema = z.object({
  content: z.string().min(1, "El comentario no puede estar vacío").max(1000, "El comentario no puede exceder 1000 caracteres"),
  parent_id: z.string().uuid("Formato de UUID inválido para parent_id").optional().nullable(),
  client_id: z.string().uuid("Formato de UUID inválido para client_id").optional().nullable(),
});

export type InsertCommentType = z.infer<typeof insertCommentSchema>;
