/**
 * Japanese/English messages and language preference helpers.
 * Exposed as SoftmaxI18n in browsers and as CommonJS exports in Node.js.
 */
(function exposeI18n(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SoftmaxI18n = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildI18n() {
  'use strict';

  const STORAGE_KEY = 'softmax-confidence-meter-language';
  const DEFAULT_LANGUAGE = 'ja';

  const messages = {
    ja: {
      documentTitle: 'Softmax Confidence Meter - 分布集中度を観察する学習ツール',
      metaDescription: 'softmaxの温度とスコアが出力分布の集中度に与える影響を、ブラウザー内だけで観察する学習ツールです。',
      title: 'Softmax Confidence Meter',
      subtitle: 'スコアと温度から、softmax出力分布の集中度を観察する',
      scopeNote: '最大確率は正解率や信頼性を保証しません。このツールは分布の形を学ぶためのもので、モデル評価には使えません。',
      languageButton: 'English',
      languageButtonLabel: '表示言語を英語に切り替える',
      tablistLabel: '学習内容',
      tabBasics: 'softmaxの基本',
      tabMeter: '分布集中度メーター',
      tabRelated: '関連ツール・発展',
      basicsHeading: 'softmaxの基本',
      basicsLead: 'softmaxは、複数の実数スコアを合計1の分布に変換します。順位だけでなく差の大きさと温度に反応します。',
      accordionLabel: 'softmaxの解説',
      whatTitle: 'softmaxとは',
      whatBody1: '各候補のスコアを指数関数で変換し、全候補で正規化します。出力は0から1の範囲で、合計は1です。',
      whatBody2: '出力は候補間の相対的な重みです。最大値を、その候補が正しい確率と自動的に解釈することはできません。',
      temperatureTitle: '温度 T の役割',
      temperatureBody1: 'Tが小さいほど最大スコアへ集中し、Tが大きいほど平らな分布になります。Tは0より大きい値です。',
      temperatureBody2: '同じスコアでも温度を変えれば分布は変わります。スコア全体の尺度を変えることも、温度を逆向きに変えることと同様の効果を持ちます。',
      shapeTitle: '集中度の読み方',
      shapeBody1: 'このツールの集中度は 1 - H(p) / log(n) です。H(p)はエントロピー、nは候補数です。均等分布で0%、1候補に集中するほど100%に近づきます。',
      shapeBody2: '候補数が異なる分布も正規化して比較できますが、これは分布の尖り方だけを表します。予測の正しさや校正状態は表しません。',
      misconceptionTitle: '「高い最大確率」の注意点',
      misconceptionBody1: '大きなスコア差や小さな温度だけでも、最大確率は100%近くになります。入力にInfinityやNaNを使うことはできません。',
      misconceptionBody2: '実際の信頼性を評価するには、正解ラベルを含む別データで精度、校正誤差、信頼度曲線などを検証する必要があります。',
      meterHeading: '分布集中度メーター',
      meterLead: '「候補名: スコア」を1行ずつ入力してください。数値は有限の10進数または指数表記だけを受け付けます。',
      candidatesLabel: '候補とスコア',
      candidatesHelp: '2〜200候補、各行は「候補名: スコア」。例: 猫: 3.5',
      candidatesPlaceholder: '猫: 3.5\n犬: 2.1\n鳥: 0.8',
      samplesLabel: '学習用サンプル',
      sampleBasic: '基本例',
      sampleClose: '僅差',
      sampleUniform: '同点',
      sampleExtreme: '極端な差',
      temperatureLabel: '温度 T',
      temperatureHelp: '0.10〜5.00。小さいほど集中し、大きいほど平らになります。',
      calculateButton: '分布を計算',
      clearButton: '入力と結果を消す',
      shortcutHint: 'Ctrl+Enter（macOSは⌘+Enter）でも計算できます。',
      errorsHeading: '入力を確認してください',
      resultHeading: '分析結果',
      resultEmpty: '有効な入力で計算すると、ここに分布と指標が表示されます。',
      concentrationLabel: '分布集中度',
      concentrationHelp: '正規化エントロピーから求めた分布の尖り方です。正解率や信頼度ではありません。',
      metricsHeading: '分布の指標',
      candidateCountLabel: '候補数',
      currentTemperatureLabel: '温度',
      scoreRangeLabel: 'スコア範囲',
      topShareLabel: '首位の割合',
      topGapLabel: '首位と2位の差',
      entropyLabel: 'エントロピー',
      normalizedEntropyLabel: '正規化エントロピー',
      distributionHeading: '上位候補',
      fullResultsSummary: '全候補の結果を表示',
      tailNone: '全候補を表示しています。',
      relatedHeading: '関連ツール・発展',
      relatedLead: 'softmaxの出力だけでは分からない内容は、目的に合う別の評価で確認します。',
      relatedCalibrationTitle: '確率校正',
      relatedCalibrationBody: '予測確率と実際の正解率が対応しているかは、正解ラベル付きデータで信頼度曲線、ECE、Brier scoreなどを測って調べます。',
      relatedRobustnessTitle: 'スコア変換への感度',
      relatedRobustnessBody: 'スコアの倍率や温度を変え、順位が同じでも分布が大きく変わることを比較してください。',
      relatedUncertaintyTitle: '不確実性の評価',
      relatedUncertaintyBody: 'エントロピーは分布の散らばりを示しますが、未知データやモデル誤りを単独で検出できません。複数の検査と組み合わせます。',
      relatedPrivacyTitle: 'プライバシー',
      relatedPrivacyBody: '入力と計算はブラウザー内で完結し、サーバーへ送信しません。機密データの貼り付けは避けてください。',
      relatedToolsTitle: '学習を続ける',
      relatedToolsBody: '入力データのエントロピーと、候補分布のエントロピーは別の概念です。目的に合う教材で比較してください。',
      tokenEntropyLink: 'Token Entropy Estimatorを開く',
      infoQuantityLink: 'InfoQuantity Academyを開く',
      repositoryLink: 'GitHubリポジトリー',
      footerNote: '教育用デモです。意思決定やモデルの安全性・性能の証明には使えません。',
      noscript: 'このツールを使うにはJavaScriptを有効にしてください。',
      candidateAuto: '候補{number}',
      rankLabel: '{rank}位',
      scoreLabel: 'スコア {value}',
      shareLabel: '{value}%',
      candidateCountValue: '{count}件',
      scoreRangeValue: '{min} 〜 {max}',
      pointsValue: '{value}ポイント',
      entropyValue: '{value} nats',
      percentValue: '{value}%',
      tailSummary: 'ほか{count}件の合計: {mass}%',
      allShown: '全{count}件を表示中',
      linePrefix: '{line}行目: ',
      errorEmptyInput: '候補とスコアを入力してください。',
      errorTooFewCandidates: '候補は2件以上必要です（現在{count}件）。',
      errorTooManyCandidates: '候補は{max}件以下にしてください（現在{count}件）。',
      errorInputTooLong: '入力は{max}文字以下にしてください（現在{count}文字）。',
      errorEmptyLabel: '候補名がありません。コロンの左側に名前を入力してください。',
      errorLabelTooLong: '候補名は{max}文字以下にしてください。',
      errorInvalidScore: '有限の数値を1つ入力してください。行の形式は「候補名: スコア」です。',
      errorNonFiniteScore: 'Infinity、-Infinity、NaNや、有限範囲を超える数値は使えません。',
      errorCalculation: '分布を計算できませんでした。入力値と温度を確認してください。',
      chartLabel: '{label}: {share}%'
    },
    en: {
      documentTitle: 'Softmax Confidence Meter - Distribution Concentration Learning Tool',
      metaDescription: 'A browser-only learning tool for observing how scores and temperature affect the concentration of a softmax output distribution.',
      title: 'Softmax Confidence Meter',
      subtitle: 'Observe softmax output concentration from scores and temperature',
      scopeNote: 'The largest probability does not guarantee correctness or reliability. This tool teaches distribution shape; it does not evaluate a model.',
      languageButton: '日本語',
      languageButtonLabel: 'Switch the display language to Japanese',
      tablistLabel: 'Learning sections',
      tabBasics: 'Softmax basics',
      tabMeter: 'Distribution meter',
      tabRelated: 'Related topics',
      basicsHeading: 'Softmax basics',
      basicsLead: 'Softmax converts multiple real-valued scores into a distribution whose values sum to 1. It responds to score gaps and temperature, not only ranking.',
      accordionLabel: 'Softmax explanations',
      whatTitle: 'What is softmax?',
      whatBody1: 'It applies an exponential transformation to each score and normalizes across all candidates. Every output is between 0 and 1, and the outputs sum to 1.',
      whatBody2: 'The outputs are relative weights among candidates. The largest value cannot automatically be interpreted as the probability that its candidate is correct.',
      temperatureTitle: 'The role of temperature T',
      temperatureBody1: 'A smaller T concentrates the distribution on the largest score. A larger T makes it flatter. T must be greater than zero.',
      temperatureBody2: 'Changing temperature changes the distribution even when scores stay fixed. Rescaling all scores has the inverse effect of rescaling temperature.',
      shapeTitle: 'Reading concentration',
      shapeBody1: 'This tool defines concentration as 1 - H(p) / log(n), where H(p) is entropy and n is the candidate count. It is 0% for a uniform distribution and approaches 100% as mass concentrates on one candidate.',
      shapeBody2: 'Normalization makes distributions with different candidate counts easier to compare, but the value describes only shape. It does not measure correctness or calibration.',
      misconceptionTitle: 'A caution about a “high maximum probability”',
      misconceptionBody1: 'Large score gaps or a small temperature alone can push the maximum probability close to 100%. Infinity and NaN are not valid inputs.',
      misconceptionBody2: 'To assess real reliability, use separate labeled data to measure accuracy, calibration error, reliability diagrams, and other suitable metrics.',
      meterHeading: 'Distribution concentration meter',
      meterLead: 'Enter one “candidate: score” per line. Scores must be finite decimal numbers or scientific notation.',
      candidatesLabel: 'Candidates and scores',
      candidatesHelp: '2–200 candidates. Each line uses “candidate: score”, for example, Cat: 3.5.',
      candidatesPlaceholder: 'Cat: 3.5\nDog: 2.1\nBird: 0.8',
      samplesLabel: 'Learning samples',
      sampleBasic: 'Basic',
      sampleClose: 'Close scores',
      sampleUniform: 'Tied scores',
      sampleExtreme: 'Extreme gap',
      temperatureLabel: 'Temperature T',
      temperatureHelp: '0.10–5.00. Smaller values concentrate; larger values flatten.',
      calculateButton: 'Calculate distribution',
      clearButton: 'Clear input and result',
      shortcutHint: 'You can also calculate with Ctrl+Enter (⌘+Enter on macOS).',
      errorsHeading: 'Check the input',
      resultHeading: 'Analysis result',
      resultEmpty: 'Calculate valid input to display the distribution and metrics here.',
      concentrationLabel: 'Distribution concentration',
      concentrationHelp: 'A shape measure derived from normalized entropy. It is not accuracy or confidence.',
      metricsHeading: 'Distribution metrics',
      candidateCountLabel: 'Candidates',
      currentTemperatureLabel: 'Temperature',
      scoreRangeLabel: 'Score range',
      topShareLabel: 'Top share',
      topGapLabel: 'Top-to-second gap',
      entropyLabel: 'Entropy',
      normalizedEntropyLabel: 'Normalized entropy',
      distributionHeading: 'Top candidates',
      fullResultsSummary: 'Show every candidate',
      tailNone: 'All candidates are shown.',
      relatedHeading: 'Related topics',
      relatedLead: 'Use a separate evaluation matched to the question when softmax output alone is insufficient.',
      relatedCalibrationTitle: 'Probability calibration',
      relatedCalibrationBody: 'Use labeled data and reliability diagrams, ECE, Brier score, or other suitable metrics to check whether predicted probabilities correspond to observed accuracy.',
      relatedRobustnessTitle: 'Sensitivity to score transformations',
      relatedRobustnessBody: 'Change the score multiplier or temperature to compare how the distribution can shift dramatically while the ranking remains unchanged.',
      relatedUncertaintyTitle: 'Uncertainty evaluation',
      relatedUncertaintyBody: 'Entropy describes spread, but cannot by itself detect unfamiliar data or model errors. Combine it with other checks.',
      relatedPrivacyTitle: 'Privacy',
      relatedPrivacyBody: 'Input and calculations stay in this browser and are not sent to a server. Avoid pasting sensitive data.',
      relatedToolsTitle: 'Continue learning',
      relatedToolsBody: 'Entropy in input data and entropy over a candidate distribution are different concepts. Compare them with the learning tool suited to your purpose.',
      tokenEntropyLink: 'Open Token Entropy Estimator',
      infoQuantityLink: 'Open InfoQuantity Academy',
      repositoryLink: 'GitHub repository',
      footerNote: 'Educational demonstration only. Do not use it as proof of decision quality, model safety, or model performance.',
      noscript: 'Enable JavaScript to use this tool.',
      candidateAuto: 'Candidate {number}',
      rankLabel: 'Rank {rank}',
      scoreLabel: 'Score {value}',
      shareLabel: '{value}%',
      candidateCountValue: '{count}',
      scoreRangeValue: '{min} to {max}',
      pointsValue: '{value} points',
      entropyValue: '{value} nats',
      percentValue: '{value}%',
      tailSummary: '{count} more candidates total {mass}%',
      allShown: 'Showing all {count} candidates',
      linePrefix: 'Line {line}: ',
      errorEmptyInput: 'Enter candidates and scores.',
      errorTooFewCandidates: 'Enter at least 2 candidates (currently {count}).',
      errorTooManyCandidates: 'Use no more than {max} candidates (currently {count}).',
      errorInputTooLong: 'Keep input at or below {max} characters (currently {count}).',
      errorEmptyLabel: 'The candidate name is empty. Enter a name before the colon.',
      errorLabelTooLong: 'Keep each candidate name at or below {max} characters.',
      errorInvalidScore: 'Enter exactly one finite number. Use the format “candidate: score”.',
      errorNonFiniteScore: 'Infinity, -Infinity, NaN, and numbers outside the finite range are not allowed.',
      errorCalculation: 'The distribution could not be calculated. Check the scores and temperature.',
      chartLabel: '{label}: {share}%'
    }
  };

  function normalizeLanguage(value) {
    return value === 'en' ? 'en' : DEFAULT_LANGUAGE;
  }

  function getStoredLanguage(storage) {
    try {
      return normalizeLanguage(storage && storage.getItem(STORAGE_KEY));
    } catch (_error) {
      return DEFAULT_LANGUAGE;
    }
  }

  function setStoredLanguage(storage, language) {
    try {
      if (storage) storage.setItem(STORAGE_KEY, normalizeLanguage(language));
    } catch (_error) {
      // Storage can be unavailable on hardened or file:// contexts. The UI still works.
    }
  }

  function translate(language, key, params = {}) {
    const dictionary = messages[normalizeLanguage(language)];
    const template = dictionary[key] ?? messages[DEFAULT_LANGUAGE][key] ?? key;
    return String(template).replace(/\{([a-zA-Z]+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    ));
  }

  return {
    DEFAULT_LANGUAGE,
    STORAGE_KEY,
    getStoredLanguage,
    messages,
    normalizeLanguage,
    setStoredLanguage,
    translate
  };
}));
