---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: db76cf295a97faf7943285ad46a5e067_8ebed9936f0f11f195af5254002afed2
    ReservedCode1: w0U/FElDkD95uaVWmhRbKv4WXnYfLAHd+A/ShXSXPenyDqxLZ0Yx8k5ST4A7+Jqn6NAVddkC8Y0J/61ItOvqtS0fKj/Bo6tYr/N8v10W/IHycSIU7wPtirHl4lyh39QI7H75ROXeG+gQs463MN+1BCEBb/cfLiUcIDgiWw1vtVw2b/lGHXOaoInRlIY=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: db76cf295a97faf7943285ad46a5e067_8ebed9936f0f11f195af5254002afed2
    ReservedCode2: w0U/FElDkD95uaVWmhRbKv4WXnYfLAHd+A/ShXSXPenyDqxLZ0Yx8k5ST4A7+Jqn6NAVddkC8Y0J/61ItOvqtS0fKj/Bo6tYr/N8v10W/IHycSIU7wPtirHl4lyh39QI7H75ROXeG+gQs463MN+1BCEBb/cfLiUcIDgiWw1vtVw2b/lGHXOaoInRlIY=
---

# 🇲🇾 大馬油價小紅書機器人 — 逐步說明

# 🇲🇾 Malaysia Fuel Price RedNote Bot — Step-by-Step Guide

---

## 📋 目錄 / Table of Contents

1. [專案架構 / Project Structure](#1-專案架構--project-structure)
2. [index.js — 主控台 / Brain](#2-indexjs--主控台--brain)
3. [xiaohongshu.js — 文案引擎 / Content Engine](#3-xiaohongshujs--文案引擎--content-engine)
4. [crontab.txt — 定時排程 / Cron Schedule](#4-crontabtxt--定時排程--cron-schedule)
5. [publish.sh — 一鍵腳本 / Quick Launch](#5-publishsh--一鍵腳本--quick-launch)
6. [package.json — 專案身分證 / Identity](#6-packagejson--專案身分證--identity)
7. [資料流總覽 / Data Flow](#7-資料流總覽--data-flow)
8. [部署步驟 / Deployment](#8-部署步驟--deployment)

---

## 1. 專案架構 / Project Structure

```
malaysia-fuel-bot/
├── index.js          # 主控台：爬蟲 + 排程 + 存檔 / Brain: scraper + scheduler + saver
├── xiaohongshu.js    # 文案生成引擎 / Content generation engine
├── crontab.txt       # Termux 定時排程設定 / Cron schedule config
├── publish.sh        # 一鍵運行腳本 / One-click launch script
├── package.json      # Node.js 專案資訊 / Project metadata
├── output/           # 生成文案保存處 / Generated posts saved here
└── logs/             # Cron 執行日誌 / Cron execution logs
```

**零外部依賴 / Zero External Dependencies：** 本專案只使用 Node.js 內建模組（`fs`、`path`、`fetch`），無需 `npm install`。
This project uses only Node.js built-in modules (`fs`, `path`, `fetch`). No `npm install` needed.

---

## 2. index.js — 主控台 / Brain

### 功能概述 / Overview

`index.js` 是整個機器人的指揮中心，負責三件事：
`index.js` is the command center. It handles three tasks:

1. 從網路爬取真實馬來西亞油價
   Scrape real-time Malaysia fuel prices from the web

2. 將數據傳給文案引擎生成小紅書貼文
   Pass data to the content engine to generate RedNote posts

3. 將文案保存到檔案並輸出發布指引
   Save the post to a file and print publishing instructions

### 函數詳解 / Function Breakdown

| 函數 / Function | 中文說明 | English Description |
|-----------------|----------|---------------------|
| `fetchFromSetel()` | 從 Petronas 官方 Setel 網站抓取 HTML，用正則表達式提取 RON95、RON97、Diesel（西馬/東馬）共五個價格 | Fetches HTML from Petronas's official Setel website, uses regex to extract 5 prices: RON95, RON97, Diesel (Peninsular/East Malaysia) |
| `fetchFromBitauto()` | Setel 失敗時的備援方案：搜尋 bitauto.my 最新油價文章，同樣正則提取價格 | Fallback when Setel fails: searches bitauto.my for the latest fuel article and extracts prices via regex |
| `fetchMalaysiaFuelPrices()` | 三層防呆機制：Setel → Bitauto → 硬編碼預設值，確保永遠有數據 | Three-tier safety net: Setel → Bitauto → hardcoded defaults, guarantees data availability |
| `startBot()` | 串聯所有步驟：拿油價 → 生成文案 → 存到 `output/` 目錄 → 印出小紅書發布指引 | Orchestrates everything: get prices → generate post → save to `output/` → print RedNote publishing guide |

### 三層 Fallback 機制 / Three-Tier Fallback

```
第一層 / Tier 1: setel.com        ← Petronas 官方，固定 URL 無需搜索
第二層 / Tier 2: bitauto.my       ← 自動搜索最新油價文章
第三層 / Tier 3: FALLBACK 常數     ← 內建當前已知價格，手動更新
```

### 小紅書 ID 配置 / RedNote ID Config

```js
const REDNOTE_ID = "8482347273";
```

修改此行即可切換目標帳號。
Change this line to switch the target account.

---

## 3. xiaohongshu.js — 文案引擎 / Content Engine

### 功能概述 / Overview

只有一個函數 `generateXiaohongshuContent(topic, content)`。接收原始油價數據，產出一篇完整的、可直接複製到小紅書發布的貼文。
A single function that takes raw fuel price data and returns a complete RedNote-ready post.

### 輸入 / Input

| 參數 / Parameter | 類型 / Type | 說明 / Description |
|------------------|-------------|---------------------|
| `topic` | `string` | 貼文主題（如"馬來西亞每週最新油價更新"）/ Post topic |
| `content` | `string` | 原始油價字串（如 `"RON95 (補貼Budi95): RM1.99, RON97: RM4.35, ..."`）/ Raw price string |

### 輸出 / Output

回傳一個物件，包含以下欄位：
Returns an object with the following fields:

| 欄位 / Field | 類型 / Type | 說明 / Description |
|--------------|-------------|---------------------|
| `text` | `string` | 完整小紅書貼文（含 Emoji、分隔線、省錢貼士、hashtag）/ Full RedNote post with emojis, dividers, tips, hashtags |
| `title` | `string` | 貼文標題 / Post title |
| `tags` | `string[]` | 建議標籤列表 / Suggested tag list |
| `rednoteId` | `string` | 目標小紅書帳號 ID / Target RedNote account ID |

### 核心邏輯 / Core Logic

```js
const extract = (label) => {
  const m = content.match(new RegExp(label + '[^:]*?:\\s*RM\\s*([\\d.]+)', 'i'));
  return m ? `RM${m[1]}` : "—";
};
```

`extract()` 函數用正則表達式從原始字串中匹配價格標籤（如 "補貼Budi95"、"RON97"、"西馬"）後面的 `RM X.XX` 數值。配對不到時回傳 "—"。
The `extract()` function uses regex to find price labels (e.g. "Budi95", "RON97", "Peninsular") followed by `RM X.XX`. Returns "—" if not found.

---

## 4. crontab.txt — 定時排程 / Cron Schedule

### Cron 語法解讀 / Cron Syntax Explained

```
0 9 * * 3 cd ~/malaysia-fuel-bot && node index.js >> ~/malaysia-fuel-bot/logs/cron.log 2>&1
```

| 欄位 / Field | 值 / Value | 意思 / Meaning |
|--------------|-----------|----------------|
| 分 / Minute | `0` | 第 0 分 / At minute 0 |
| 時 / Hour | `9` | 早上 9 點 / 9 AM |
| 日 / Day | `*` | 不限日期 / Every day |
| 月 / Month | `*` | 不限月份 / Every month |
| 星期 / Weekday | `3` | 星期三（0=週日, 3=週三）/ Wednesday (0=Sun, 3=Wed) |

**結果：每週三早上 9:00 整自動執行。**
**Result: Automatically runs every Wednesday at 9:00 AM sharp.**

### Termux 部署 / Termux Deployment

```bash
# 安裝 cron 服務 / Install cron service
pkg install cronie termux-services

# 啟用 crond 守護進程 / Enable crond daemon
sv-enable crond

# 載入排程設定 / Load cron schedule
crontab ~/malaysia-fuel-bot/crontab.txt

# 確認載入成功 / Verify
crontab -l
```

---

## 5. publish.sh — 一鍵腳本 / Quick Launch

### 功能 / Purpose

讓你不用記路徑，一行命令搞定全部流程。
One command to run the entire pipeline without memorizing paths.

```bash
bash publish.sh
```

### 腳本內容 / Script Content

```bash
#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
echo "🚀 大馬油價小紅書機器人啟動..."
node index.js
echo ""
echo "📱 最新文案已保存到 output/ 目錄"
echo "   小紅書 App → 點 + → 複製貼上 → 發布到 ID: 8482347273"
```

做了三件事 / Does three things:
1. `cd` 到專案目錄 / Navigates to the project directory
2. 執行 `node index.js` / Runs the bot
3. 提示你去小紅書 App 貼文 / Reminds you to paste into RedNote

---

## 6. package.json — 專案身分證 / Identity

```json
{
  "name": "malaysia-fuel-bot",
  "version": "1.0.0",
  "main": "index.js",
  "description": "大馬油價小紅書機器人 - 全自動生成馬來西亞油價小紅書貼文"
}
```

| 欄位 / Field | 說明 / Description |
|--------------|---------------------|
| `name` | 專案名稱 / Project name |
| `main` | 入口檔案（`node .` 等於 `node index.js`）/ Entry point |
| `description` | 專案簡介 / Brief description |

**注意：** 本專案 `dependencies` 為空，完全零 npm 依賴。
**Note:** This project has zero npm dependencies.

---

## 7. 資料流總覽 / Data Flow

```
每週三 9:00 AM / Every Wednesday 9 AM
        │
        ▼
┌─────────────────────────────────┐
│  cron 觸發 index.js              │
│  cron triggers index.js          │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  fetchFromSetel()               │
│  抓取 Petronas 官方油價           │
│  Scrape Setel.com               │
└─────────────────────────────────┘
        │ 失敗 / fail
        ▼
┌─────────────────────────────────┐
│  fetchFromBitauto()             │
│  備援搜尋 bitauto.my             │
│  Fallback to bitauto.my         │
└─────────────────────────────────┘
        │ 都失敗 / both fail
        ▼
┌─────────────────────────────────┐
│  FALLBACK 硬編碼預設值            │
│  Hardcoded defaults             │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  generateXiaohongshuContent()   │
│  生成小紅書貼文（含 Emoji/Hashtag）│
│  Generate RedNote post          │
└─────────────────────────────────┘
        │
        ├──────────────────────────┐
        ▼                          ▼
┌──────────────┐    ┌──────────────────────┐
│  終端機輸出    │    │  output/ 目錄          │
│  Console out  │    │  xiaohongshu_日期.txt │
└──────────────┘    └──────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  小紅書 App 手動發布             │
│  複製貼上 + 標籤 → 發布           │
│  RedNote App: Copy & Post       │
│  ID: 8482347273                 │
└─────────────────────────────────┘
```

---

## 8. 部署步驟 / Deployment

### 前置需求 / Prerequisites

- **Node.js** v18+（內建 `fetch` 支援 / built-in fetch support）
- **Termux**（Android 手機）/ Android phone with Termux
- **Git**（從 GitHub 下載專案）/ To clone the repo
- **網路連線** / Internet connection

### 步驟 / Steps

#### Step 1: 下載專案 / Clone the Project

```bash
cd ~
git clone https://github.com/koayxinchun4-cmd/malaysia-fuel-bot.git
cd malaysia-fuel-bot
```

#### Step 2: 建立必要目錄 / Create Required Directories

```bash
mkdir -p output logs
```

#### Step 3: 測試運行 / Test Run

```bash
node index.js
```

預期看到類似輸出 / Expected output:
```
Core starting...
正在從 setel.com 爬取大馬最新油價...
  setel.com OK
  最終數據: RON95 (補貼Budi95): RM1.99, RON95 (無補貼): RM3.72, ...

====== 100% 全自動生成結果 ======
🇲🇾 大馬車主注意！本週油價出爐了！
...
📁 文案已保存: output/xiaohongshu_2026-06-25.txt
```

#### Step 4: 部署 Cron 排程 / Deploy Cron Schedule

```bash
pkg install cronie termux-services
sv-enable crond
crontab ~/malaysia-fuel-bot/crontab.txt
crontab -l   # 確認 / Verify
```

#### Step 5: 發布到小紅書 / Publish to RedNote

1. 打開小紅書 App / Open RedNote App
2. 點 `+` 發布 / Tap `+` to create a post
3. 打開 `output/xiaohongshu_日期.txt`，全選複製 / Open the latest file, select all, copy
4. 貼上到小紅書編輯器 / Paste into RedNote editor
5. 加入標籤 / Add tags: `馬來西亞` `大馬油價` `RON95` `RON97` `malaysia` `petrolprice`
6. 發布 / Post ✅

---

## ⚠️ 注意事項 / Important Notes

| 項目 / Item | 說明 / Description |
|-------------|---------------------|
| 小紅書 API | 小紅書沒有公開 API，無法程式化自動發布。文案需手動複製貼上。RedNote has no public API; posts must be manually copy-pasted. |
| 油價來源 | 預設從 Setel.com 抓取，若網站改版可能需調整正則表達式。Default source is Setel.com; regex may need updates if the site changes. |
| 預設值更新 | `FALLBACK` 常數在 `index.js` 第 10 行，若爬蟲長期失敗請手動更新。Update `FALLBACK` at line 10 of `index.js` if scraping fails long-term. |
| Termux 背景執行 | Android 系統可能殺掉 Termux 背景進程，建議關閉電池優化。Android may kill Termux background processes; disable battery optimization. |

---

> GitHub: [koayxinchun4-cmd/malaysia-fuel-bot](https://github.com/koayxinchun4-cmd/malaysia-fuel-bot)
>
> 小紅書 ID / RedNote ID: **8482347273**
*（内容由AI生成，仅供参考）*
