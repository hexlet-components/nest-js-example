import { z } from "zod";
export const idSchema = z.object({ id: z.uuid() });
export const projectIdSchema = z.object({ projectId: z.uuid() });
export const nestedIdSchema = z.object({ projectId: z.uuid(), id: z.uuid() });
export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(2000).default(""),
  status: z.enum(["todo", "done"]).default("todo"),
  projectId: z.uuid(),
});
export const updateTaskSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(["todo", "done"]).optional(),
    projectId: z.uuid().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const nestedTaskSchema = createTaskSchema.omit({ projectId: true });
export const createProjectSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).default(""),
});
export const updateProjectSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
export const searchSchema = z.strictObject({
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["todo", "done"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export const registrationSchema = z.strictObject({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});
export const loginSchema = registrationSchema;
export const publicUserSchema = z.object({ id: z.uuid(), email: z.email() });
export const publicProjectSchema = z.object({ ...createProjectSchema.shape, id: z.uuid() });
export const publicTaskSchema = z.object({ ...createTaskSchema.shape, id: z.uuid() });
export type CreateTask = z.output<typeof createTaskSchema>;
export type UpdateTask = z.output<typeof updateTaskSchema>;
export type CreateProject = z.output<typeof createProjectSchema>;
export type UpdateProject = z.output<typeof updateProjectSchema>;
export type Search = z.output<typeof searchSchema>;
export type Credentials = z.output<typeof registrationSchema>;

export const problemDetailsSchema = z.object({
  type: z.literal("about:blank"),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string(),
  instance: z.string(),
  requestId: z.uuid(),
});
export type ProblemDetails = z.output<typeof problemDetailsSchema>;
