import { describe, expect, it } from 'vitest';
import { FrontmatterError, parseFrontmatter } from './frontmatter';

const doc = '---\ntitle: A\ndescription: B\n---\n\n# Heading\n';

describe('parseFrontmatter', () => {
  it('returns the data, the body and where the body starts', () => {
    const parsed = parseFrontmatter(doc);
    expect(parsed.data).toEqual({ title: 'A', description: 'B' });
    expect(parsed.body).toBe('\n# Heading\n');
    expect(parsed.bodyOffset).toBe(4);
  });

  it('records the line of every key', () => {
    expect(parseFrontmatter(doc).keyLines).toEqual({ title: 2, description: 3 });
  });

  it('reads Windows line endings', () => {
    const parsed = parseFrontmatter(doc.replaceAll('\n', '\r\n'));
    expect(parsed.data).toEqual({ title: 'A', description: 'B' });
    expect(parsed.bodyOffset).toBe(4);
  });

  it('accepts an empty body', () => {
    expect(parseFrontmatter('---\ntitle: A\n---').body).toBe('');
  });

  it('ignores a byte order mark', () => {
    expect(parseFrontmatter('﻿' + doc).data).toEqual({ title: 'A', description: 'B' });
  });

  it('fails when the file does not start with a front matter block, at line 1', () => {
    expect(() => parseFrontmatter('# Heading\n')).toThrow(FrontmatterError);
    try {
      parseFrontmatter('# Heading\n');
    } catch (e) {
      expect((e as FrontmatterError).line).toBe(1);
      expect((e as FrontmatterError).rule).toBe('front-matter');
    }
  });

  it('fails when the block is never closed', () => {
    expect(() => parseFrontmatter('---\ntitle: A\n\n# Heading\n')).toThrow(/closing/);
  });

  it('fails on invalid YAML, at the line of the error', () => {
    try {
      parseFrontmatter('---\ntitle: A\ndescription: [oops\n---\n');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(FrontmatterError);
      expect((e as FrontmatterError).line).toBeGreaterThanOrEqual(2);
    }
  });

  it('fails when the block is not a mapping', () => {
    expect(() => parseFrontmatter('---\n- a\n- b\n---\n')).toThrow(/mapping/);
  });

  it('treats an empty block as an empty mapping (the schema then names what is missing)', () => {
    expect(parseFrontmatter('---\n---\nbody').data).toEqual({});
  });
});
