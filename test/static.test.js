const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('HTML has a strict local-only CSP and no inline executable content', () => {
  const html = read('index.html');
  assert.match(html, /default-src 'self'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self'/);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.equal((html.match(/<script\s+src=/g) || []).length, 3);
  assert.doesNotMatch(html, /<script(?!\s+src=)[^>]*>/);
});

test('HTML exposes the required accessible tab, disclosure, form, and live-region structure', () => {
  const html = read('index.html');
  assert.equal((html.match(/role="tab"/g) || []).length, 3);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 3);
  assert.equal((html.match(/class="accordion-button"/g) || []).length, 4);
  assert.equal((html.match(/aria-expanded=/g) || []).length, 4);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label[^>]+for="candidate-input"/);
  assert.match(html, /maxlength="20000"/);
  assert.match(html, /<progress/);
  assert.ok(html.indexOf('js/core.js') < html.indexOf('js/i18n.js'));
  assert.ok(html.indexOf('js/i18n.js') < html.indexOf('js/main.js'));
});

test('local HTML and README asset references resolve inside the repository', () => {
  const references = [];
  const html = read('index.html');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) references.push(match[1]);
  for (const readmeName of ['README.md', 'README.en.md']) {
    for (const match of read(readmeName).matchAll(/\]\(([^)]+)\)/g)) references.push(match[1]);
  }
  const localReferences = references.filter(reference => (
    !reference.includes('://') && !reference.startsWith('#') && !reference.startsWith('data:')
  ));
  for (const reference of localReferences) {
    assert.ok(exists(reference), `Missing local reference: ${reference}`);
  }
});

test('runtime renders through DOM APIs without HTML sinks or dynamic style attributes', () => {
  const source = read('js/main.js');
  assert.doesNotMatch(source, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/);
  assert.doesNotMatch(source, /\.style\.|setAttribute\(['"]style/);
  assert.match(source, /textContent/);
  assert.match(source, /createElement/);
});

test('README files agree on exact example values, limitations, and relative links', () => {
  const ja = read('README.md');
  const en = read('README.en.md');
  for (const value of ['76.1%', '18.8%', '5.1%']) {
    assert.match(ja, new RegExp(value.replace('.', '\\.')));
    assert.match(en, new RegExp(value.replace('.', '\\.')));
  }
  assert.match(ja, /正解率、モデルの信頼性、安全性を保証しません/);
  assert.match(en, /guarantees prediction accuracy, model reliability, or safety/);
  assert.match(ja, /\(README\.en\.md\)/);
  assert.match(en, /\(README\.md\)/);
  assert.match(ja, /assets\/screenshot-en\.png/);
  assert.match(en, /assets\/screenshot\.png/);
});

test('UI has no trust thresholds or trust labels and the specification forbids them', () => {
  const ui = [read('index.html'), read('js/i18n.js')].join('\n');
  assert.doesNotMatch(ui, /70%以上|40%未満|High confidence|Low confidence|自信あり|判断困難/);
  assert.match(read('docs/SPEC.md'), /固定の判定閾値.*品質ラベルは付けない/);
});

test('mobile-first CSS includes required expansion points and no viewport-clipping workaround', () => {
  const css = read('css/style.css');
  assert.match(css, /@media \(min-width: 600px\)/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /overflow-x:\s*hidden/);
  assert.match(css, /prefers-reduced-motion/);
});

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}
