import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z
    .string()
    .min(3, "Min 3 characters")
    .max(24, "Max 24 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and _"),
  password: z.string().min(6, "Min 6 characters").max(72),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter password"),
});

export const videoMetaSchema = z.object({
  title: z.string().min(3, "Title too short").max(120),
  description: z.string().max(2000).optional().default(""),
  category: z.string().min(1).max(40).default("General"),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PUBLIC"),
  madeForKids: z.boolean().optional().default(false),
  ageRestricted: z.boolean().optional().default(false),
  aiGenerated: z.boolean().optional().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
  premiere: z.boolean().optional().default(false),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Empty comment").max(1000),
  parentId: z.string().optional().nullable(),
});

export const playlistSchema = z.object({
  title: z.string().min(2, "Title too short").max(80),
  description: z.string().max(500).optional().default(""),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PRIVATE"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
