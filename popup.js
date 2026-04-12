/**
 * popup.js — Immersive Translate Notebook
 *
 * 控制 Popup UI：
 *  - 載入並呈現已儲存的翻譯對
 *  - 手動觸發抓取
 *  - 搜尋過濾
 *  - 匯出 JSON
 *  - 清空資料
 */

// ─── DOM 參考 ─────────────────────────────────────────────────────────────────

const totalCountEl = document.getElementById('total-count');
const pairsContainer = document.getElementById('pairs-container');
const emptyState = document.getElementById('empty-state');
const statusBar = document.getElementById('status-bar');
const searchInput = document.getElementById('search-input');
const btnExtract = document.getElementById('btn-extract');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const activeFilterEl = document.getElementById('active-filter');
const visibleCountEl = document.getElementById('visible-count');
const sourceSelect = document.getElementById('source-select');

// ─── 狀態 ────────────────────────────────────────────────────────────────────

let allPairs = [];
let renderedPairs = [];
let statusTimer = null;
let currentFilter = 'all'; // 'all' | 'web' | 'video'
let sourceValueMap = new Map();
let knownPairKeys = new Set();

const filterTabs = document.querySelectorAll('.filter-tab');

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderPairs();
  });
});

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

/**
 * 顯示短暫的狀態訊息
 * @param {string} text
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms
 */
function showStatus(text, type = 'info', duration = 2800) {
  statusBar.textContent = text;
  statusBar.className = `status-bar ${type}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusBar.className = 'status-bar hidden';
  }, duration);
}

/**
 * 截斷過長字串
 * @param {string} str
 * @param {number} max
 */
function truncate(str, max = 300) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/**
 * 將 ISO 時間字串格式化為易讀格式
 */
function formatTime(iso) {
  try {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

/**
 * 在文字中高亮搜尋關鍵字
 * @param {string} text
 * @param {string} query
 */
function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getHostLabel(url) {
  if (!url) return 'unknown';
  try {
    return new URL(url).hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getFilterLabel(filter) {
  if (filter === 'video') return '影片';
  if (filter === 'web') return '網頁';
  if (filter === 'favorite') return '⭐ 筆記本';
  return '全部';
}

function getPairKey(pair) {
  return `${pair.url || ''}||${pair.original || ''}`;
}

function updateSourceOptions() {
  const currentVal = sourceSelect.value || 'all';
  const sources = [...new Set(allPairs.map(p => p.title || getHostLabel(p.url)))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  sourceValueMap = new Map();
  sourceValueMap.set('all', 'all');

  let optionsHTML = '<option value="all">所有來源</option>';
  sources.forEach(src => {
    const key = `src_${encodeURIComponent(src)}`;
    sourceValueMap.set(key, src);
    optionsHTML += `<option value="${key}">${escapeHtml(truncate(src, 35))}</option>`;
  });

  sourceSelect.innerHTML = optionsHTML;

  if (currentVal === 'all' || sourceValueMap.has(currentVal)) {
    sourceSelect.value = currentVal;
  } else {
    sourceSelect.value = 'all';
  }
}

sourceSelect.addEventListener('change', renderPairs);

// ─── 渲染列表 ─────────────────────────────────────────────────────────────────

/**
 * 根據 allPairs 與搜尋關鍵字渲染卡片列表
 */
function renderPairs(options = {}) {
  const { animateNew = false } = options;
  const query = searchInput.value.trim().toLowerCase();
  const selectedSource = sourceValueMap.get(sourceSelect.value) || 'all';

  const filtered = allPairs.filter(p => {
    const matchSearch = !query || p.original?.toLowerCase().includes(query) || p.translation?.toLowerCase().includes(query);
    // 舊資料沒有 type 都視為 web (向前相容)
    const pType = p.type || 'web';
    const matchFilter = currentFilter === 'all' || 
                        (currentFilter === 'favorite' ? !!p.isFavorite : pType === currentFilter);
    const pSource = p.title || getHostLabel(p.url);
    const matchSource = selectedSource === 'all' || pSource === selectedSource;
    
    return matchSearch && matchFilter && matchSource;
  });

  // 更新顯示數量
  totalCountEl.textContent = String(allPairs.length);
  visibleCountEl.textContent = String(filtered.length);
  activeFilterEl.textContent = getFilterLabel(currentFilter);

  if (filtered.length === 0) {
    pairsContainer.innerHTML = '';
    pairsContainer.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  // 最新的排在最上面
  const sorted = [...filtered].reverse();
  renderedPairs = sorted;

  pairsContainer.innerHTML = sorted.map((pair, index) => {
    const type = pair.type || 'web';
    const isVideo = type === 'video';
    const badgeLabel = isVideo ? '🎬 影片' : '🌐 網頁';
    const badgeClass = isVideo ? 'video' : 'web';

    const pairKey = getPairKey(pair);
    const shouldAnimate = animateNew && !knownPairKeys.has(pairKey);

    return `
      <div class="pair-card${shouldAnimate ? ' pair-card-enter' : ''}">
        <div class="pair-original">${highlight(truncate(pair.original), query)}</div>
        <div class="pair-translation">${highlight(truncate(pair.translation), query)}</div>
        <div class="pair-meta">
          <span class="pair-type-badge ${badgeClass}">${badgeLabel}</span>
          <span class="pair-meta-url" title="${escapeHtml(pair.url || '')}">
            ${escapeHtml(truncate(pair.title || getHostLabel(pair.url), 22))}
          </span>
          <span class="pair-meta-time">${formatTime(pair.timestamp)}</span>
          <div class="pair-actions">
            <button class="pair-action-btn fav-btn ${pair.isFavorite ? 'active' : ''}" title="加入/移除筆記本" data-index="${index}">
              ${pair.isFavorite ? '⭐ 已收藏' : '➕ 收藏'}
            </button>
            <button class="pair-action-btn" data-action="copy" data-field="translation" data-index="${index}" title="複製譯文">複製譯文</button>
            <button class="pair-action-btn subtle" data-action="copy" data-field="original" data-index="${index}" title="複製原文">原文</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const latestKeySet = new Set(allPairs.map(getPairKey));
  knownPairKeys = animateNew
    ? new Set([...knownPairKeys, ...latestKeySet])
    : latestKeySet;
}

// ─── 載入資料 ─────────────────────────────────────────────────────────────────

async function loadAndRender() {
  chrome.runtime.sendMessage({ type: 'GET_PAIRS' }, async response => {
    if (chrome.runtime.lastError || !response?.success) {
      showStatus('⚠️ 無法載入資料', 'error');
      return;
    }
    allPairs = response.pairs || [];
    
    updateSourceOptions();
    
    // 嘗試取得當下分頁的標題並自動選擇
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        const currentTitle = tab.title || getHostLabel(tab.url);
        const sources = [...new Set(allPairs.map(p => p.title || getHostLabel(p.url)))];
        const sourceKey = `src_${encodeURIComponent(currentTitle)}`;
        if (sourceValueMap.has(sourceKey)) {
          sourceSelect.value = sourceKey;
        }
      }
    } catch (e) {
      // 忽略錯誤
    }

    renderPairs({ animateNew: false });
  });
}

// ─── 按鈕事件 ─────────────────────────────────────────────────────────────────

const btnOpenNotebook = document.getElementById('btn-open-notebook');
if (btnOpenNotebook) {
  btnOpenNotebook.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('notebook.html') });
  });
}

/** 手動觸發抓取（發送訊息給 content script） */
btnExtract.addEventListener('click', async () => {
  btnExtract.disabled = true;
  btnExtract.innerHTML = '<span class="btn-icon">◉</span><span class="btn-text">抓取中...</span>';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_EXTRACT' }, response => {
    btnExtract.disabled = false;
    btnExtract.innerHTML = '<span class="btn-icon">◉</span><span class="btn-text">立即抓取</span>';

    if (chrome.runtime.lastError) {
      showStatus('⚠️ 無法連接頁面（請重載頁面後重試）', 'error');
      return;
    }

    const count = response?.count ?? 0;
    showStatus(`✅ 抓取完成！找到 ${count} 筆翻譯`, 'success');
    loadAndRender();
  });
});

/** 匯出 JSON */
btnExport.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'EXPORT_JSON' }, response => {
    if (!response?.success) {
      showStatus('⚠️ 匯出失敗', 'error');
      return;
    }

    const blob = new Blob([response.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `it-notebook-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('💾 JSON 已匯出', 'success');
  });
});

/** 清除所有資料 */
btnClear.addEventListener('click', () => {
  if (!confirm(`確定要清除所有 ${allPairs.length} 筆翻譯記錄嗎？`)) return;

  chrome.runtime.sendMessage({ type: 'CLEAR_PAIRS' }, response => {
    if (!response?.success) {
      showStatus('⚠️ 清除失敗', 'error');
      return;
    }
    allPairs = [];
    renderPairs();
    showStatus('🗑️ 已清除所有記錄', 'info');
  });
});

/** 搜尋過濾（即時） */
searchInput.addEventListener('input', renderPairs);
pairsContainer.addEventListener('click', async event => {
  const btn = event.target.closest('.pair-action-btn');
  if (!btn) return;

  if (btn.classList.contains('fav-btn')) {
    const index = Number(btn.dataset.index);
    const targetPair = renderedPairs[index];
    if (!targetPair) return;

    const url = targetPair.url || '';
    const original = targetPair.original || '';

    // 樂觀預先更新按鈕樣式（UX 回饋）
    const wasFavorite = targetPair.isFavorite;
    targetPair.isFavorite = !wasFavorite;
    btn.classList.toggle('active', targetPair.isFavorite);
    btn.textContent = targetPair.isFavorite ? '⭐ 已收藏' : '➕ 收藏';

    chrome.runtime.sendMessage({ type: 'TOGGLE_FAVORITE', url, original }, response => {
      if (chrome.runtime.lastError || !response?.success) {
        showStatus('⚠️ 收藏失敗: ' + (chrome.runtime.lastError?.message || response?.error || '未知錯誤'), 'error');
        // 復原狀態
        targetPair.isFavorite = wasFavorite;
        btn.classList.toggle('active', wasFavorite);
        btn.textContent = wasFavorite ? '⭐ 已收藏' : '➕ 收藏';
        return;
      }
      
      // 本地同步更新狀態
      const pairObj = allPairs.find(p => p.url === url && p.original === original);
      if (pairObj) pairObj.isFavorite = response.isFavorite;
      
      if (currentFilter === 'favorite' && !response.isFavorite) {
        btn.closest('.pair-card').style.opacity = '0.4';
        setTimeout(() => renderPairs({ animateNew: false }), 200);
      }
    });
    return;
  }

  const action = btn.dataset.action;
  const field = btn.dataset.field;
  const index = Number(btn.dataset.index);
  const pair = renderedPairs[index];

  if (action !== 'copy' || !pair || !['original', 'translation'].includes(field)) return;

  const text = pair[field];
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showStatus(`✅ 已複製${field === 'translation' ? '譯文' : '原文'}`, 'success', 1600);
  } catch {
    showStatus('⚠️ 複製失敗，請手動選取文字', 'error', 2200);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

// ─── 初始化與即時更新 ───────────────────────────────────────────────────────

loadAndRender();

// 監聽背景儲存的變化，實現「開啟畫面時持續更新」的功能
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes['it_notebook_pairs']) {
    allPairs = changes['it_notebook_pairs'].newValue || [];
    updateSourceOptions(); // 自動更新來源清單
    renderPairs({ animateNew: true });
  }
});
