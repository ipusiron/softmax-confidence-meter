# CLAUDE.md

This repository contains Day111, Softmax Confidence Meter, a dependency-free static learning tool for GitHub Pages.

## Product position

- The computed value is **distribution concentration**, not prediction confidence, accuracy, calibration, or safety.
- Never add trust labels or fixed thresholds such as “high confidence.”
- Keep the limitation note equally clear in Japanese and English.
- “Softmax Confidence Meter” is the product name only.

## Architecture

- `js/core.js`: strict parser and DOM-independent numerical and comparison functions; classic-script and CommonJS compatible
- `js/i18n.js`: complete Japanese/English dictionaries and optional language preference
- `js/main.js`: tabs, disclosures, input state, and DOM rendering
- `css/style.css`: mobile-first layout
- `test/`: Node.js built-in test runner tests
- `scripts/browser-check.mjs`: installed-Edge smoke check without package dependencies

The application must continue to work when `index.html` is opened through `file://`. Do not convert the runtime to ES modules or add a bundler without an explicit requirement.

## Numerical rules

- Accept 2–200 candidates and finite decimal/scientific scores only.
- Use `exp((score - maxScore) / temperature)` for numerical stability.
- Temperature must be finite and greater than zero; the meter UI range is 0.10–5.00 and the comparison-lab range is 0.1–10.0.
- Concentration is `1 - H(p) / log(n)` with natural logarithms.
- Preserve source order for exact ties.
- Report omitted count and tail probability whenever the top-five view omits candidates.
- Compare named candidates by identity even if their input order differs. Treat candidate-set changes as redistribution, not as a directly comparable before-and-after result.

## Security and accessibility

- Never render user input with `innerHTML`, `insertAdjacentHTML`, or document-writing APIs.
- Do not add inline scripts, inline styles, or inline event handlers; preserve the strict CSP.
- Keep input and label length bounds.
- Preserve ARIA tab keyboard controls, disclosure states, live/alert regions, and 44px controls.
- Verify 320, 390, 600, and desktop widths and both languages after UI changes.

## Verification

Requires Node.js 22 or later. No install step is needed.

```bash
npm test
node scripts/browser-check.mjs
```

Also run `node --check` for changed JavaScript and `git diff --check` before committing.
