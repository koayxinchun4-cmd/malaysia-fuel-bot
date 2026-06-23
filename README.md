# 🇲🇾 大馬油價小紅書機器人

全自動生成馬來西亞油價小紅書貼文，零外部 API 依賴，一鍵運行。

## 快速開始

```bash
node index.js
```

## 專案結構

```
├── index.js          # 主入口（油價數據爬取 + 調度）
├── xiaohongshu.js    # 小紅書文案生成模組（本地 AI）
└── package.json
```

## 產出範例

```
🇲🇾 大馬車主注意！本週油價出爐了！
⛽️ RON95：RM2.05
🔥 RON97：RM3.19
🚛 Diesel：RM2.15
...
```

## 技術棧

- Node.js v20+
- 零 npm 依賴
- 本地文案生成，無需 API Key

## License

MIT
