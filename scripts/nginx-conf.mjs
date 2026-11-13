#!/usr/bin/env node
// Writes the nginx config of the image from the template, public/_headers
// and public/_redirects, so those two files stay the single source of what
// Cloudflare Workers static assets served: the headers (rules in file order,
// `! Name` removes what an earlier rule set, a header set again is appended
// with a comma: test/headers-rules.ts is that reading) and the redirects
// (`from to [status]`, 302 when none). The template holds two markers,
// `#@HEADERS@` and `#@REDIRECTS@`, replaced by the generated directives; its
// `${WWW_*}` variables are the container's envsubst (docker/www.conf.template).
// What the generator does not translate it refuses, naming the line.
// Usage: node scripts/nginx-conf.mjs <template> <_headers> <_redirects> > www.conf.template
// Tests: test/nginx-conf.test.ts
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Combination maps hold 2^rules keys per header: more rules than this is a design question. */
const MAX_RULES = 12;

const regexEscape = (part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** The rules of a `_headers` text: path, names to remove, [name, value] to set (file order). */
function parseHeaders(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const rule = rules.at(-1);
    if (line.startsWith('/')) {
      if (/[$"\\;\s]/.test(line))
        throw new Error(`_headers: the path "${line}" has a $, ", \\ or ;`);
      rules.push({ path: line, unset: [], set: [] });
    } else if (!rule || (!line.startsWith('!') && !line.includes(':')))
      throw new Error(`_headers: cannot read "${line}"`);
    else if (line.startsWith('!')) rule.unset.push(line.slice(1).trim().toLowerCase());
    else {
      const [name, ...value] = line.split(':');
      const v = value.join(':').trim();
      if (/[$"\\]/.test(v))
        throw new Error(`_headers: ${name.trim()} has a $, " or \\ in its value`);
      rule.set.push([name.trim(), v]);
    }
  }
  if (rules.length > MAX_RULES) throw new Error(`_headers: more than ${MAX_RULES} rules`);
  return rules;
}

/** A rule's path as a regex over the whole path: `*` is any run, `:name` one segment. */
function pathRegex(path) {
  return path
    .split('*')
    .map((part) => regexEscape(part).replace(/:\w+/g, '[^/]+'))
    .join('.*');
}

/**
 * What the maps encode: one regex per rule (does the path match), and per header
 * name the value for each combination of matching rules ("101": rules 0 and 2),
 * absent when the combination leaves the header unset.
 */
export function headerTable(text) {
  const rules = parseHeaders(text);
  const patterns = rules.map((r) => new RegExp(`^${pathRegex(r.path)}$`));
  const names = new Map();
  for (const rule of rules)
    for (const [name] of rule.set)
      names.set(name.toLowerCase(), names.get(name.toLowerCase()) ?? name);
  const headers = [...names].map(([lower, name]) => {
    const values = new Map();
    for (let n = 1; n < 2 ** rules.length; n++) {
      const bits = n.toString(2).padStart(rules.length, '0');
      let value;
      rules.forEach((rule, i) => {
        if (bits[i] !== '1') return;
        if (rule.unset.includes(lower)) value = undefined;
        for (const [setName, v] of rule.set)
          if (setName.toLowerCase() === lower) value = value === undefined ? v : `${value}, ${v}`;
      });
      if (value) values.set(bits, value);
    }
    return { name, values };
  });
  return { patterns, headers, rules };
}

/** The `map` and `add_header` directives of a `_headers` text. */
export function renderHeaders(text) {
  const { headers, rules } = headerTable(text);
  const out = [];
  rules.forEach((rule, i) => {
    out.push(
      `map $uri $www_rule${i} {`,
      '    default 0;',
      `    "~^${pathRegex(rule.path)}$" 1;`,
      '}',
    );
  });
  const keys = rules.map((_, i) => `$www_rule${i}`).join('');
  headers.forEach(({ values }, i) => {
    out.push(`map "${keys}" $www_header${i} {`, '    default "";');
    for (const [bits, value] of values) out.push(`    "${bits}" "${value}";`);
    out.push('}');
  });
  const adds = headers.map(({ name }, i) => `add_header ${name} $www_header${i} always;`);
  return { maps: out.join('\n'), adds: adds.join('\n  ') };
}

/** The `[{from, to, status}]` of a `_redirects` text. */
export function parseRedirects(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const [from, to, code, ...rest] = line.split(/\s+/);
    const status = code === undefined ? 302 : Number(code);
    if (!to || rest.length > 0) throw new Error(`_redirects: cannot read "${line}"`);
    if (!from.startsWith('/')) throw new Error(`_redirects: "${from}" is not a path`);
    if (![301, 302, 303, 307, 308].includes(status))
      throw new Error(`_redirects: status ${code} of "${line}" is not a redirect`);
    if (/[$"\\;\s]/.test(to)) throw new Error(`_redirects: "${to}" has a $, ", \\ or ; to escape`);
    if (/:(?!splat\b)[a-zA-Z_]/.test(from + to)) {
      const name = (from + to).match(/:(?!splat\b)[a-zA-Z_]\w*/)[0];
      throw new Error(`_redirects: the placeholder ${name} is not translated (only * and :splat)`);
    }
    if (/[$"\\;\s]/.test(from))
      throw new Error(`_redirects: "${from}" has a $, ", \\ or ; to escape`);
    out.push({ from, to, status });
  }
  return out;
}

/** The locations of a `_redirects` text: exact paths, a `*` as a regex with `:splat`. */
export function renderRedirects(text) {
  return parseRedirects(text)
    .map(({ from, to, status }) => {
      if (!from.includes('*')) return `location = ${from} {\n    return ${status} ${to};\n  }`;
      const regex = from.split('*').map(regexEscape).join('(?<www_splat>.*)');
      return `location ~ "^${regex}$" {\n    return ${status} ${to.replace(':splat', '$www_splat')};\n  }`;
    })
    .join('\n  ');
}

/** The template with its two markers replaced. */
export function renderConf(template, headersText, redirectsText) {
  for (const marker of ['#@HEADERS@', '#@REDIRECTS@', '#@MAPS@'])
    if (!template.includes(marker)) throw new Error(`the template has no ${marker}`);
  const { maps, adds } = renderHeaders(headersText);
  return template
    .replace('#@MAPS@', () => maps)
    .replace('#@HEADERS@', () => adds)
    .replace('#@REDIRECTS@', () => renderRedirects(redirectsText));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [template, headers, redirects] = process.argv.slice(2);
  if (!redirects) {
    process.stderr.write('usage: nginx-conf.mjs <template> <_headers> <_redirects>\n');
    process.exit(2);
  }
  const read = (file) => readFileSync(file, 'utf8');
  process.stdout.write(renderConf(read(template), read(headers), read(redirects)));
}
