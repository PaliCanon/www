// The configuration is final: later tasks add pages, components and
// libraries, never options here (task 002).
import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { contentRules } from './src/integrations/content-rules.ts';
import { contentDir } from './src/lib/content-dir.ts';
import { remarkContentImages } from './src/lib/content-images.ts';
import { DEFAULT_LANG, LANGS } from './src/lib/languages.ts';
import { siteUrl } from './src/lib/url.ts';

const contentRoot = fileURLToPath(new URL(`${contentDir()}/`, import.meta.url));

export default defineConfig({
  // The origin of the build: https://palicanon.app, https://dev.palicanon.app.
  site: siteUrl(),
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Every stylesheet is a file under _astro/, so the CSP needs no inline style.
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: [...LANGS],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [contentRules()],
  markdown: {
    // The copy is the author's: no typographic rewriting of quotes or dashes.
    processor: unified({
      smartypants: false,
      remarkPlugins: [[remarkContentImages, { contentRoot }]],
    }),
  },
  vite: { plugins: [tailwindcss()] },
});
