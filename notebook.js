// notebook.js — Logic specifically for the standalone AI Notebook page

let allPairs = [];
let favoritePairs = [];
let renderedPairs = [];

// DOM Elements
const pairsContainer = document.getElementById('pairs-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const totalCountEl = document.getElementById('total-count');
const resultsMetaEl = document.getElementById('results-meta');

// AI Settings Elements
const btnToggleAiSettings = document.getElementById('btn-toggle-ai-settings');
const aiSettingsPanel = document.getElementById('ai-settings-panel');
const btnSaveSettings = document.getElementById('btn-save-settings');
const settingsStatus = document.getElementById('settings-status');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const modelCustom = document.getElementById('model-custom');
const providerRadios = document.getElementsByName('ai-provider');
const langSelect = document.getElementById('lang-select');

// Modal Elements
const aiModal = document.getElementById('ai-modal');
const modalClose = document.getElementById('modal-close');
const aiModalSource = document.getElementById('ai-modal-source');
const aiModalResult = document.getElementById('ai-modal-result');
let activeAiAbortController = null;
let activeAiRequestId = 0;

// Load Data
async function loadAndRender() {
  chrome.runtime.sendMessage({ type: 'GET_PAIRS' }, response => {
    if (response?.success) {
      allPairs = response.pairs || [];
      favoritePairs = allPairs.filter(p => !!p.isFavorite);
      renderPairs();
    }
  });
}

function truncate(str, max = 300) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function renderPairs() {
  const query = searchInput.value.trim().toLowerCase();
  
  const filtered = favoritePairs.filter(p => {
    return !query || (p.original && p.original.toLowerCase().includes(query)) || (p.translation && p.translation.toLowerCase().includes(query));
  });

  totalCountEl.textContent = String(favoritePairs.length);
  if (resultsMetaEl) {
    resultsMetaEl.textContent = `顯示 ${filtered.length} / ${favoritePairs.length}`;
  }

  if (filtered.length === 0) {
    pairsContainer.innerHTML = '';
    pairsContainer.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  const sorted = [...filtered].reverse();
  renderedPairs = sorted;

  pairsContainer.innerHTML = sorted.map((pair, index) => {
    return `
      <div class="pair-card">
        <div class="pair-original">${escapeHtml(truncate(pair.original))}</div>
        <div class="pair-translation">${escapeHtml(truncate(pair.translation))}</div>
        <div class="pair-actions">
          <button class="ai-ask-btn" data-index="${index}">✨ AI 深度文法解析</button>
        </div>
      </div>
    `;
  }).join('');
}

// Event Listeners
searchInput.addEventListener('input', renderPairs);
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes['it_notebook_pairs']) {
    allPairs = changes['it_notebook_pairs'].newValue || [];
    favoritePairs = allPairs.filter(p => !!p.isFavorite);
    renderPairs();
  }
});

let aiConfig = {
  provider: 'gemini',
  outputLanguage: '繁體中文',
  gemini: { apiKey: '', model: 'gemini-1.5-flash' },
  openai: { apiKey: '', model: 'gpt-4o-mini' }
};

function loadAiConfig() {
  chrome.storage.local.get(['it_ai_config'], result => {
    if (result.it_ai_config) {
      // Migrate old format if needed
      if (result.it_ai_config.apiKey !== undefined) {
        aiConfig.provider = result.it_ai_config.provider || 'gemini';
        aiConfig.outputLanguage = result.it_ai_config.outputLanguage || '繁體中文';
        if (aiConfig.provider === 'gemini') {
          aiConfig.gemini.apiKey = result.it_ai_config.apiKey;
          aiConfig.gemini.model = result.it_ai_config.model || 'gemini-1.5-flash';
        } else {
          aiConfig.openai.apiKey = result.it_ai_config.apiKey;
          aiConfig.openai.model = result.it_ai_config.model || 'gpt-4o-mini';
        }
      } else {
        aiConfig = result.it_ai_config;
        if (!aiConfig.gemini) aiConfig.gemini = { apiKey: '', model: 'gemini-1.5-flash' };
        if (!aiConfig.openai) aiConfig.openai = { apiKey: '', model: 'gpt-4o-mini' };
      }
      
      providerRadios.forEach(r => r.checked = (r.value === aiConfig.provider));
      if (aiConfig.outputLanguage) langSelect.value = aiConfig.outputLanguage;
      updateConfigUI(aiConfig.provider, false);
    }
  });
}

function updateConfigUI(provider, updateOptions = true) {
  const cfg = aiConfig[provider];
  apiKeyInput.value = cfg.apiKey;
  modelCustom.value = cfg.model;
  
  if (updateOptions) {
    modelSelect.innerHTML = `<option value="${cfg.model}">${cfg.model}</option>`;
  }
  modelSelect.value = cfg.model;
  
  const label = document.getElementById('api-key-label');
  label.textContent = provider === 'openai' ? 'OpenAI API Key' : 'Google AI Studio API Key';
}

btnToggleAiSettings.addEventListener('click', () => {
  aiSettingsPanel.classList.toggle('hidden');
});

modelSelect.addEventListener('change', () => {
  modelCustom.value = modelSelect.value;
});

providerRadios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.checked) {
      const newProvider = r.value;
      const oldProvider = newProvider === 'gemini' ? 'openai' : 'gemini';
      
      aiConfig[oldProvider].apiKey = apiKeyInput.value.trim();
      aiConfig[oldProvider].model = modelCustom.value.trim();
      
      updateConfigUI(newProvider);
    }
  });
});

const btnVerifyModel = document.getElementById('btn-verify-model');
btnVerifyModel.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert('請先輸入 API Key');
    return;
  }
  
  btnVerifyModel.textContent = '驗證中...';
  try {
    let provider = 'gemini';
    providerRadios.forEach(r => { if (r.checked) provider = r.value; });
    
    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.split('models/')[1])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      if (models.length === 0) {
        throw new Error('未取得可用的文字生成模型');
      }

      modelSelect.innerHTML = models.map(modelName => `<option value="${modelName}">${modelName}</option>`).join('');
      alert('驗證成功！已更新模型列表');
      modelCustom.value = modelSelect.value;
    } else {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const models = data.data.filter(m => m.id.includes('gpt'));
      modelSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
      alert('驗證成功！已更新模型列表');
      if (models.length > 0) modelCustom.value = modelSelect.value;
    }
  } catch (e) {
    alert('驗證失敗：' + e.message);
  } finally {
    btnVerifyModel.textContent = '驗證並取得模型';
  }
});

btnSaveSettings.addEventListener('click', () => {
  let provider = 'gemini';
  providerRadios.forEach(r => { if (r.checked) provider = r.value; });
  
  aiConfig.provider = provider;
  aiConfig.outputLanguage = langSelect.value;
  aiConfig[provider].apiKey = apiKeyInput.value.trim();
  aiConfig[provider].model = modelCustom.value.trim() || modelSelect.value;
  
  chrome.storage.local.set({ it_ai_config: aiConfig }, () => {
    settingsStatus.textContent = "✅ 設定已儲存";
    setTimeout(() => { settingsStatus.textContent = ""; }, 2000);
  });
});

// AI Request Logic
pairsContainer.addEventListener('click', async e => {
  const btn = e.target.closest('.ai-ask-btn');
  if (!btn) return;
  
  const index = Number(btn.dataset.index);
  const pair = renderedPairs[index];
  if (!pair) return;
  
  const activeCfg = aiConfig[aiConfig.provider];
  
  if (!activeCfg.apiKey) {
    aiSettingsPanel.classList.remove('hidden');
    apiKeyInput.focus();
    alert('請先設定您的 API Key！');
    return;
  }
  
  openModal(pair);
  await askAi(pair);
});

function openModal(pair) {
  aiModalSource.innerHTML = `
    ${escapeHtml(pair.original)}<br/>
    <small>${escapeHtml(pair.translation)}</small>
  `;
  aiModalResult.innerHTML = `
    <div class="ai-progress" data-role="ai-progress">
      <div class="ai-progress-steps">
        <span class="ai-step is-active" data-step="received">已接收請求</span>
        <span class="ai-step" data-step="parsing">解析句法中</span>
        <span class="ai-step" data-step="tldr">生成 TL;DR</span>
        <span class="ai-step" data-step="details">補充重點與細節</span>
      </div>
      <div class="loading-spinner" data-role="loading-hint">✨ 已送出請求，等待模型回傳...</div>
    </div>
    <div class="ai-stream-box" data-role="stream-box">
      <div class="ai-stream-placeholder">結果會以串流方式顯示，先看到重點再補細節。</div>
      <div class="ai-stream-content" data-role="stream-content"></div>
    </div>
  `;
  aiModal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
  if (activeAiAbortController) {
    activeAiAbortController.abort();
    activeAiAbortController = null;
  }
  aiModal.classList.add('hidden');
});

// Simple markdown formatter
function formatMarkdown(text) {
  return text
    .replace(/^###\s+(.*)$/gm, '<strong>$1</strong>')
    .replace(/^- (.*)$/gm, '• $1')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function updateAiPhase(step) {
  const allSteps = ['received', 'parsing', 'tldr', 'details'];
  const activeIndex = allSteps.indexOf(step);
  const stepEls = aiModalResult.querySelectorAll('.ai-step');
  stepEls.forEach((el, index) => {
    el.classList.toggle('is-active', index === activeIndex);
    el.classList.toggle('is-done', index < activeIndex);
  });

  const hintEl = aiModalResult.querySelector('[data-role="loading-hint"]');
  if (!hintEl) return;
  if (step === 'received') hintEl.textContent = '✨ 已送出請求，等待模型回傳...';
  if (step === 'parsing') hintEl.textContent = '✨ 文字已開始返回，正在解析句法...';
  if (step === 'tldr') hintEl.textContent = '✨ 已先產生結論，正在補齊重點...';
  if (step === 'details') hintEl.textContent = '✨ 正在補充完整細節...';
}

function renderStreamingText(text) {
  const streamContent = aiModalResult.querySelector('[data-role="stream-content"]');
  if (!streamContent) return;
  streamContent.innerHTML = formatMarkdown(escapeHtml(text));
}

function ensureThreeLayerFormat(rawText) {
  const cleaned = (rawText || '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) {
    return '### TL;DR\n（模型未回傳內容）\n\n### 重點\n- （無）\n\n### 細節\n（無）';
  }

  const hasTldr = /(^|\n)#{1,6}\s*TL;DR/i.test(cleaned);
  const hasPoints = /(^|\n)#{1,6}\s*重點/i.test(cleaned);
  const hasDetail = /(^|\n)#{1,6}\s*細節/i.test(cleaned);
  if (hasTldr && hasPoints && hasDetail) return cleaned;

  const blocks = cleaned.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const tldr = blocks[0] || cleaned.slice(0, 120);
  const pointSource = blocks.slice(1, 3).join('\n').trim();
  const points = pointSource
    ? pointSource.split('\n').map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0, 4)
    : [];
  const bullets = points.length > 0 ? points.map(line => `- ${line}`).join('\n') : '- （模型未提供條列重點）';
  const details = blocks.slice(2).join('\n\n').trim() || blocks.slice(1).join('\n\n').trim() || cleaned;

  return `### TL;DR\n${tldr}\n\n### 重點\n${bullets}\n\n### 細節\n${details}`;
}

function mergeStreamingText(currentText, chunkText) {
  if (!chunkText) return currentText;
  if (!currentText) return chunkText;
  if (chunkText.startsWith(currentText)) return chunkText;
  if (currentText.endsWith(chunkText)) return currentText;
  return currentText + chunkText;
}

async function parseSseStream(response, onTextChunk) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('瀏覽器不支援串流讀取');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      let json;
      try {
        json = JSON.parse(payload);
      } catch (_err) {
        continue;
      }

      const openAiChunk = json.choices?.[0]?.delta?.content;
      const geminiChunk = json.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      const text = openAiChunk || geminiChunk;
      if (text) onTextChunk(text);
    }
  }
}

async function askAi(pair) {
  if (activeAiAbortController) activeAiAbortController.abort();

  const requestId = ++activeAiRequestId;
  const controller = new AbortController();
  activeAiAbortController = controller;

  const lang = aiConfig.outputLanguage || '繁體中文';
  const prompt = `請用${lang}解析句子，直接輸出，不要寒暄或提問。

原文：${pair.original}
參考翻譯：${pair.translation}

請用以下格式，且先輸出 TL;DR：
### TL;DR
（一句話）
### 重點
（2-4 點：關鍵字/片語與文法重點）
### 細節
（簡潔拆解句型與語氣，可補 1 句延伸表達）`;

  try {
    let resultText = '';
    const activeCfg = aiConfig[aiConfig.provider];
    updateAiPhase('received');

    if (aiConfig.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeCfg.model}:streamGenerateContent?alt=sse&key=${activeCfg.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        let errMessage = 'Gemini API 發生錯誤';
        try {
          const data = await response.json();
          errMessage = data.error?.message || errMessage;
        } catch (_err) {}
        throw new Error(errMessage);
      }

      updateAiPhase('parsing');
      await parseSseStream(response, chunk => {
        if (requestId !== activeAiRequestId) return;
        resultText = mergeStreamingText(resultText, chunk);
        if (/#{1,6}\s*TL;DR/i.test(resultText)) updateAiPhase('tldr');
        if (/#{1,6}\s*重點/i.test(resultText)) updateAiPhase('details');
        renderStreamingText(resultText);
      });
    } else if (aiConfig.provider === 'openai') {
      const url = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeCfg.apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: activeCfg.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        let errMessage = 'OpenAI API 發生錯誤';
        try {
          const data = await response.json();
          errMessage = data.error?.message || errMessage;
        } catch (_err) {}
        throw new Error(errMessage);
      }

      updateAiPhase('parsing');
      await parseSseStream(response, chunk => {
        if (requestId !== activeAiRequestId) return;
        resultText = mergeStreamingText(resultText, chunk);
        if (/#{1,6}\s*TL;DR/i.test(resultText)) updateAiPhase('tldr');
        if (/#{1,6}\s*重點/i.test(resultText)) updateAiPhase('details');
        renderStreamingText(resultText);
      });
    }

    if (requestId !== activeAiRequestId) return;
    if (!resultText.trim()) {
      throw new Error('模型未回傳內容');
    }

    updateAiPhase('details');
    aiModalResult.innerHTML = formatMarkdown(escapeHtml(ensureThreeLayerFormat(resultText)));
  } catch (err) {
    if (err.name === 'AbortError') return;
    aiModalResult.innerHTML = `<p style="color: #ff6f6f;"><strong>❌ 解析失敗：</strong>${escapeHtml(err.message)}</p>`;
  } finally {
    if (requestId === activeAiRequestId) {
      activeAiAbortController = null;
    }
  }
}

// Init
loadAiConfig();
loadAndRender();
