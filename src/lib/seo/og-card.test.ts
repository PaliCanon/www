import { describe, expect, it } from 'vitest';
import { ogCardHtml } from './og-card';

describe('ogCardHtml', () => {
  it('is a 1200 x 630 page with the title and the lotus', () => {
    const html = ogCardHtml({
      title: 'PaliCanon',
      tagline: 'Le Canon pāli pour tous',
      lotus: 'data:image/png;base64,AAAA',
      lang: 'fr',
    });
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('width: 1200px');
    expect(html).toContain('height: 630px');
    expect(html).toContain('Le Canon pāli pour tous');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
  });

  it('escapes the text it shows', () => {
    const html = ogCardHtml({ title: 'A <b> & "c"', tagline: '<script>', lotus: 'x', lang: 'en' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('A &lt;b&gt; &amp; &quot;c&quot;');
  });
});
