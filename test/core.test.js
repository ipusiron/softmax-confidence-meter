const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_CANDIDATES,
  MAX_INPUT_LENGTH,
  parseCandidateInput,
  softmax,
  entropy,
  analyzeCandidates
} = require('../js/core.js');

const closeTo = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
};

test('strict parser accepts complete decimal and scientific notation', () => {
  const result = parseCandidateInput('Alpha:3.5\n-2\nGamma:+1.2e-3');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.candidates, [
    { name: 'Alpha', score: 3.5, lineNumber: 1, autoIndex: null },
    { name: null, score: -2, lineNumber: 2, autoIndex: 2 },
    { name: 'Gamma', score: 0.0012, lineNumber: 3, autoIndex: null }
  ]);
});

test('strict parser reports every malformed non-empty line instead of silently dropping it', () => {
  const result = parseCandidateInput('A:1junk\nB:1:2\n:3\nC:\nD:4');
  assert.deepEqual(result.errors.map(error => [error.line, error.code]), [
    [1, 'invalidScore'],
    [2, 'invalidScore'],
    [3, 'emptyLabel'],
    [4, 'invalidScore']
  ]);
  assert.equal(result.candidates.length, 1);
});

test('non-finite literals and decimal overflow are rejected', () => {
  const result = parseCandidateInput('A:Infinity\nB:NaN\nC:1e309\nD:0');
  assert.deepEqual(result.errors.map(error => error.code), [
    'nonFiniteScore', 'nonFiniteScore', 'nonFiniteScore'
  ]);
});

test('candidate count and total input length are bounded', () => {
  const tooMany = parseCandidateInput(Array.from({ length: MAX_CANDIDATES + 1 }, (_, index) => String(index)).join('\n'));
  assert.equal(tooMany.errors.at(-1).code, 'tooManyCandidates');
  assert.deepEqual(tooMany.errors.at(-1).params, { max: 200, count: 201 });

  const tooLong = parseCandidateInput('1'.repeat(MAX_INPUT_LENGTH + 1));
  assert.equal(tooLong.errors[0].code, 'inputTooLong');
});

test('empty and single-candidate input are rejected with stable codes', () => {
  assert.equal(parseCandidateInput(' \n ').errors[0].code, 'emptyInput');
  assert.equal(parseCandidateInput('A:1').errors[0].code, 'tooFewCandidates');
});

test('stable softmax handles large finite values and sums to one', () => {
  const probabilities = softmax([1000, 999, 998], 1);
  closeTo(probabilities.reduce((sum, value) => sum + value, 0), 1);
  assert.ok(probabilities.every(Number.isFinite));
  assert.ok(probabilities[0] > probabilities[1] && probabilities[1] > probabilities[2]);
});

test('stable softmax handles the extreme finite range without NaN', () => {
  const probabilities = softmax([1e308, 0, -1e308], 0.1);
  assert.deepEqual(probabilities, [1, 0, 0]);
});

test('softmax is invariant under a shared finite score offset', () => {
  const base = softmax([3, 2, 1], 1.5);
  const shifted = softmax([103, 102, 101], 1.5);
  base.forEach((value, index) => closeTo(value, shifted[index]));
});

test('uniform entropy reaches log N and concentration reaches zero', () => {
  const probabilities = [0.25, 0.25, 0.25, 0.25];
  closeTo(entropy(probabilities), Math.log(4));
  const analysis = analyzeCandidates(probabilities.map((_, index) => ({ name: String(index), score: 1 })), 1);
  closeTo(analysis.normalizedEntropy, 1);
  closeTo(analysis.concentration, 0);
});

test('score scaling and temperature scaling are equivalent only when changed together', () => {
  const base = softmax([3, 2, 1], 1);
  const scaledTogether = softmax([30, 20, 10], 10);
  base.forEach((value, index) => closeTo(value, scaledTogether[index]));

  const concentrated = analyzeCandidates([30, 20, 10].map(score => ({ score })), 1);
  const ordinary = analyzeCandidates([3, 2, 1].map(score => ({ score })), 1);
  assert.ok(concentrated.concentration > ordinary.concentration);
});

test('analysis keeps source order for exact ties', () => {
  const analysis = analyzeCandidates([
    { name: 'first', score: 2 },
    { name: 'second', score: 2 },
    { name: 'third', score: 1 }
  ], 1);
  assert.deepEqual(analysis.ranked.map(item => item.name), ['first', 'second', 'third']);
});

test('tail mass includes every candidate omitted from the top-five chart', () => {
  const candidates = [9, 8, 7, 6, 5, 4, 3].map((score, index) => ({ name: String(index), score }));
  const analysis = analyzeCandidates(candidates, 1, 5);
  assert.equal(analysis.tailCount, 2);
  closeTo(
    analysis.tailMass,
    analysis.ranked[5].probability + analysis.ranked[6].probability
  );
  closeTo(analysis.probabilitySum, 1);
});

test('documented three-score example has the exact implementation values', () => {
  const analysis = analyzeCandidates([3.5, 2.1, 0.8].map(score => ({ score })), 1);
  assert.deepEqual(
    analysis.ranked.map(item => (item.probability * 100).toFixed(1)),
    ['76.1', '18.8', '5.1']
  );
});

test('invalid core arguments are rejected instead of producing NaN', () => {
  assert.throws(() => softmax([1, Infinity], 1), /finite/);
  assert.throws(() => softmax([1, 0], 0), /Temperature/);
  assert.throws(() => analyzeCandidates([{ score: 1 }], 1), /At least 2/);
});
