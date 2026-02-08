import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const games = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    players: z.object({
      min: z.number(),
      max: z.number(),
    }),
    duration: z.string(),
    age: z.number(),
    categories: z.array(z.string()),
    difficulty: z.enum(['facile', 'moyen', 'difficile']),
    officialRulesUrl: z.string().url().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { games };
