# 沉浸式翻譯筆記本 (Immersive Translate Notebook)

> 一個 Chrome Extension（Manifest V3），專門捕捉「沉浸式翻譯」在網頁上產生的雙語對照內容，並儲存到本地 IndexedDB / chrome.storage。

---

## 📁 專案結構

```
immersivetranslateNotebook/
├── manifest.json       # Extension 設定（MV3）
├── content.js          # Content Script：DOM 抓取核心 + MutationObserver
├── background.js       # Service Worker：儲存管理與訊息路由
├── popup.html          # Extension Popup UI
├── popup.css           # 深色主題樣式
├── popup.js            # Popup 互動邏輯
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🧠 架構解析

### 沉浸式翻譯的 DOM 特徵

沉浸式翻譯以**非破壞性**方式注入翻譯，主要標記：

| 特徵 | 說明 |
|------|------|
| `<font class="immersive-translate-target-wrapper">` | **主要識別點**：所有譯文都包在這個元素裡 |
| `data-immersive-translate-walked` | 標記已翻譯過的父節點 |
| 父節點保留原文 | 移除 wrapper 後，父節點的 `innerText` 就是原文 |

**DOM 結構範例（翻譯後）：**

```html
<p>
  This is the original English sentence.
  <font class="immersive-translate-target-wrapper">
    <font class="immersive-translate-target-translation-theme-none">
      這是原始的英文句子。
    </font>
  </font>
</p>
```

### 資料流

```
[網頁 DOM]
    │
    ▼  MutationObserver 偵測新增的 .immersive-translate-target-wrapper
[content.js]
    │  extractPairFromWrapper()：複製父節點、移除 wrapper、取得原文
    │  sendMessage({ type: 'SAVE_PAIRS', payload: [...] })
    ▼
[background.js (Service Worker)]
    │  appendPairs()：去重 + 合併 + 限制 5000 筆
    │  chrome.storage.local.set(...)
    ▼
[chrome.storage.local]
    │
    ▼  Popup 查詢時讀取
[popup.js]
    │  搜尋過濾、渲染卡片、匯出 JSON
    ▼
[popup.html 界面]
```

---

## 🚀 安裝方式

1. 打開 Chrome，前往 `chrome://extensions/`
2. 開啟右上角「**開發人員模式**」
3. 點擊「**載入未封裝項目**」
4. 選擇此資料夾 `immersivetranslateNotebook/`
5. Extension 安裝完成！

---

## 🔧 使用方式

1. 安裝「[沉浸式翻譯](https://immersivetranslate.com/)」Chrome Extension
2. 開啟任意英文網頁，開啟沉浸式翻譯
3. 翻譯內容會**自動被捕捉**（MutationObserver 即時監控）
4. 點擊本 Extension 圖示開啟 Popup：
   - 📋 查看所有抓取到的雙語對照
   - 🔍 搜尋過濾
   - 💾 匯出 JSON 檔案
   - 🔄 手動觸發抓取（「立即抓取」按鈕）
   - 🗑️ 清除所有資料

---

## 📦 匯出 JSON 格式

```json
[
  {
    "original": "The quick brown fox jumps over the lazy dog.",
    "translation": "那隻敏捷的棕色狐狸跳過了那隻懶狗。",
    "url": "https://example.com/article",
    "title": "Example Article Title",
    "timestamp": "2025-04-06T15:30:00.000Z"
  }
]
```

---

## 🔮 未來擴展方向

- [ ] 連接後端 API 自動同步到資料庫（Supabase / PostgreSQL）
- [ ] Anki 匯出格式支援（製作單字卡）
- [ ] 標記重要翻譯（加星號）
- [ ] 依來源網域分類
- [ ] 字數統計與學習進度追蹤

---

## 🛠️ 技術選型說明

| 項目 | 選擇 | 原因 |
|------|------|------|
| Manifest | V3 | Chrome 最新標準，Service Worker 取代背景頁 |
| 儲存 | `chrome.storage.local` | 無需後端、簡單可靠、5MB 空間足夠初期使用 |
| 監控 | `MutationObserver` | 沉浸式翻譯動態插入 DOM，需即時偵測 |
| 去重 | `original + url` 組合鍵 | 避免重複儲存相同頁面的相同句子 |
| 防抖 | 600ms debounce | 避免批次翻譯時觸發大量儲存操作 |
