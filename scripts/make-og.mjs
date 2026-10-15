// Makes the images under public/og/: the default Open Graph card of each
// language (1200 x 630, the home page's title on the deep card of the dark
// theme, with the lotus) and the lotus logo of the structured data. They are
// committed: run this again when a home title changes (`node scripts/make-og.mjs`;
// it needs Chrome, `CHROME_PATH` names it when it is not in the usual place,
// and `sharp`, which comes with Astro).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public/og');
const chrome =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// The card's code is TypeScript with extensionless imports: Vite loads it.
const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
const load = (file) => vite.ssrLoadModule(`/src/lib/${file}`);
const { LANGS } = await load('languages.ts');
const { ogCardHtml } = await load('seo/og-card.ts');
const { OG_SIZE } = await load('seo/og.ts');
const { SITE_NAME } = await load('seo/site.ts');

mkdirSync(out, { recursive: true });
const lotus512 = await sharp(join(root, 'src/assets/lotus.png')).resize(512, 512).png().toBuffer();
writeFileSync(join(out, 'lotus.png'), lotus512);
const lotus = `data:image/png;base64,${lotus512.toString('base64')}`;

const work = mkdtempSync(join(tmpdir(), 'www-og-'));
for (const lang of LANGS) {
  const source = readFileSync(join(root, 'content', lang, 'index.md'), 'utf8');
  const { title } = parse(/^---\n([\s\S]*?)\n---/.exec(source)[1]);
  // "PaliCanon: the Pāli Canon for everyone": the name is the small line, the rest the headline.
  const rest = title.replace(new RegExp(`^${SITE_NAME}\\s*:\\s*`), '');
  const tagline = rest.charAt(0).toLocaleUpperCase(lang) + rest.slice(1);
  const page = join(work, `${lang}.html`);
  writeFileSync(page, ogCardHtml({ lang, title: SITE_NAME, tagline, lotus }));
  const png = join(work, `${lang}.png`);
  const run = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${OG_SIZE.width},${OG_SIZE.height}`,
    `--screenshot=${png}`,
    `file://${page}`,
  ]);
  if (run.status !== 0) throw new Error(`Chrome failed for ${lang}: ${run.stderr}`);
  const card = await sharp(png)
    .resize(OG_SIZE.width, OG_SIZE.height)
    .png({ palette: true })
    .toBuffer();
  writeFileSync(join(out, `default-${lang}.png`), card);
}
rmSync(work, { recursive: true, force: true });
await vite.close();
