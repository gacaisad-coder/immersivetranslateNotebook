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
  aiModalResult.innerHTML = '<div class="loading-spinner">✨ 連線中，努力解析文法...</div>';
  aiModal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
  aiModal.classList.add('hidden');
});

// Simple markdown formatter
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

async function askAi(pair) {
  const lang = aiConfig.outputLanguage || '繁體中文';
  const prompt = `您是一位專業且嚴謹的外語教師。請針對以下句子進行結構化解析。不可有任何寒暄，且絕對「不要」在結尾提出任何問題或反問。

【原文】：${pair.original}
【參考翻譯】：${pair.translation}

請嚴格依照以下結構輸出：

### 📝 核心語義與語境
(精簡說明這句話的使用場景、語氣或文化背景)

### 🔑 關鍵字彙片語
(列出 2-4 個核心單字或片語，附上詞性、字義與短例句)

### 🧩 文法結構拆解
(拆解重點句型與時態)

### 💡 延伸表達方式
(提供 1-2 句母語人士的同義或進階說法)

⚠️ 請絕對遵守：
1. 僅根據上面提供的原文進行解析
2. 全程務必使用「${lang}」進行解說
3. 輸出完畢後直接結束，不可詢問使用者是否有其他問題。`;

  try {
    let resultText = "";
    const activeCfg = aiConfig[aiConfig.provider];

    if (aiConfig.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeCfg.model}:generateContent?key=${activeCfg.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Gemini API 發生錯誤');
      
      resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "無回應內容";
      
    } else if (aiConfig.provider === 'openai') {
      const url = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeCfg.apiKey}`
        },
        body: JSON.stringify({
          model: activeCfg.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'OpenAI API 發生錯誤');
      
      resultText = data.choices?.[0]?.message?.content || "無回應內容";
    }

    aiModalResult.innerHTML = formatMarkdown(escapeHtml(resultText));
  } catch (err) {
    aiModalResult.innerHTML = `<p style="color: #ff6f6f;"><strong>❌ 解析失敗：</strong>${escapeHtml(err.message)}</p>`;
  }
}

// Init
loadAiConfig();
loadAndRender();
