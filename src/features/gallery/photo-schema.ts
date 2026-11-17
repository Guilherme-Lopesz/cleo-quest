import { z } from 'zod';

/** Manifesto de fotos (SAD §11.2). Validado no build e no script de importação. */
export const PhotoSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id deve ser slug'),
  src: z.string().min(1),
  thumbnail: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(3, 'alt obrigatório'),
  caption: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'data no formato AAAA-MM ou AAAA-MM-DD')
    .optional(),
  phase: z.string().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().optional(),
  /** Ilustração gerada para desenvolvimento, a ser substituída por foto real. */
  placeholder: z.boolean().optional(),
});
export type Photo = z.infer<typeof PhotoSchema>;

export const PhotoManifestSchema = z.array(PhotoSchema).superRefine((photos, ctx) => {
  const seen = new Set<string>();
  photos.forEach((p, i) => {
    if (seen.has(p.id))
      ctx.addIssue({ code: 'custom', message: `id duplicado: ${p.id}`, path: [i, 'id'] });
    seen.add(p.id);
  });
});

export function parseManifest(input: unknown): Photo[] {
  return PhotoManifestSchema.parse(input);
}

export function sortByDate(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}
