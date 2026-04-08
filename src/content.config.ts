import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/products' }),
  schema: z.object({
    category: z.string(),
    title: z.string(),
    pageTitle: z.string(),
    description: z.string(),
    items: z.array(
      z.object({
        name: z.string(),
        specs: z.string(),
        image: z.string().optional(),
        alt: z.string().optional(),
        badge: z.enum(['sil4', 'new', 'none']).default('none'),
        partner: z.string().optional(),
        detailDescription: z.string().optional(),
      }),
    ),
  }),
});

export const collections = { products };
