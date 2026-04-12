// notebook.js — Logic specifically for the standalone AI Notebook page

let allPairs = [];
let favoritePairs = [];
let renderedPairs = [];

// DOM Elements
const pairsContainer = document.getElementById('pairs-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const totalCountEl = document.getElementById('total-count');

// AI Settings Elements
const btnToggleAiSettings = document.getElementById('btn-toggle-ai-settings');
const aiSettingsPanel = document.getElementById('ai-settings-panel');
const btnSaveSettings = document.getElementById('btn-save-settings');
const settingsStatus = document.getElementById('settings-status');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const modelCustom = document.getElementById('model-custom');
const providerRadios = document.getElementsByName('ai-provider');

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

  totalCountEl.textContent = String(filtered.length);

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

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes['it_notebook_pairs']) {
    allPairs = changes['it_notebook_pairs'].newValue || [];
    favoritePairs = allPairs.filter(p => !!p.isFavorite);
    renderPairs();
  }
});

// AI Configuration Logic
let aiConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-1.5-flash'
};

function loadAiConfig() {
  chrome.storage.local.get(['it_ai_config'], result => {
    if (result.it_ai_config) {
      aiConfig = result.it_ai_config;
      
      // Update UI
      providerRadios.forEach(r => r.checked = (r.value === aiConfig.provider));
      apiKeyInput.value = aiConfig.apiKey;
      
      let foundInSelect = false;
      Array.from(modelSelect.options).forEach(opt => {
        if (opt.value === aiConfig.model) foundInSelect = true;
      });
      
      if (foundInSelect) {
        modelSelect.value = aiConfig.model;
        modelCustom.value = aiConfig.model;
      } else {
        modelSelect.value = 'gemini-1.5-flash';
        modelCustom.value = aiConfig.model;
      }
    }
  });
}

btnToggleAiSettings.addEventListener('click', () => {
  aiSettingsPanel.classList.toggle('hidden');
});

modelSelect.addEventListener('change', () => {
  modelCustom.value = modelSelect.value;
});

providerRadios.forEach(r => {
  r.addEventListener('change', () => {
    const label = document.getElementById('api-key-label');
    if (r.value === 'openai') {
      label.textContent = 'OpenAI API Key';
    } else {
      label.textContent = 'Google AI Studio API Key';
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
      
      const models = data.models.filter(m => m.name.includes('gemini'));
      modelSelect.innerHTML = models.map(m => `<option value="${m.name.split('models/')[1]}">${m.name.split('models/')[1]}</option>`).join('');
      alert('驗證成功！已更新模型列表');
      if (models.length > 0) modelCustom.value = modelSelect.value;
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
  
  const key = apiKeyInput.value.trim();
  const model = modelCustom.value.trim() || modelSelect.value;
  
  aiConfig = { provider, apiKey: key, model };
  
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
  
  if (!aiConfig.apiKey) {
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
  const prompt = `請針對這句話進行深度文法分析與字彙講解。\n原文：${pair.original}\n參考翻譯：${pair.translation}\n請列出關鍵單字、文法結構，並說明其中的語境，如果可能的話提供類似的使用例句。排版請使用易讀的形式。`;

  try {
    let resultText = "";
    if (aiConfig.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
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
          'Authorization': `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.model || 'gpt-4o-mini',
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
