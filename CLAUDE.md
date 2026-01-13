# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Softmax Confidence Meter is an educational tool that visualizes softmax probability distributions to help users judge whether to trust ranked results. It displays a "confidence meter" based on normalized entropy rather than automatically deciding outcomes.

## Architecture

- **Static web application** (HTML/CSS/JS) for GitHub Pages deployment
- **No build system** - vanilla JavaScript, no bundler or transpilation
- **File structure**:
  - `index.html` - main entry point
  - `css/` - stylesheets (dark/cyber theme)
  - `js/` - JavaScript modules
  - `assets/` - images and static resources

## Technical Specifications

### Softmax Implementation
- Temperature-parameterized softmax: range 0.1–5.0, default 1.0
- Confidence calculation using normalized entropy: `Confidence = (1 - H / log(N)) * 100`

### Confidence Thresholds
- ≥70%: High confidence (自信あり)
- 40–70%: Uncertain (判断が分かれる)
- <40%: Low confidence (判断困難)

## UI Requirements

- Japanese language interface
- Dark theme with cyber aesthetic
- Diagram-first, minimal text approach
- Three-tab structure:
  1. **softmax基礎** - Accordion-style educational content with bar chart visualizations
  2. **Confidence Meter** - Input form, temperature slider, meter display, top-5 probability bar graph
  3. **関連ツール・発展** - Link cards to related resources

## Development

No build commands required. Open `index.html` directly in a browser or serve with any static file server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deployment

Deployed to GitHub Pages. The `.nojekyll` file is present to disable Jekyll processing.
