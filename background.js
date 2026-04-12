/**
 * background.js — Immersive Translate Notebook Service Worker
 *
 * 負責：
 *  1. 接收 content script 傳來的翻譯對（SAVE_PAIRS）
 *  2. 使用 chrome.storage.local 做持久化儲存
 *  3. 提供給 Popup 查詢與清空資料的介面
 */

// ─── 儲存鍵 ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'it_notebook_pairs';
const MAX_PAIRS = 5000; // 最多保留筆數，避免佔用過多空間

// ─── 儲存工具函式 ─────────────────────────────────────────────────────────────

/**
 * 讀取目前所有已存的翻譯對
 * @returns {Promise<Array>}
 */
async function loadPairs() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/**
 * 將翻譯對陣列存入 chrome.storage.local
 * @param {Array} pairs
 * @returns {Promise<void>}
 */
async function savePairs(pairs) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: pairs }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 將新的翻譯對合併進現有資料（去重 + 限制總筆數）
 * @param {Array} newPairs
 */
async function appendPairs(newPairs) {
  const existing = await loadPairs();

  // 用 original+url 組合當 key 做去重
  const keySet = new Set(existing.map(p => `${p.url}||${p.original}`));
  const unique = newPairs.filter(p => !keySet.has(`${p.url}||${p.original}`));

  if (unique.length === 0) return 0;

  // 合併並截斷至 MAX_PAIRS（移除最舊的）
  const merged = [...existing, ...unique].slice(-MAX_PAIRS);
  await savePairs(merged);

  return unique.length;
}

// ─── 訊息處理 ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // ── 儲存翻譯對（來自 content script）
  if (message.type === 'SAVE_PAIRS') {
    appendPairs(message.payload || [])
      .then(added => {
        sendResponse({ success: true, added });
      })
      .catch(err => {
        console.error('[IT Notebook BG] 儲存失敗:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // 非同步回應
  }

  // ── 查詢所有翻譯對（來自 Popup）
  if (message.type === 'GET_PAIRS') {
    loadPairs()
      .then(pairs => {
        sendResponse({ success: true, pairs });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  // ── 清空所有資料（來自 Popup）
  if (message.type === 'CLEAR_PAIRS') {
    savePairs([])
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ── 匯出為 JSON（來自 Popup）
  if (message.type === 'EXPORT_JSON') {
    loadPairs()
      .then(pairs => {
        sendResponse({ success: true, json: JSON.stringify(pairs, null, 2) });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

});

console.log('[IT Notebook BG] Service Worker 已啟動');
