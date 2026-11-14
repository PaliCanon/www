import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The legal pages say what the code and the infrastructure do (the fact table
// of .task/018-legal-facts.md). These tests keep the pages from contradicting
// one another or the facts again: one claim, one assertion.

const LANGS = ['en', 'fr', 'vi'] as const;
const page = (lang: string, name: string) =>
  readFileSync(join(import.meta.dirname, '../content', lang, `${name}.md`), 'utf8');

describe('the legal pages agree with each other and with the facts', () => {
  it.each(LANGS)('privacy and legal both name the publisher and his contact (%s)', (lang) => {
    for (const name of ['legal', 'privacy']) {
      expect(page(lang, name)).toContain('Thibault Rivière');
      expect(page(lang, name)).toContain('riviere.thibault@icloud.com');
    }
  });

  it.each(LANGS)('no page claims that the site sets no cookie (%s)', (lang) => {
    const claim = /sets no cookie|ne dépose aucun cookie|không đặt cookie/i;
    for (const name of ['legal', 'privacy']) expect(page(lang, name)).not.toMatch(claim);
  });

  it.each(LANGS)('privacy lists every cookie and storage key the services use (%s)', (lang) => {
    const text = page(lang, 'privacy');
    for (const key of [
      'pc_lang',
      'pc_theme',
      'pc_rail',
      'pc_learn_deck',
      'viz_legend',
      'viz_textlang',
      'pc_learn',
      'pc_learn_sync',
    ]) {
      expect(text, key).toContain(key);
    }
  });

  it.each(LANGS)('search queries are kept 30 days, never 24 months (%s)', (lang) => {
    const text = page(lang, 'privacy');
    expect(text).not.toMatch(/24 (months|mois|tháng)/);
    expect(text).toMatch(/30 (days|jours|ngày)/);
  });

  it.each(LANGS)('the IP addresses are deleted after 90 days, not kept forever (%s)', (lang) => {
    const text = page(lang, 'privacy');
    expect(text).toMatch(/90 (days|jours|ngày)/);
    expect(text).not.toMatch(
      /copy, without time limit|l’éditeur, sans limite|bản sao của đơn vị xuất bản được giữ vô thời hạn/,
    );
  });

  it.each(LANGS)('legal and privacy say the server is in France (%s)', (lang) => {
    for (const name of ['legal', 'privacy']) {
      expect(page(lang, name)).toMatch(/in France|en France|tại Pháp/);
    }
  });

  it.each(LANGS)('no page names Google Cloud or cloud hosting (%s)', (lang) => {
    for (const name of ['legal', 'privacy', 'support']) {
      expect(page(lang, name)).not.toMatch(/google cloud|cloud hosting|hébergement cloud|đám mây/i);
    }
  });

  it.each(LANGS)(
    'legal and privacy both name Cloudflare and the Google Drive sync (%s)',
    (lang) => {
      for (const name of ['legal', 'privacy']) {
        expect(page(lang, name)).toContain('Cloudflare');
        expect(page(lang, name)).toContain('Google Drive');
      }
    },
  );

  it.each(LANGS)('support offers Ko-fi once (%s)', (lang) => {
    expect(page(lang, 'support').match(/ko-fi\.com\/tipitaka/g)).toHaveLength(1);
  });

  it.each(LANGS)('the pages edited on 2026-11-14 say so (%s)', (lang) => {
    for (const name of ['legal', 'privacy', 'terms']) {
      expect(page(lang, name), name).toContain('2026-11-14');
    }
  });
});
