import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const issues = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./content/issues" }),
  schema: z.object({
    slug: z.string().regex(/^\d{4}-\d{2}$/, "Slug YYYY-MM olmalı"),
    title: z.string(),
    issueNumber: z.number().int().positive(),
    publishedAt: z.coerce.date(),
    summary: z.string(),
    editors: z.array(z.string()).default([]),
    students: z.array(z.string()).default([]),
    highlights: z.array(z.string()).default([]),
    r2Key: z.string(),
    pdfBytes: z.number().int().positive().optional(),
    pages: z.number().int().positive().optional(),
  }),
});

export const collections = { issues };
