const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  getStoredLanguage,
  messages,
  normalizeLanguage,
  setStoredLanguage,
  translate
} = require('../js/i18n.js');

test('Japanese and English dictionaries contain exactly the same keys', () => {
  assert.deepEqual(Object.keys(messages.ja).sort(), Object.keys(messages.en).sort());
  assert.ok(Object.keys(messages.ja).length >= 75);
});

test('every translated value is a non-empty string', () => {
  for (const [language, dictionary] of Object.entries(messages)) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, 'string', `${language}.${key}`);
      assert.ok(value.trim().length > 0, `${language}.${key}`);
    }
  }
});

test('every HTML translation key exists in both dictionaries', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-placeholder|-aria-label)?="([^"]+)"/g)]
    .map(match => match[1]);
  assert.ok(keys.length > 0);
  for (const key of new Set(keys)) {
    assert.equal(typeof messages.ja[key], 'string', `ja.${key}`);
    assert.equal(typeof messages.en[key], 'string', `en.${key}`);
  }
});

test('translation replaces named parameters and falls back safely', () => {
  assert.equal(translate('ja', 'tailSummary', { count: 2, mass: '3.4' }), 'ほか2件の合計: 3.4%');
  assert.equal(translate('en', 'linePrefix', { line: 7 }), 'Line 7: ');
  assert.equal(normalizeLanguage('fr'), DEFAULT_LANGUAGE);
  assert.equal(translate('fr', 'calculateButton'), messages.ja.calculateButton);
});

test('language preference tolerates unavailable storage', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  setStoredLanguage(storage, 'en');
  assert.equal(values.get(STORAGE_KEY), 'en');
  assert.equal(getStoredLanguage(storage), 'en');

  const failingStorage = {
    getItem() { throw new Error('unavailable'); },
    setItem() { throw new Error('unavailable'); }
  };
  assert.equal(getStoredLanguage(failingStorage), 'ja');
  assert.doesNotThrow(() => setStoredLanguage(failingStorage, 'en'));
});
