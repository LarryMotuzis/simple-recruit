import { z } from './zod.js';

export const idParamSchema = z.object({ id: z.string().uuid() });

export const roleSchema = z.enum(['admin', 'head_coach', 'assistant', 'viewer']);

export const userSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string(),
    role: roleSchema,
  })
  .openapi('User');
