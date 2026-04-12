/**
 * content.js — Immersive Translate Notebook
 *
 * 抓取沉浸式翻譯（Immersive Translate）在網頁上產生的
 * 雙語對照區塊（原文 + 譯文），並透過 chrome.runtime.sendMessage
 * 傳送到 background service worker 進行儲存。
 *
 * 沉浸式翻譯的 DOM 特徵：
 *  - 譯文包裹在 <font class="immersive-translate-target-wrapper"> 內
 *  - 整個翻譯段落通常被 [id^="immersive-translate-"] 的父容器包住
 *  - 原文就是同一個 parent 節點中、target-wrapper 之前的 text node 或子節點
 */

// ─── 常數 ───────────────────────────────────────────────────────────────────

/** 沉浸式翻譯的譯文 wrapper class（主要辨識標記） */
const TARGET_WRAPPER_CLASS = 'immersive-translate-target-wrapper';

/** 沉浸式翻譯段落的標記屬性（用來找已翻譯的區塊） */
const TRANSLATED_ATTR = 'data-immersive-translate-walked';

/** 防抖延遲（ms）：避免 MutationObserver 被大量 DOM 變更觸發 */
const DEBOUNCE_MS = 600;

// ─── 狀態追蹤 ────────────────────────────────────────────────────────────────

/** 維護一個循環佇列來儲存已抓取過的翻譯對 Hash，避免重複抓取 */
const MAX_SEEN = 100;
const seenHashesSet = new Set();
const seenHashesQueue = [];

/**
 * 檢查並記錄是否已處理過該筆翻譯
 * @param {string} original 
 * @param {string} translation 
 * @returns {boolean} true: 新增成功 (未見過) | false: 已重複
 */
function isNewPair(original, translation) {
  const hash = `${original}|||${translation}`;
  if (seenHashesSet.has(hash)) return false;
  
  seenHashesSet.add(hash);
  seenHashesQueue.push(hash);
  
  if (seenHashesQueue.length > MAX_SEEN) {
    seenHashesSet.delete(seenHashesQueue.shift());
  }
  return true;
}

/**
 * 提取影片字幕 (例如 Amazon Prime Video)
 * 影片字幕通常沒有明確的 target-wrapper class，而是將雙語放在同一個容器內。
 */
function extractVideoPairs(root = document) {
  const pairs = [];

  // Amazon Prime Video: .atvwebplayersdk-captions-text 裡面會有 <span> 日文 </span> <br> <span> 中文 </span>
  const primeCaptions = root.querySelectorAll ? root.querySelectorAll('.atvwebplayersdk-captions-text') : [];
  
  if (primeCaptions && primeCaptions.length > 0) {
    primeCaptions.forEach(captionEl => {
      const spans = captionEl.querySelectorAll('span');
      // 確保至少有兩個 span (原文與譯文)
      if (spans.length >= 2) {
        const original = spans[0].textContent?.trim();
        const translation = spans[spans.length - 1].textContent?.trim();
        
        if (original && translation && isNewPair(original, translation)) {
          pairs.push({
            original,
            translation,
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            type: 'video', // 標記為影片來源
          });
        }
      }
    });
  }

  // YouTube / 通用原生影片字幕 (Shadow DOM: #immersive-translate-caption-window)
  // 為了防範 YouTube 的 SPA 特性留下死節點，這裡選取所有的字幕窗並進行掃描
  const shadowHosts = document.querySelectorAll('#immersive-translate-caption-window');
  shadowHosts.forEach(shadowHost => {
    if (shadowHost.shadowRoot) {
      // 每個 subtitle block 可能有多個
      const captionNodes = shadowHost.shadowRoot.querySelectorAll('.imt-captions-text');
      captionNodes.forEach(captionNode => {
        const sourceNodes = captionNode.querySelectorAll('.source-cue');
        const targetNodes = captionNode.querySelectorAll('.target-cue');
        
        // 將可能的斷行合併
        const original = Array.from(sourceNodes).map(n => n.textContent).join(' ').trim();
        const translation = Array.from(targetNodes).map(n => n.textContent).join(' ').trim();
        
        if (original && translation && isNewPair(original, translation)) {
          pairs.push({
            original,
            translation,
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            type: 'video'
          });
        }
      });
    }
  });

  return pairs;
}

// ─── Shadow DOM 專屬監聽器 ──────────────────────────────────────────────────

const shadowObservers = new WeakMap();

/**
 * 如果發現有 immersive-translate-caption-window，而且它含有 shadowRoot，
 * 因為可能會有多個（SPA 原理），我們針對所有未監聽的標籤新增專屬 MutationObserver
 */
function observeShadowRootIfNeeded() {
  const shadowHosts = document.querySelectorAll('#immersive-translate-caption-window');
  
  shadowHosts.forEach(shadowHost => {
    if (!shadowHost.shadowRoot) return;
    if (shadowObservers.has(shadowHost)) return;

    const observer = new MutationObserver(debounce(() => {
      // 一旦 shadow DOM 內部有變動，就可以抓取更新的雙語字幕
      const pairs = extractVideoPairs(document);
      sendPairsToBackground(pairs);
    }, 250));

    observer.observe(shadowHost.shadowRoot, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true // 某些變化可能是隱藏顯示，加上 attributes 也比較保險
    });
    
    shadowObservers.set(shadowHost, observer);
    console.log('[IT Notebook] 已成功掛載一個新的 Shadow DOM 影片字幕專屬監聽器');
  });
}

// ─── 核心抓取邏輯 ─────────────────────────────────────────────────────────────

/**
 * 從單一 <font class="immersive-translate-target-wrapper"> 元素中
 * 提取譯文文字，並往上找到對應的原文文字。
 *
 * @param {Element} wrapperEl  - 譯文 wrapper 元素
 * @returns {{ original: string, translation: string, url: string } | null}
 */
function extractPairFromWrapper(wrapperEl) {
  // 取得譯文純文字
  const translation = wrapperEl.innerText?.trim();
  if (!translation) return null;

  // 沉浸式翻譯會把譯文 wrapper 插入到原文段落的末尾。
  // 原文就是同一個父節點中、wrapper 之前所有內容的純文字（去掉譯文本身）。
  const parent = wrapperEl.parentElement;
  if (!parent) return null;

  // 複製父節點，移除所有 .immersive-translate-target-wrapper 後取純文字
  const cloned = parent.cloneNode(true);
  cloned.querySelectorAll(`.${TARGET_WRAPPER_CLASS}`).forEach(el => el.remove());
  const original = cloned.innerText?.trim() || cloned.textContent?.trim();

  if (!original || !translation) return null;

  return {
    original,
    translation,
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    type: 'web', // 標記為網頁來源
  };
}

/**
 * 掃描指定的 root 節點（或整個文件），找到所有尚未處理的
 * .immersive-translate-target-wrapper，提取成對的原文／譯文。
 * 同時也會掃描影片字幕。
 *
 * @param {Document | Element} root - 掃描根節點
 * @returns {Array<Object>} 提取到的翻譯對陣列
 */
function extractAllPairs(root = document) {
  const pairs = [];

  // 1. 一般網頁的沉浸式翻譯 wrapper
  const wrappers = root.querySelectorAll ? root.querySelectorAll(`.${TARGET_WRAPPER_CLASS}`) : [];
  wrappers.forEach(wrapper => {
    const pair = extractPairFromWrapper(wrapper);
    if (pair && isNewPair(pair.original, pair.translation)) {
      pairs.push(pair);
    }
  });

  // 2. 影片字幕 (Amazon Prime)
  const videoPairs = extractVideoPairs(root);
  pairs.push(...videoPairs);

  return pairs;
}

// ─── 傳送到 Background ────────────────────────────────────────────────────────

/**
 * 將提取到的翻譯對陣列傳送到 background service worker 儲存。
 *
 * @param {Array<Object>} pairs
 */
function sendPairsToBackground(pairs) {
  if (!pairs.length) return;

  chrome.runtime.sendMessage(
    { type: 'SAVE_PAIRS', payload: pairs },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[IT Notebook] sendMessage error:', chrome.runtime.lastError.message);
        return;
      }
      if (response?.success) {
        console.log(`[IT Notebook] 已儲存 ${pairs.length} 筆翻譯對`);
      }
    }
  );
}

// ─── 防抖工具 ─────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── MutationObserver ────────────────────────────────────────────────────────

/**
 * 建立 MutationObserver，監控整個文件的 DOM 子節點變動，
 * 當偵測到新的翻譯 wrapper 被插入時，觸發提取流程。
 */
function startObserver() {
  const handleMutations = debounce((mutations) => {
    // 每次 DOM 變動時順便檢查需不需要掛載 Shadow DOM 監聽器
    observeShadowRootIfNeeded();

    // 放棄比對 DOM 節點增刪（因為字幕或單頁應用常會重複利用相同節點並只替換 textContent）
    // 每次都全域掃描一次，我們有 `isNewPair` (Set Hashing) 的機制負責去重
    const newPairs = extractAllPairs(document);
    sendPairsToBackground(newPairs);
  }, 250);

  const observer = new MutationObserver(handleMutations);

  // 很多擴充功能（如 IT）會把覆蓋層掛載到 documentElement (<html>) 上以免被網頁 CSS 影響
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true, // 監聽文字內容改變，以支援影片字幕更新
  });

  console.log('[IT Notebook] MutationObserver 已啟動，等待翻譯或字幕出現…');
  return observer;
}

// ─── 初始化 ───────────────────────────────────────────────────────────────────

/**
 * 初始執行：先掃一次已存在的翻譯（頁面刷新後 IT 可能已翻譯），
 * 然後啟動 observer 監控後續新增的翻譯。
 */
function init() {
  // 先嘗試掛載 Shadow DOM 監聽器
  observeShadowRootIfNeeded();

  // 1. 先抓目前已存在的翻譯
  const existingPairs = extractAllPairs(document);
  if (existingPairs.length > 0) {
    console.log(`[IT Notebook] 初始掃描找到 ${existingPairs.length} 筆翻譯對`);
    sendPairsToBackground(existingPairs);
  }

  // 2. 啟動 MutationObserver 監控動態翻譯
  startObserver();
}

// 等 DOM 就緒後執行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── 訊息接收（來自 Popup 的手動觸發指令）────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'MANUAL_EXTRACT') {
    // 重置已處理集合以支援手動重新抓取
    const pairs = [];
    const wrappers = document.querySelectorAll(`.${TARGET_WRAPPER_CLASS}`);
    wrappers.forEach(wrapper => {
      const pair = extractPairFromWrapper(wrapper);
      if (pair) pairs.push(pair);
    });

    sendPairsToBackground(pairs);
    sendResponse({ success: true, count: pairs.length });
  }
  return true; // 保持訊息通道開放（非同步回應）
});
