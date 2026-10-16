import { describe, expect, it } from 'vitest';
import { read } from './helpers';

/** The map drawing, as the map's page inlines it beside its masthead (the home's viz scene has the slider, user check 7). */
const mapOf = (file: string) => {
  const html = read(file);
  const start = html.indexOf('<div class="masthead"');
  const masthead = html.slice(start, html.indexOf('</main>', start));
  return /<svg\b[^>]*class="[^"]*masthead__drawing[^"]*"[^>]*>[\s\S]*?<\/svg>/.exec(masthead)?.[0] ?? '';
};

describe('the map drawing: a point cloud in perspective (user check 3)', () => {
  const svg = mapOf('viz/index.html');
  const circles = [...svg.matchAll(/<circle\b[^>]*>/g)].map((m) => m[0]);
  const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
  const centres = circles.map((c) => `${attr(c, 'cx')},${attr(c, 'cy')}`);

  it('keeps its viewBox and traces in (every stroke has pathLength="1")', () => {
    expect(svg).toContain('viewBox="0 0 260 220"');
    const strokes = [...svg.matchAll(/<(path|circle)\b[^>]*>/g)].map((m) => m[0]);
    expect(strokes.length).toBeGreaterThan(30);
    for (const s of strokes) expect(s).toContain('pathLength="1"');
  });

  it('holds 30 to 50 points, a few of them ringed as suttas', () => {
    const points = new Set(centres);
    expect(points.size).toBeGreaterThanOrEqual(30);
    expect(points.size).toBeLessThanOrEqual(50);
    const ringed = [...points].filter((p) => centres.filter((c) => c === p).length > 1);
    expect(ringed.length).toBeGreaterThanOrEqual(3);
    expect(ringed.length).toBeLessThanOrEqual(6);
  });

  it('shows depth: points of several sizes and stroke opacities, near ones larger and fuller', () => {
    const points = circles.map((c) => ({
      r: Number(attr(c, 'r')),
      opacity: Number(attr(c, 'stroke-opacity') ?? 1),
    }));
    expect(new Set(points.map((p) => p.opacity)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(points.map((p) => p.r)).size).toBeGreaterThanOrEqual(5);
    const big = points.filter((p) => p.r >= 4.5);
    const small = points.filter((p) => p.r <= 2.5);
    expect(big.length).toBeGreaterThan(0);
    expect(small.length).toBeGreaterThan(0);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(big.map((p) => p.opacity))).toBeGreaterThan(mean(small.map((p) => p.opacity)));
  });

  it('links some neighbours by thin edges, with no isometric floor', () => {
    const edges = [...svg.matchAll(/<path\b[^>]*d="M[\d.]+ [\d.]+L[\d.]+ [\d.]+"[^>]*>/g)];
    expect(edges.length).toBeGreaterThanOrEqual(6);
    expect(svg).not.toContain('M20 160L130 116L240 160L130 204Z');
  });
});
