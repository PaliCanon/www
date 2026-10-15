import { z } from 'astro/zod';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A blog date: `2026-10-14` (the YAML reader of Astro hands it over as a Date). */
const dateField = z
  .union([z.date(), z.string().regex(DATE, 'must be written YYYY-MM-DD')])
  .pipe(z.coerce.date());

const base = {
  title: z.string().min(1, 'must not be empty'),
  description: z
    .string()
    .min(1, 'must not be empty')
    .max(160, 'must be at most 160 characters (search results cut it)'),
};

/** Front matter of a page: a title and a description, nothing else. */
export const pageSchema = z.strictObject(base);

/**
 * Front matter of a blog post: a page's, plus its date and an optional
 * image for link previews: `images/<file name>`, a file of the flat
 * `content/images/` (no sub-folder).
 */
export const blogSchema = z.strictObject({
  ...base,
  date: dateField,
  image: z
    .string()
    .refine((value) => /^images\/[^/]+$/.test(value), {
      message: 'images live flat in content/images/',
      params: { rule: 'frontmatter-image-not-in-images' },
    })
    .optional(),
});

/**
 * Front matter of a home section: a small line above the title (`eyebrow`),
 * the `title`, and the part of the title shown highlighted (`highlight`,
 * copied exactly from the title). A section has no description.
 */
export const sectionSchema = z
  .strictObject({
    eyebrow: z.string().min(1, 'must not be empty').optional(),
    title: base.title,
    highlight: z.string().min(1, 'must not be empty').optional(),
  })
  .superRefine((section, ctx) => {
    if (!section.highlight || section.title.includes(section.highlight)) return;
    ctx.addIssue({
      code: 'custom',
      path: ['highlight'],
      message: `"highlight" must be copied exactly from the title: "${section.highlight}" is not in "${section.title}"`,
      params: { rule: 'highlight-not-in-title' },
    });
  });

/** The kinds of front matter a content file can have. */
export type FrontmatterKind = 'page' | 'blog' | 'section';

/** One problem with a front matter block. */
export interface FrontmatterIssue {
  /** The key it is about; `undefined` for the block as a whole. */
  key: string | undefined;
  /** What is wrong, naming the key. */
  message: string;
  /** The rule's name when it is not the general `front-matter`. */
  rule?: string;
}

/** Checks `data` against the schema of `kind`; empty when it is valid. */
export function frontmatterIssues(kind: FrontmatterKind, data: unknown): FrontmatterIssue[] {
  const result = SCHEMAS[kind].safeParse(data);
  if (result.success) return [];
  return result.error.issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        key,
        message: `unknown key "${key}" (allowed: ${allowedKeys(kind)})`,
      }));
    }
    const key = typeof issue.path[0] === 'string' ? issue.path[0] : undefined;
    if (issue.code === 'custom') return [{ key, message: issue.message, rule: customRule(issue) }];
    const subject = key ? `"${key}" ` : 'front matter ';
    const message =
      key && issue.code === 'invalid_type' && issue.input === undefined
        ? `"${key}" is missing`
        : `${subject}${issue.message}`;
    return [{ key, message }];
  });
}

const SCHEMAS = { page: pageSchema, blog: blogSchema, section: sectionSchema };

const ALLOWED_KEYS = {
  page: 'title, description',
  blog: 'title, description, date, image',
  section: 'eyebrow, title, highlight',
};

function allowedKeys(kind: FrontmatterKind): string {
  return ALLOWED_KEYS[kind];
}

function customRule(issue: { params?: Record<string, unknown> }): string | undefined {
  const rule = issue.params?.rule;
  return typeof rule === 'string' ? rule : undefined;
}
