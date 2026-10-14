# Softmax Confidence Meter

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/softmax-confidence-meter?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/softmax-confidence-meter?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/softmax-confidence-meter)
![GitHub license](https://img.shields.io/github/license/ipusiron/softmax-confidence-meter)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/softmax-confidence-meter/)

**Day111 — Security Tools with Generative AI 200**

A browser-only learning tool that converts candidate scores into a softmax distribution and shows how temperature changes its shape. It presents distribution concentration, entropy, top share, and the gap between the first and second candidates together.

> [!IMPORTANT]
> Although the product name contains “Confidence,” the displayed value measures **output-distribution concentration**. Neither the maximum probability nor concentration guarantees prediction accuracy, model reliability, or safety.

[日本語版README](README.md)

## 🌐 Live demo

👉 [Open Softmax Confidence Meter](https://ipusiron.github.io/softmax-confidence-meter/)

Input and calculations stay in the browser. The application does not send them to a server.

## 📸 Screenshots

### English UI

![Distribution concentration meter in English](assets/screenshot-en.png)

### Japanese UI

![Distribution concentration meter in Japanese](assets/screenshot.png)

## ✨ Features

- Strictly validates `candidate: score` input and reports malformed lines with line numbers
- Uses numerically stable softmax by subtracting the maximum score before exponentiation
- Compares distribution changes over temperature `T = 0.10–5.00`
- Shows concentration, entropy, normalized entropy, top share, and top-to-second gap
- Shows the top five, omitted count and tail mass, with an expandable list of every candidate
- Provides four learning samples: basic, close scores, tied scores, and an extreme gap
- Provides equivalent Japanese and English interfaces and explanations
- Supports keyboard operation, ARIA tabs, disclosure controls, and live results
- Uses a mobile-first layout usable from a width of 320 px

## 🚀 Usage

1. Open the “Distribution meter” tab.
2. Enter one candidate per line in `candidate: score` format.
3. Adjust the temperature slider if needed.
4. Select “Calculate distribution.” You can also press `Ctrl+Enter`, or `⌘+Enter` on macOS.
5. Do not draw a conclusion from concentration alone. Check the top share, top gap, entropy, and full distribution.

Example input:

```text
Cat: 3.5
Dog: 2.1
Bird: 0.8
```

At temperature `T = 1`, the implementation produces:

| Candidate | Softmax output |
|---|---:|
| Cat | 76.1% |
| Dog | 18.8% |
| Bird | 5.1% |

## 🧾 Input contract

- Enter 2–200 candidates.
- Total input is limited to 20,000 characters and each candidate name to 100 characters.
- A score must be a finite decimal number or scientific notation, such as `-2`, `.5`, or `+1.2e-3`.
- The parser rejects `Infinity`, `-Infinity`, `NaN`, trailing text such as `1junk`, and multiple-colon input such as `A:1:2`.
- A line containing only a number receives an automatic candidate number.
- Blank lines are ignored. Invalid nonblank lines are all reported instead of being silently discarded.

## 🧮 Calculation

For candidate score `z_i`, temperature `T`, and maximum score `m`, softmax output `p_i` is:

```text
p_i = exp((z_i - m) / T) / Σ_j exp((z_j - m) / T)
```

Subtracting the maximum first avoids overflow such as `exp(1000)`. Adding the same finite offset to every score does not change the distribution.

Distribution concentration `C` is derived from entropy `H(p)`, using natural logarithms, and candidate count `n`:

```text
H(p) = -Σ_i p_i log(p_i)
C = 1 - H(p) / log(n)
```

- A uniform distribution has `C = 0`.
- `C` approaches 1 as probability mass concentrates on one candidate.
- Multiplying every score by the same factor sharpens the distribution even though ranking is unchanged.
- Multiplying both scores and temperature by the same factor leaves the distribution unchanged.

## ⚠️ Interpretation and limitations

Softmax output is a set of relative weights among the supplied candidates. A 90% maximum does not mean that the candidate has a 90% chance of being correct. A large score gap or small temperature alone can push the maximum close to 100%.

Distribution concentration describes how peaked the distribution is. It does not measure:

- whether the prediction is correct;
- whether the model is probability-calibrated;
- whether the input lies within the training distribution;
- whether the model or decision is safe or fair; or
- whether the correct answer exists in the candidate set.

To assess reliability, use separate labeled data and metrics appropriate to the task, such as accuracy, reliability diagrams, expected calibration error (ECE), and Brier score.

## 🎯 Use cases

### Experience the effect of score scale

`3, 2, 1` and `30, 20, 10` have the same ranking, but the latter is much more concentrated at the same temperature. This demonstrates that ranking alone does not determine softmax output.

### Teach temperature adjustment

Move temperature while keeping the scores fixed. The distribution becomes sharper at low temperature and flatter at high temperature, building intuition for temperature in generation and classification.

### Inspect the risk of viewing only top candidates

Enter six or more candidates and inspect the probability mass left outside the top five. This helps demonstrate why a displayed top list should not stand in for the whole distribution.

### Prepare expectations for implementation tests

Enter small finite score sets and compare probability sums, ranking, and temperature response with another softmax implementation. This application is not a cryptographic or statistical verifier.

## 🔗 Related tools

- [Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/) — Observes entropy in strings or token sequences. Its subject differs from this tool’s entropy over a candidate distribution.
- [InfoQuantity Academy](https://ipusiron.github.io/infoquantity-academy/) — Teaches information content and entropy with visual explanations.

## 🔐 Security and privacy

- No external library, CDN, or analytics service is used.
- Input is processed only in the browser and is not sent over the network.
- Rendering uses `textContent` and DOM APIs, so input is not interpreted as HTML.
- A Content Security Policy restricts scripts, styles, and connections to the same origin.
- Only the language preference is stored in `localStorage`; candidate names and scores are not stored.
- GitHub Pages cannot configure arbitrary response headers, so this deployment does not provide clickjacking protection through `X-Frame-Options`.

This application is not designed to handle secrets. Do not enter sensitive candidate names or scores on public or shared devices.

## 🧪 Local use and tests

No build or dependency installation is required. Open `index.html` directly or serve the directory with any static HTTP server.

Run the automated tests with Node.js 22 or later:

```bash
npm test
```

Tests cover strict parsing, numerical stability, concentration, bilingual message parity, CSP and ARIA structure, safe DOM rendering, and the README calculation example.

## 📁 Directory structure

```text
softmax-confidence-meter/
├── .github/
│   └── workflows/
│       └── test.yml             # Node.js tests on push and pull requests
├── assets/
│   ├── screenshot.png           # Japanese UI screenshot
│   └── screenshot-en.png        # English UI screenshot
├── css/
│   └── style.css                # Mobile-first UI styles
├── docs/
│   ├── SPEC.md                  # Calculation, input, and non-goal specification
│   └── UI_SPEC.md               # UI and accessibility specification
├── js/
│   ├── core.js                  # DOM-independent parser and calculations
│   ├── i18n.js                  # Japanese/English messages and preference
│   └── main.js                  # Tabs, input handling, and safe rendering
├── scripts/
│   └── browser-check.mjs        # Browser smoke test using Edge
├── test/
│   ├── core.test.js             # Core unit tests
│   ├── i18n.test.js             # Translation parity tests
│   └── static.test.js           # HTML, JavaScript, and documentation regressions
├── .gitignore                   # Git ignore rules
├── .nojekyll                    # Disables Jekyll on GitHub Pages
├── CLAUDE.md                    # Repository development rules
├── LICENSE                      # MIT License
├── README.en.md                 # English README
├── README.md                    # Japanese README
├── index.html                   # Application entry point
└── package.json                 # Test command and Node.js requirement
```

## 📄 License

Released under the MIT License. See [LICENSE](LICENSE).

## 🛠️ About this project

This tool is part of the “Security Tools with Generative AI 200” project. See [the project page](https://akademeia.info/?page_id=44607) for details and other tools.
