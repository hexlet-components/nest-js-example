import { z } from "zod";
export const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .url()
    .refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://")),
  JWT_SECRET: z.string().min(32),
});
