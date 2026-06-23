#!/data/data/com.termux/files/usr/bin/bash
# 一鍵運行：爬油價 → 生成小紅書文案 → 保存到 output/
# 使用方式: bash publish.sh

cd "$(dirname "$0")"

echo "🚀 大馬油價小紅書機器人啟動..."
node index.js

echo ""
echo "📱 最新文案已保存到 output/ 目錄"
echo "   小紅書 App → 點 + → 複製貼上 → 發布到 ID: 8482347273"
