import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const root = resolve(process.argv.includes('--dist') ? 'dist' : 'public');
const page = resolve(root, 'wiki/index.html');
const html = readFileSync(page, 'utf8');
const css = readFileSync(resolve(root, 'wiki/styles.css'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
assert.match(html, /<html lang="en">/);
assert.match(html, /name="viewport"/);
assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
assert.equal((html.match(/<main\b/g) ?? []).length, 1);
assert.equal((html.match(/<section\b/g) ?? []).length, 9);
assert.equal((html.match(/<details>/g) ?? []).length, 5);
assert.equal((html.match(/<caption>/g) ?? []).length, 3);
assert.doesNotMatch(html, /<script\b|\bon\w+=/i, 'Guide must remain script-free');
assert.doesNotMatch(html, /<(?:iframe|object|embed|form|input|base)\b/i, 'No embeds, forms, or document-base overrides');
assert.doesNotMatch(css, /@import\b|url\s*\(/i, 'No remote or hidden CSS resources');
for (const match of html.matchAll(/<a\b([^>]+)>/g)) {
  if (/target="_blank"/.test(match[1])) assert.match(match[1], /rel="noopener"/, 'New-tab links must isolate the opener');
}
assert.match(css, /:focus-visible/);
assert.match(css, /prefers-reduced-motion/);
const reviewedRevision = 'bc97b4f32a81edf3a694556b3e5de3bdfdf10958';
assert.ok(html.includes(reviewedRevision), 'Missing reviewed mobile/save revision');

let localLinks = 0;
let sourceLinks = 0;
for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const value = match[1];
  if (value.startsWith('#')) {
    assert.ok(ids.includes(value.slice(1)), `Missing anchor ${value}`);
  } else if (/^https:\/\//.test(value)) {
    assert.ok(value.startsWith('https://github.com/Pazneria/sword-guys/'), `Unexpected remote link ${value}`);
    assert.ok(value.includes(reviewedRevision), `Unpinned source link ${value}`);
    sourceLinks++;
  } else {
    assert.ok(!value.startsWith('/'), `Absolute URL would break project subpath: ${value}`);
    const destination = resolve(dirname(page), value.endsWith('/') ? `${value}index.html` : value);
    assert.ok(destination.startsWith(root + sep), `Local path escapes public root: ${value}`);
    if (value !== '../' || process.argv.includes('--dist')) assert.ok(existsSync(destination), `Missing local file ${value}`);
    localLinks++;
  }
}
for (const match of html.matchAll(/<img\b([^>]+)>/g)) assert.match(match[1], /\balt="[^"]*"/, 'Image missing alt');
console.log(JSON.stringify({ result: 'pass', root, sections: 9, routeDisclosures: 5, tables: 3, localLinks, sourceLinks, scripts: 0, security: 'no dynamic inputs, forms, embeds, inline handlers, remote styles, or unsafe link schemes' }, null, 2));
