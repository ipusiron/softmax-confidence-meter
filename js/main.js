/**
 * Softmax Confidence Meter
 * Main JavaScript - softmax計算、自信度測定、UI制御
 */

// ========================================
// Softmax & Confidence Calculation
// ========================================

/**
 * 温度付きsoftmax関数
 * @param {number[]} scores - スコア配列
 * @param {number} temperature - 温度パラメータ (default: 1.0)
 * @returns {number[]} 確率分布
 */
function softmax(scores, temperature = 1.0) {
  if (scores.length === 0) return [];
  if (scores.length === 1) return [1.0];

  // 温度でスケーリング
  const scaled = scores.map(s => s / temperature);

  // 数値安定性のため最大値を引く
  const maxVal = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);

  return exps.map(e => e / sumExps);
}

/**
 * エントロピー計算
 * @param {number[]} probs - 確率分布
 * @returns {number} エントロピー値
 */
function entropy(probs) {
  if (probs.length <= 1) return 0;

  let h = 0;
  for (const p of probs) {
    if (p > 0) {
      h -= p * Math.log(p);
    }
  }
  return h;
}

/**
 * 自信度（Confidence）計算
 * 正規化エントロピーを使用: Confidence = (1 - H / log(N)) * 100
 * @param {number[]} probs - 確率分布
 * @returns {number} 自信度 (0-100)
 */
function calculateConfidence(probs) {
  if (probs.length <= 1) return 100;

  const h = entropy(probs);
  const maxEntropy = Math.log(probs.length);
  const normalizedEntropy = h / maxEntropy;
  const confidence = (1 - normalizedEntropy) * 100;

  return Math.max(0, Math.min(100, confidence));
}

/**
 * 自信度に基づく判定ラベル
 * @param {number} confidence - 自信度 (0-100)
 * @returns {{label: string, class: string, reason: string}}
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 70) {
    return {
      label: '自信あり',
      class: 'high',
      reason: '1位が明確に突出しています'
    };
  } else if (confidence >= 40) {
    return {
      label: '判断が分かれる',
      class: 'medium',
      reason: '複数の候補が競合しています'
    };
  } else {
    return {
      label: '判断困難',
      class: 'low',
      reason: '分布がほぼ均等で決め手がありません'
    };
  }
}

// ========================================
// Security Utilities
// ========================================

/**
 * HTMLエスケープ（XSS対策）
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープ済み文字列
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========================================
// Chart Rendering
// ========================================

/**
 * 棒グラフを描画
 * @param {string} containerId - コンテナ要素のID
 * @param {Array<{label: string, value: number}>} data - データ配列
 * @param {object} options - オプション
 */
function renderBarChart(containerId, data, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { maxBars = 5, showPercent = true } = options;
  const displayData = data.slice(0, maxBars);

  let html = '<div class="bar-chart">';
  for (const item of displayData) {
    const percent = (item.value * 100).toFixed(1);
    const width = Math.max(item.value * 100, 0.5);
    const safeLabel = escapeHtml(item.label);
    html += `
      <div class="bar-row">
        <div class="bar-label" title="${safeLabel}">${safeLabel}</div>
        <div class="bar-wrapper">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
        <div class="bar-value">${showPercent ? percent + '%' : ''}</div>
      </div>
    `;
  }
  html += '</div>';

  container.innerHTML = html;
}

// ========================================
// Demo Charts Initialization
// ========================================

// デモ用のスコアデータ
const DEMO_TEMP_SCORES = [2.5, 1.8, 1.2, 0.5];
const DEMO_TEMP_LABELS = ['候補A', '候補B', '候補C', '候補D'];

function initDemoCharts() {
  // Tab1: softmax基礎 - 基本的なsoftmaxデモ
  const basicScores = [3.0, 1.0, 0.5];
  const basicProbs = softmax(basicScores, 1.0);
  renderBarChart('chart-basic', [
    { label: 'A', value: basicProbs[0] },
    { label: 'B', value: basicProbs[1] },
    { label: 'C', value: basicProbs[2] },
  ]);

  // 温度インタラクティブデモ（初期表示）
  updateTempDemo(1.0);

  // 分布の形（独走 vs 団子）
  const soloScores = [5.0, 1.0, 0.8, 0.5];
  const soloProbs = softmax(soloScores, 1.0);
  renderBarChart('chart-solo', [
    { label: '1位', value: soloProbs[0] },
    { label: '2位', value: soloProbs[1] },
    { label: '3位', value: soloProbs[2] },
    { label: '4位', value: soloProbs[3] },
  ]);

  const dangoScores = [2.1, 2.0, 1.9, 1.8];
  const dangoProbs = softmax(dangoScores, 1.0);
  renderBarChart('chart-dango', [
    { label: '1位', value: dangoProbs[0] },
    { label: '2位', value: dangoProbs[1] },
    { label: '3位', value: dangoProbs[2] },
    { label: '4位', value: dangoProbs[3] },
  ]);
}

/**
 * 温度デモを更新
 * @param {number} temperature - 温度値
 */
function updateTempDemo(temperature) {
  const probs = softmax(DEMO_TEMP_SCORES, temperature);
  const confidence = calculateConfidence(probs);

  // チャート更新
  renderBarChart('chart-temp-interactive',
    DEMO_TEMP_LABELS.map((l, i) => ({ label: l, value: probs[i] }))
  );

  // 自信度更新
  const confDisplay = document.getElementById('demo-confidence');
  if (confDisplay) {
    confDisplay.textContent = confidence.toFixed(1);
  }

  // ステータス更新
  const statusDisplay = document.getElementById('temp-status');
  if (statusDisplay) {
    let status, statusClass;
    if (temperature <= 0.5) {
      status = '🔥 低温：1位が独走、高い自信度';
      statusClass = 'status-hot';
    } else if (temperature <= 1.2) {
      status = '⚖️ 中温：標準的な分布';
      statusClass = 'status-normal';
    } else if (temperature <= 2.0) {
      status = '❄️ 高温：分布が平坦化';
      statusClass = 'status-cool';
    } else {
      status = '🧊 超高温：ほぼ均等分布、判断困難';
      statusClass = 'status-cold';
    }
    statusDisplay.textContent = status;
    statusDisplay.className = `temp-status ${statusClass}`;
  }
}

// ========================================
// UI Interactions
// ========================================

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) {
          content.classList.add('active');
        }
      });
    });
  });
}

function initAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('active');
    });
  });
}

// サンプルデータ
const SAMPLE_DATA = {
  dominant: `候補A:5.0
候補B:1.0
候補C:0.5
候補D:0.2`,
  basic: `候補A:3.5
候補B:2.1
候補C:1.2
候補D:0.5`,
  close: `選択肢1:2.3
選択肢2:2.2
選択肢3:2.1
選択肢4:2.0`,
  scores: `4.2
2.8
1.5
0.9`
};

function initCandidateInput() {
  const textarea = document.getElementById('candidate-input');
  const sampleBtns = document.querySelectorAll('.sample-btn');
  const clearBtn = document.getElementById('clear-btn');

  // リアルタイム計算（入力変更時）
  textarea.addEventListener('input', debounce(() => {
    calculateAndDisplay();
  }, 300));

  // Enterキー対応（Shift+Enterは改行）
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      calculateAndDisplay();
    }
  });

  // サンプルボタン（クリック時に自動計算）
  sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sampleKey = btn.dataset.sample;
      if (SAMPLE_DATA[sampleKey]) {
        textarea.value = SAMPLE_DATA[sampleKey];
        calculateAndDisplay();
      }
    });
  });

  // クリアボタン
  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    clearResults();
  });

  // 計算ボタン
  const calcBtn = document.getElementById('calculate-btn');
  calcBtn.addEventListener('click', () => {
    calculateAndDisplay();
  });
}

/**
 * デバウンス関数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 結果をクリア
 */
function clearResults() {
  const resultEmpty = document.getElementById('result-empty');
  const resultContent = document.getElementById('result-content');
  const inputError = document.getElementById('input-error');

  resultEmpty.style.display = 'block';
  resultContent.style.display = 'none';
  inputError.textContent = '';
  inputError.classList.remove('visible');
}

/**
 * エラーを表示
 */
function showError(message) {
  const inputError = document.getElementById('input-error');
  inputError.textContent = message;
  inputError.classList.add('visible');
}

/**
 * テキストエリアの入力をパースして候補配列を返す
 * 書式: 1行に1候補、「スコア」または「候補名:スコア」
 * @returns {Array<{name: string, score: number}>}
 */
function parseCandidateInput() {
  const textarea = document.getElementById('candidate-input');
  const lines = textarea.value.trim().split('\n');
  const candidates = [];

  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) return;

    let name, score;

    if (line.includes(':')) {
      // 候補名:スコア 形式
      const parts = line.split(':');
      name = parts[0].trim();
      score = parseFloat(parts.slice(1).join(':').trim());
    } else {
      // スコアのみ
      name = `候補${index + 1}`;
      score = parseFloat(line);
    }

    if (!isNaN(score)) {
      candidates.push({ name, score });
    }
  });

  return candidates;
}

function initTemperatureSlider() {
  const slider = document.getElementById('temp-slider');
  const valueDisplay = document.getElementById('temp-value');

  slider.addEventListener('input', () => {
    valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
    // 温度変更時にリアルタイム再計算
    calculateAndDisplay();
  });

  // デモ用スライダー（インタラクティブ）
  const demoSlider = document.getElementById('demo-temp-slider');
  const demoValueDisplay = document.getElementById('demo-temp-value');

  if (demoSlider && demoValueDisplay) {
    demoSlider.addEventListener('input', () => {
      const temp = parseFloat(demoSlider.value);
      demoValueDisplay.textContent = temp.toFixed(1);
      updateTempDemo(temp);
    });
  }
}


function calculateAndDisplay() {
  const resultEmpty = document.getElementById('result-empty');
  const resultContent = document.getElementById('result-content');
  const inputError = document.getElementById('input-error');

  // エラーをクリア
  inputError.textContent = '';
  inputError.classList.remove('visible');

  // 入力値を取得
  const candidates = parseCandidateInput();

  // 入力が空または不足の場合
  if (candidates.length === 0) {
    resultEmpty.style.display = 'block';
    resultContent.style.display = 'none';
    return;
  }

  if (candidates.length < 2) {
    showError('2つ以上のスコアを入力してください');
    resultEmpty.style.display = 'block';
    resultContent.style.display = 'none';
    return;
  }

  // 結果セクションを表示
  resultEmpty.style.display = 'none';
  resultContent.style.display = 'block';

  // 温度を取得
  const temperature = parseFloat(document.getElementById('temp-slider').value);

  // softmax計算
  const scores = candidates.map(c => c.score);
  const probs = softmax(scores, temperature);

  // 確率を候補に紐付け、ソート
  const results = candidates.map((c, i) => ({
    label: c.name,
    score: c.score,
    value: probs[i]
  }));
  results.sort((a, b) => b.value - a.value);

  // 自信度計算
  const confidence = calculateConfidence(probs);
  const labelInfo = getConfidenceLabel(confidence);

  // 表示更新
  updateMeterDisplay(confidence, labelInfo);
  renderBarChart('chart-result', results, { maxBars: 5 });
}

function updateMeterDisplay(confidence, labelInfo) {
  const meterFill = document.getElementById('meter-fill');
  const confidenceValue = document.getElementById('confidence-value');
  const confidenceLabel = document.getElementById('confidence-label');
  const confidenceReason = document.getElementById('confidence-reason');

  // メーターのfillを更新（右側からカバーするので、100-confidenceの幅）
  meterFill.style.width = `${100 - confidence}%`;

  // 数値表示
  confidenceValue.textContent = `${confidence.toFixed(1)}%`;

  // ラベル表示
  confidenceLabel.textContent = labelInfo.label;
  confidenceLabel.className = `confidence-label ${labelInfo.class}`;

  // 理由表示
  confidenceReason.textContent = labelInfo.reason;
  confidenceReason.className = `confidence-reason ${labelInfo.class}`;
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAccordion();
  initCandidateInput();
  initTemperatureSlider();
  initDemoCharts();
});
