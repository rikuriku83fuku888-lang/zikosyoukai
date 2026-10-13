// サイトの配布には不要。依存パッケージなしで構造とメニュー状態遷移を確認する。
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = ['index.html', 'hobby.html', 'contact.html'];
const documents = {};

for (const page of pages) {
  const html = await readFile(path.join(root, page), 'utf8');
  documents[page] = html;
  assert.match(html, /<html lang="ja">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page}: h1`);
  assert.equal((html.match(/<main\b/g) || []).length, 1, `${page}: main`);
  assert.match(html, /<footer\b/);
  const nav = html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav, `${page}: navigation`);
  for (const target of pages) assert.ok(nav.includes(`href="${target}"`));
  assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
  assert.ok(nav.includes(`href="${page}" aria-current="page"`));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: duplicate IDs`);
  for (const match of html.matchAll(/\b(?:src|href|srcset)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(https?:|mailto:)/.test(target)) continue;
    if (target.startsWith('#')) {
      assert.ok(ids.includes(target.slice(1)), `${page}: missing anchor ${target}`);
    } else {
      await access(path.join(root, target));
    }
  }
  for (const image of html.matchAll(/<img\b[^>]*>/g)) assert.match(image[0], /\balt="[^"]*"/);
}

assert.equal((documents['hobby.html'].match(/class="hobby-item"/g) || []).length, 10);
for (const label of ['NAME', 'SCHOOL', 'HOBBY', 'SKILL', 'EMAIL']) {
  assert.ok(documents['index.html'].includes(`<th scope="row">${label}</th>`));
}
assert.equal((documents['contact.html'].match(/class="social-card"/g) || []).length, 3);
assert.match(documents['contact.html'], /<h3>羽田空港<\/h3>/);
assert.match(documents['contact.html'], /<iframe[^>]+title="羽田空港の地図"[^>]+src="https:\/\/www\.google\.com\/maps\?/);
const css = await readFile(path.join(root, 'style.css'), 'utf8');
const palette = new Set(['#fdfbf7', '#f5efe6', '#c8956d', '#3d3936', '#7a7370', '#e8dfd3']);
for (const color of css.match(/#[\da-f]{6}\b/gi) || []) assert.ok(palette.has(color.toLowerCase()), color);
assert.match(css, /max-width: 768px/);
assert.match(css, /769px <= width < 1024px/);
assert.match(css, /prefers-reduced-motion: reduce/);
for (const count of [2, 3, 5]) assert.ok(css.includes(`repeat(${count}, minmax(0, 1fr))`));

const script = await readFile(path.join(root, 'scripts/menu.js'), 'utf8');
function fixture(isMobile) {
  const handlers = new Map();
  const attributes = new Map();
  const doc = { activeElement: null, addEventListener: (event, callback) => handlers.set(`document:${event}`, callback) };
  const link = { focus() { doc.activeElement = link; }, closest() { return link; } };
  const toggle = {
    hidden: true,
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); },
    addEventListener(event, callback) { handlers.set(`toggle:${event}`, callback); },
    focus() { doc.activeElement = toggle; }
  };
  const navigation = {
    hidden: false,
    contains(element) { return element === link; },
    querySelector() { return link; },
    addEventListener(event, callback) { handlers.set(`nav:${event}`, callback); }
  };
  const media = { matches: isMobile, addEventListener(event, callback) { handlers.set(`media:${event}`, callback); } };
  doc.querySelector = selector => selector === '.menu-toggle' ? toggle : navigation;
  vm.runInNewContext(script, { document: doc, window: { matchMedia: () => media } });
  return { handlers, attributes, doc, toggle, navigation, media, link };
}

const mobile = fixture(true);
assert.equal(mobile.toggle.hidden, false);
assert.equal(mobile.navigation.hidden, true);
mobile.handlers.get('toggle:click')();
assert.equal(mobile.navigation.hidden, false);
assert.equal(mobile.attributes.get('aria-expanded'), 'true');
assert.equal(mobile.attributes.get('aria-label'), 'メニューを閉じる');
mobile.handlers.get('document:keydown')({ key: 'Escape' });
assert.equal(mobile.navigation.hidden, true);
assert.equal(mobile.doc.activeElement, mobile.toggle);
mobile.handlers.get('toggle:click')();
mobile.handlers.get('nav:click')({ target: mobile.link });
assert.equal(mobile.navigation.hidden, true);
mobile.handlers.get('toggle:click')();
mobile.media.matches = false;
mobile.handlers.get('media:change')();
assert.equal(mobile.navigation.hidden, false);
assert.equal(mobile.toggle.hidden, true);
assert.equal(mobile.doc.activeElement, mobile.link);
mobile.media.matches = true;
mobile.handlers.get('media:change')();
assert.equal(mobile.navigation.hidden, true);
assert.equal(mobile.doc.activeElement, mobile.toggle);

const desktop = fixture(false);
assert.equal(desktop.toggle.hidden, true);
assert.equal(desktop.navigation.hidden, false);
desktop.handlers.get('document:keydown')({ key: 'Escape' });
assert.equal(desktop.navigation.hidden, false);
vm.runInNewContext(script, { document: { querySelector: () => null } });

console.log('PASS: 3 pages, local references, required content, palette, breakpoints, menu open/close, Escape, link selection, viewport transitions, absent elements.');
console.log('Not covered: browser layout, external services, real content and Figma matching.');
