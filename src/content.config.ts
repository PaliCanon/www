import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { contentDir } from './lib/content-dir';
import { blogSchema, pageSchema, sectionSchema } from './lib/schema';

// The files are read where the author keeps them: content/<lang>/<page>.md and
// content/<lang>/blog/<post>.md. The id is the path without extension
// (`fr/about`, `vi/blog/welcome`): the language is its first folder and the
// rest is the translation key.
const base = contentDir();
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

export const collections = {
  pages: defineCollection({
    loader: glob({ pattern: '*/*.md', base, generateId }),
    schema: pageSchema,
  }),
  // The four sections of the home page: content/<lang>/home/<section>.md.
  home: defineCollection({
    loader: glob({ pattern: '*/home/*.md', base, generateId }),
    schema: sectionSchema,
  }),
  blog: defineCollection({
    loader: glob({ pattern: '*/blog/*.md', base, generateId }),
    schema: blogSchema,
  }),
};
