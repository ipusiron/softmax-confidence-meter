(function startApplication() {
  'use strict';

  const core = globalThis.SoftmaxCore;
  const i18n = globalThis.SoftmaxI18n;
  if (!core || !i18n) return;

  const elements = {
    languageToggle: document.getElementById('language-toggle'),
    tabs: Array.from(document.querySelectorAll('[role="tab"]')),
    panels: Array.from(document.querySelectorAll('[role="tabpanel"]')),
    accordionButtons: Array.from(document.querySelectorAll('.accordion-button')),
    input: document.getElementById('candidate-input'),
    temperature: document.getElementById('temperature'),
    temperatureOutput: document.getElementById('temperature-output'),
    sampleButtons: Array.from(document.querySelectorAll('[data-sample]')),
    calculateButton: document.getElementById('calculate-button'),
    clearButton: document.getElementById('clear-button'),
    errorBox: document.getElementById('error-box'),
    errorList: document.getElementById('error-list'),
    resultEmpty: document.getElementById('result-empty'),
    resultContent: document.getElementById('result-content'),
    concentrationValue: document.getElementById('concentration-value'),
    concentrationProgress: document.getElementById('concentration-progress'),
    metricsList: document.getElementById('metrics-list'),
    topCandidates: document.getElementById('top-candidates'),
    tailSummary: document.getElementById('tail-summary'),
    fullResults: document.getElementById('full-results'),
    allCandidates: document.getElementById('all-candidates'),
    demoBasic: document.getElementById('demo-basic'),
    demoTemperature: document.getElementById('demo-temperature')
  };

  const sampleData = {
    ja: {
      basic: '猫: 3.5\n犬: 2.1\n鳥: 0.8',
      close: '案A: 2.05\n案B: 2.00\n案C: 1.95',
      uniform: '赤: 1\n青: 1\n緑: 1\n黄: 1',
      extreme: '候補A: 1000\n候補B: 900\n候補C: -1000'
    },
    en: {
      basic: 'Cat: 3.5\nDog: 2.1\nBird: 0.8',
      close: 'Option A: 2.05\nOption B: 2.00\nOption C: 1.95',
      uniform: 'Red: 1\nBlue: 1\nGreen: 1\nYellow: 1',
      extreme: 'Candidate A: 1000\nCandidate B: 900\nCandidate C: -1000'
    }
  };

  function availableStorage() {
    try {
      return globalThis.localStorage;
    } catch (_error) {
      return null;
    }
  }

  const state = {
    language: i18n.getStoredLanguage(availableStorage()),
    activeTab: 'basics',
    lastAnalysis: null,
    lastErrors: [],
    lastSample: null,
    resultIsCurrent: false
  };

  function t(key, params) {
    return i18n.translate(state.language, key, params);
  }

  function replaceChildren(node, children = []) {
    node.replaceChildren(...children);
  }

  function formatNumber(value, maximumFractionDigits = 3) {
    const absolute = Math.abs(value);
    if (absolute >= 1e9 || (absolute > 0 && absolute < 1e-6)) {
      return value.toExponential(Math.min(maximumFractionDigits, 6));
    }
    return new Intl.NumberFormat(state.language === 'ja' ? 'ja-JP' : 'en-US', {
      maximumFractionDigits,
      minimumFractionDigits: 0
    }).format(value);
  }

  function formatPercent(value, digits = 1) {
    return (value * 100).toFixed(digits);
  }

  function candidateName(candidate) {
    return candidate.name || t('candidateAuto', { number: candidate.autoIndex });
  }

  function applyStaticTranslations() {
    document.documentElement.lang = state.language;
    document.title = t('documentTitle');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('metaDescription'));

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });
  }

  function selectTab(tabName, moveFocus = false) {
    state.activeTab = tabName;
    elements.tabs.forEach((tab) => {
      const selected = tab.dataset.tab === tabName;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    elements.panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tabName;
    });
  }

  function handleTabKeydown(event) {
    const currentIndex = elements.tabs.indexOf(event.currentTarget);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % elements.tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + elements.tabs.length) % elements.tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = elements.tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(elements.tabs[nextIndex].dataset.tab, true);
  }

  function toggleAccordion(button) {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  }

  function createBarRow(label, probability) {
    const row = document.createElement('div');
    row.className = 'bar-row';

    const name = document.createElement('span');
    name.className = 'bar-label';
    name.textContent = label;

    const progress = document.createElement('progress');
    const percent = formatPercent(probability);
    progress.max = 100;
    progress.value = probability * 100;
    progress.textContent = `${percent}%`;
    progress.setAttribute('aria-label', t('chartLabel', { label, share: percent }));

    const value = document.createElement('span');
    value.textContent = `${percent}%`;

    row.append(name, progress, value);
    return row;
  }

  function renderDemoGroup(title, scores, temperature) {
    const group = document.createElement('div');
    group.className = 'demo-group';
    const heading = document.createElement('p');
    heading.className = 'demo-group-title';
    heading.textContent = title;
    group.append(heading);
    const probabilities = core.softmax(scores, temperature);
    probabilities.forEach((probability, index) => {
      group.append(createBarRow(t('candidateAuto', { number: index + 1 }), probability));
    });
    return group;
  }

  function renderDemos() {
    replaceChildren(elements.demoBasic, [
      renderDemoGroup('scores: 3, 2, 1 / T = 1', [3, 2, 1], 1)
    ]);
    elements.demoTemperature.classList.add('temperature-demo');
    replaceChildren(elements.demoTemperature, [
      renderDemoGroup('T = 0.5', [3, 2, 1], 0.5),
      renderDemoGroup('T = 1', [3, 2, 1], 1),
      renderDemoGroup('T = 2', [3, 2, 1], 2)
    ]);
  }

  function errorMessage(issue) {
    const key = `error${issue.code.charAt(0).toUpperCase()}${issue.code.slice(1)}`;
    const message = t(key, issue.params);
    return issue.line ? `${t('linePrefix', { line: issue.line })}${message}` : message;
  }

  function renderErrors() {
    if (state.lastErrors.length === 0) {
      elements.errorBox.hidden = true;
      replaceChildren(elements.errorList);
      return;
    }
    const items = state.lastErrors.map((issue) => {
      const item = document.createElement('li');
      item.textContent = errorMessage(issue);
      return item;
    });
    replaceChildren(elements.errorList, items);
    elements.errorBox.hidden = false;
  }

  function metricItem(labelKey, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'metric-item';
    const term = document.createElement('dt');
    term.textContent = t(labelKey);
    const description = document.createElement('dd');
    description.textContent = value;
    wrapper.append(term, description);
    return wrapper;
  }

  function candidateRow(candidate, rank) {
    const item = document.createElement('li');
    item.className = 'candidate-row';

    const heading = document.createElement('div');
    heading.className = 'candidate-heading';
    const rankElement = document.createElement('span');
    rankElement.className = 'rank';
    rankElement.textContent = t('rankLabel', { rank });
    const name = document.createElement('span');
    name.className = 'candidate-name';
    name.textContent = candidateName(candidate);
    const share = document.createElement('span');
    share.className = 'candidate-share';
    share.textContent = t('shareLabel', { value: formatPercent(candidate.probability) });
    heading.append(rankElement, name, share);

    const progress = document.createElement('progress');
    progress.max = 100;
    progress.value = candidate.probability * 100;
    progress.textContent = share.textContent;
    progress.setAttribute('aria-label', t('chartLabel', {
      label: candidateName(candidate),
      share: formatPercent(candidate.probability)
    }));

    const score = document.createElement('p');
    score.className = 'candidate-score';
    score.textContent = t('scoreLabel', { value: formatNumber(candidate.score, 6) });
    item.append(heading, progress, score);
    return item;
  }

  function renderResult() {
    const analysis = state.lastAnalysis;
    if (!analysis || !state.resultIsCurrent) {
      elements.resultEmpty.hidden = false;
      elements.resultContent.hidden = true;
      return;
    }

    const concentrationPercent = formatPercent(analysis.concentration);
    elements.concentrationValue.textContent = `${concentrationPercent}%`;
    elements.concentrationProgress.value = analysis.concentration * 100;
    elements.concentrationProgress.textContent = `${concentrationPercent}%`;

    replaceChildren(elements.metricsList, [
      metricItem('candidateCountLabel', t('candidateCountValue', { count: analysis.candidateCount })),
      metricItem('currentTemperatureLabel', formatNumber(analysis.temperature, 2)),
      metricItem('scoreRangeLabel', t('scoreRangeValue', {
        min: formatNumber(analysis.scoreMin, 6), max: formatNumber(analysis.scoreMax, 6)
      })),
      metricItem('topShareLabel', t('percentValue', { value: formatPercent(analysis.topShare) })),
      metricItem('topGapLabel', t('pointsValue', { value: formatPercent(analysis.topGap) })),
      metricItem('entropyLabel', t('entropyValue', { value: formatNumber(analysis.entropy, 4) })),
      metricItem('normalizedEntropyLabel', t('percentValue', { value: formatPercent(analysis.normalizedEntropy) }))
    ]);

    replaceChildren(elements.topCandidates, analysis.ranked.slice(0, analysis.topLimit)
      .map((candidate, index) => candidateRow(candidate, index + 1)));
    elements.tailSummary.textContent = analysis.tailCount > 0
      ? t('tailSummary', { count: analysis.tailCount, mass: formatPercent(analysis.tailMass) })
      : t('allShown', { count: analysis.candidateCount });
    elements.fullResults.hidden = analysis.tailCount === 0;
    replaceChildren(elements.allCandidates, analysis.ranked
      .map((candidate, index) => candidateRow(candidate, index + 1)));

    elements.resultEmpty.hidden = true;
    elements.resultContent.hidden = false;
  }

  function invalidateResult() {
    state.resultIsCurrent = false;
    state.lastAnalysis = null;
    state.lastErrors = [];
    renderErrors();
    renderResult();
  }

  function calculate() {
    const parsed = core.parseCandidateInput(elements.input.value);
    state.lastErrors = parsed.errors;
    state.lastAnalysis = null;
    state.resultIsCurrent = false;

    if (parsed.errors.length === 0) {
      try {
        state.lastAnalysis = core.analyzeCandidates(
          parsed.candidates,
          Number(elements.temperature.value),
          core.DEFAULT_TOP_LIMIT
        );
        state.resultIsCurrent = true;
      } catch (_error) {
        state.lastErrors = [{ code: 'calculation', params: {}, line: null }];
      }
    }

    renderErrors();
    renderResult();
  }

  function loadSample(sampleName) {
    state.lastSample = sampleName;
    elements.input.value = sampleData[state.language][sampleName];
    calculate();
  }

  function changeLanguage() {
    state.language = state.language === 'ja' ? 'en' : 'ja';
    i18n.setStoredLanguage(availableStorage(), state.language);
    if (state.lastSample) elements.input.value = sampleData[state.language][state.lastSample];
    applyStaticTranslations();
    renderDemos();
    renderErrors();
    if (state.lastSample && state.resultIsCurrent) calculate();
    else renderResult();
  }

  elements.languageToggle.addEventListener('click', changeLanguage);
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', handleTabKeydown);
  });
  elements.accordionButtons.forEach((button) => {
    button.addEventListener('click', () => toggleAccordion(button));
  });
  elements.sampleButtons.forEach((button) => {
    button.addEventListener('click', () => loadSample(button.dataset.sample));
  });
  elements.calculateButton.addEventListener('click', calculate);
  elements.clearButton.addEventListener('click', () => {
    elements.input.value = '';
    state.lastSample = null;
    invalidateResult();
    elements.input.focus();
  });
  elements.input.addEventListener('input', () => {
    state.lastSample = null;
    invalidateResult();
  });
  elements.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      calculate();
    }
  });
  elements.temperature.addEventListener('input', () => {
    elements.temperatureOutput.value = Number(elements.temperature.value).toFixed(2);
    if (state.resultIsCurrent) calculate();
  });

  elements.temperatureOutput.value = Number(elements.temperature.value).toFixed(2);
  applyStaticTranslations();
  selectTab(state.activeTab);
  renderDemos();
  renderErrors();
  renderResult();
}());
