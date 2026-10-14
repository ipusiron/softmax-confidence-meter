/**
 * DOM-independent parsing and softmax analysis core.
 * Exposed as SoftmaxCore in browsers and as CommonJS exports in Node.js.
 */
(function exposeCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SoftmaxCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildCore() {
  'use strict';

  const MIN_CANDIDATES = 2;
  const MAX_CANDIDATES = 200;
  const MAX_INPUT_LENGTH = 20000;
  const MAX_LABEL_LENGTH = 100;
  const DEFAULT_TOP_LIMIT = 5;
  const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const NON_FINITE_LITERAL_PATTERN = /^[+-]?(?:Infinity|NaN)$/i;

  function issue(code, params = {}, line = null) {
    return { code, params, line };
  }

  function parseCandidateInput(input) {
    const text = typeof input === 'string' ? input : String(input ?? '');
    if (text.length > MAX_INPUT_LENGTH) {
      return {
        candidates: [],
        errors: [issue('inputTooLong', { max: MAX_INPUT_LENGTH, count: text.length })]
      };
    }

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const candidates = [];
    const errors = [];
    let nonEmptyCount = 0;

    lines.forEach((sourceLine, index) => {
      const lineNumber = index + 1;
      const line = sourceLine.trim();
      if (!line) return;
      nonEmptyCount += 1;

      if (nonEmptyCount > MAX_CANDIDATES) return;

      const separatorIndex = line.indexOf(':');
      let name = null;
      let rawScore = line;

      if (separatorIndex >= 0) {
        name = line.slice(0, separatorIndex).trim();
        rawScore = line.slice(separatorIndex + 1).trim();
        if (!name) {
          errors.push(issue('emptyLabel', {}, lineNumber));
        } else if (name.length > MAX_LABEL_LENGTH) {
          errors.push(issue('labelTooLong', { max: MAX_LABEL_LENGTH }, lineNumber));
        }
      }

      if (NON_FINITE_LITERAL_PATTERN.test(rawScore)) {
        errors.push(issue('nonFiniteScore', {}, lineNumber));
        return;
      }
      if (!NUMBER_PATTERN.test(rawScore)) {
        errors.push(issue('invalidScore', {}, lineNumber));
        return;
      }

      const score = Number(rawScore);
      if (!Number.isFinite(score)) {
        errors.push(issue('nonFiniteScore', {}, lineNumber));
        return;
      }

      if (name !== '' && name !== null && name.length <= MAX_LABEL_LENGTH) {
        candidates.push({ name, score, lineNumber, autoIndex: null });
      } else if (name === null) {
        candidates.push({ name: null, score, lineNumber, autoIndex: candidates.length + 1 });
      }
    });

    if (nonEmptyCount > MAX_CANDIDATES) {
      errors.push(issue('tooManyCandidates', { max: MAX_CANDIDATES, count: nonEmptyCount }));
    }

    if (nonEmptyCount === 0) {
      errors.push(issue('emptyInput'));
    } else if (errors.length === 0 && candidates.length < MIN_CANDIDATES) {
      errors.push(issue('tooFewCandidates', { min: MIN_CANDIDATES, count: candidates.length }));
    }

    return { candidates, errors };
  }

  function validateTemperature(temperature) {
    if (!Number.isFinite(temperature) || temperature <= 0) {
      throw new RangeError('Temperature must be a finite number greater than zero');
    }
  }

  function validateScores(scores) {
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new RangeError('At least one score is required');
    }
    if (scores.length > MAX_CANDIDATES) {
      throw new RangeError(`At most ${MAX_CANDIDATES} scores are allowed`);
    }
    if (!scores.every(Number.isFinite)) {
      throw new TypeError('Every score must be finite');
    }
  }

  function softmax(scores, temperature = 1) {
    validateScores(scores);
    validateTemperature(temperature);
    if (scores.length === 1) return [1];

    let maxScore = -Infinity;
    for (const score of scores) {
      if (score > maxScore) maxScore = score;
    }

    const exponentials = scores.map(score => Math.exp((score - maxScore) / temperature));
    const sum = exponentials.reduce((total, value) => total + value, 0);
    if (!Number.isFinite(sum) || sum <= 0) {
      throw new RangeError('Softmax normalization failed');
    }
    return exponentials.map(value => value / sum);
  }

  function entropy(probabilities) {
    if (!Array.isArray(probabilities) || probabilities.length === 0) {
      throw new RangeError('At least one probability is required');
    }
    let total = 0;
    for (const probability of probabilities) {
      if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
        throw new RangeError('Probabilities must be finite values from zero to one');
      }
      if (probability > 0) total -= probability * Math.log(probability);
    }
    return total;
  }

  function clampUnit(value) {
    return Math.max(0, Math.min(1, value));
  }

  function analyzeCandidates(candidates, temperature = 1, topLimit = DEFAULT_TOP_LIMIT) {
    if (!Array.isArray(candidates) || candidates.length < MIN_CANDIDATES) {
      throw new RangeError(`At least ${MIN_CANDIDATES} candidates are required`);
    }
    if (candidates.length > MAX_CANDIDATES) {
      throw new RangeError(`At most ${MAX_CANDIDATES} candidates are allowed`);
    }
    if (!Number.isInteger(topLimit) || topLimit < 1) {
      throw new RangeError('Top limit must be a positive integer');
    }

    const scores = candidates.map(candidate => candidate.score);
    const probabilities = softmax(scores, temperature);
    const ranked = candidates.map((candidate, index) => ({
      sourceIndex: index,
      name: candidate.name ?? null,
      autoIndex: candidate.autoIndex ?? index + 1,
      score: candidate.score,
      probability: probabilities[index]
    })).sort((left, right) => right.probability - left.probability || left.sourceIndex - right.sourceIndex);

    const entropyValue = entropy(probabilities);
    const maxEntropy = Math.log(probabilities.length);
    const normalizedEntropy = clampUnit(entropyValue / maxEntropy);
    const concentration = clampUnit(1 - normalizedEntropy);
    const visibleCount = Math.min(topLimit, ranked.length);
    const tail = ranked.slice(visibleCount);
    const tailMass = tail.reduce((sum, item) => sum + item.probability, 0);
    const probabilitySum = probabilities.reduce((sum, value) => sum + value, 0);

    let scoreMin = Infinity;
    let scoreMax = -Infinity;
    for (const score of scores) {
      if (score < scoreMin) scoreMin = score;
      if (score > scoreMax) scoreMax = score;
    }

    return {
      temperature,
      candidateCount: candidates.length,
      probabilities,
      probabilitySum,
      ranked,
      topLimit: visibleCount,
      tailCount: tail.length,
      tailMass,
      entropy: entropyValue,
      maxEntropy,
      normalizedEntropy,
      concentration,
      topShare: ranked[0].probability,
      topGap: ranked[0].probability - ranked[1].probability,
      scoreMin,
      scoreMax,
      scoreSpan: scoreMax - scoreMin
    };
  }

  return Object.freeze({
    MIN_CANDIDATES,
    MAX_CANDIDATES,
    MAX_INPUT_LENGTH,
    MAX_LABEL_LENGTH,
    DEFAULT_TOP_LIMIT,
    parseCandidateInput,
    softmax,
    entropy,
    analyzeCandidates
  });
}));
