// A reading of a `_headers` file as Cloudflare Workers static assets applies
// it (wrangler 4.151.0: `parseHeaders` in its CLI, `attachCustomHeaders` in
// the asset worker). Rules are kept in file order; every rule whose path
// matches a request applies in that order: its `! Name` lines remove a
// header, then its `Name: value` lines set it, appended to a value an
// earlier rule set. Paths match whole: `*` is any run of characters,
// `:name` one segment.

/** One rule: a path and what it removes and sets (header names lower-cased). */
export interface HeaderRule {
  path: string;
  unset: string[];
  set: [string, string][];
}

/** The rules of a `_headers` text, and the lines Cloudflare would refuse. */
export function parseHeaders(text: string): { rules: HeaderRule[]; invalid: string[] } {
  const rules: HeaderRule[] = [];
  const invalid: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const rule = rules.at(-1);
    if (line.startsWith('/')) rules.push({ path: line, unset: [], set: [] });
    else if (!rule) invalid.push(line);
    else if (line.startsWith('!')) rule.unset.push(line.slice(1).trim().toLowerCase());
    else if (!line.includes(':')) invalid.push(line);
    else {
      const [name, ...value] = line.split(':');
      rule.set.push([name.trim().toLowerCase(), value.join(':').trim()]);
    }
  }
  return { rules, invalid };
}

const escape = (part: string) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Whether a rule's path matches a request path. */
export function matches(rulePath: string, pathname: string): boolean {
  const pattern = rulePath
    .split('*')
    .map((part) => escape(part).replace(/:\w+/g, '[^/]+'))
    .join('.*');
  return new RegExp(`^${pattern}$`).test(pathname);
}

/** The headers the rules give a request path (over no default header). */
export function effectiveHeaders(rules: HeaderRule[], pathname: string): Map<string, string> {
  const headers = new Map<string, string>();
  const setOnce = new Set<string>();
  for (const rule of rules.filter((r) => matches(r.path, pathname))) {
    for (const name of rule.unset) headers.delete(name);
    for (const [name, value] of rule.set) {
      const before = headers.get(name);
      headers.set(name, setOnce.has(name) && before !== undefined ? `${before}, ${value}` : value);
      setOnce.add(name);
    }
  }
  return headers;
}
