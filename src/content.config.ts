import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const timeline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/timeline' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int(),
    phase: z.string(),
    period: z.string(),
    photos: z.array(z.string()).default([]),
    caption: z.string().optional(),
    /** Marco com recompensa única ao ser explorado (Mestre §5.2). */
    milestone: z.boolean().default(false),
  }),
});

const diary = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/diary' }),
  schema: z.object({
    title: z.string(),
    date: z.string().optional(),
    photo: z.string().optional(),
    mood: z.enum(['feliz', 'curiosa', 'indignada', 'sonolenta', 'exigente']).default('curiosa'),
  }),
});

const museum = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/museum' }),
  schema: z.object({
    name: z.string(),
    period: z.string(),
    photo: z.string().optional(),
    order: z.number().int().default(0),
  }),
});

export const collections = { timeline, diary, museum };
