#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# 安裝本地 llama.cpp 模型到 Termux
# Install local llama.cpp model for Termux
# 運行：bash setup_local_llm.sh
# ============================================================

set -e

echo "=========================================="
echo "  安裝 llama.cpp 本地 AI 模型"
echo "  Install llama.cpp Local AI Model"
echo "=========================================="
echo ""

# ---- Step 1: 安裝依賴 / Install dependencies ----
echo "[1/4] 安裝編譯工具 / Installing build tools..."
pkg update -y
pkg install -y cmake git build-essential wget

# ---- Step 2: 下載並編譯 llama.cpp / Clone & build ----
echo ""
echo "[2/4] 下載並編譯 llama.cpp / Cloning & building..."
cd ~
if [ -d "llama.cpp" ]; then
    echo "  llama.cpp 已存在，跳過下載 / Already exists, skipping clone"
    cd llama.cpp
    git pull
else
    git clone https://github.com/ggerganov/llama.cpp.git
    cd llama.cpp
fi

cmake -B build -DGGML_NATIVE=OFF
cmake --build build --config Release -j$(nproc)
echo "  ✅ 編譯完成 / Build complete"

# ---- Step 3: 下載輕量模型 / Download model ----
echo ""
echo "[3/4] 下載 AI 模型 / Downloading AI model..."
echo "  選擇模型 / Choose model:"
echo "  [1] Qwen2.5-1.5B (推薦/Recommended, ~1GB, 速度快)"
echo "  [2] Qwen2.5-3B   (~2GB, 品質高)"
echo "  [3] 自訂 URL / Custom URL"
read -p "  輸入 1/2/3: " choice

case $choice in
  1)
    MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"
    MODEL_FILE="qwen2.5-1.5b-instruct-q4_k_m.gguf"
    ;;
  2)
    MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"
    MODEL_FILE="qwen2.5-3b-instruct-q4_k_m.gguf"
    ;;
  3)
    read -p "  貼上模型 GGUF URL: " MODEL_URL
    MODEL_FILE=$(basename "$MODEL_URL")
    ;;
  *)
    echo "  無效選擇，使用預設 Qwen2.5-1.5B / Invalid choice, using default"
    MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"
    MODEL_FILE="qwen2.5-1.5b-instruct-q4_k_m.gguf"
    ;;
esac

if [ -f "$MODEL_FILE" ]; then
    echo "  模型檔案已存在，跳過下載 / Model file exists, skipping download"
else
    echo "  下載中 / Downloading: $MODEL_FILE"
    wget -O "$MODEL_FILE" "$MODEL_URL"
    echo "  ✅ 下載完成 / Download complete"
fi

# ---- Step 4: 建立啟動腳本 / Create launch script ----
echo ""
echo "[4/4] 建立啟動腳本 / Creating launch script..."

cat > ~/start_llama_server.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# 啟動 llama.cpp server（OpenAI 相容 API）
# Start llama.cpp server (OpenAI-compatible API)
cd ~/llama.cpp
MODEL_FILE=$(ls ~/llama.cpp/*.gguf 2>/dev/null | head -1)
if [ -z "$MODEL_FILE" ]; then
    echo "❌ 找不到 .gguf 模型檔案 / No .gguf model found"
    exit 1
fi
echo "🚀 啟動 llama server / Starting llama server..."
echo "   模型 / Model: $MODEL_FILE"
echo "   API: http://localhost:8080/v1/chat/completions"
echo ""
./build/bin/llama-server -m "$MODEL_FILE" --host 0.0.0.0 --port 8080 -ngl 0
EOF

chmod +x ~/start_llama_server.sh

echo ""
echo "=========================================="
echo "  ✅ 安裝完成！/ Installation complete!"
echo "=========================================="
echo ""
echo "📦 模型檔案 / Model file: ~/llama.cpp/$MODEL_FILE"
echo ""
echo "🚀 啟動 model server:"
echo "   bash ~/start_llama_server.sh"
echo ""
echo "🧪 測試 API / Test API:"
echo "   curl http://localhost:8080/v1/chat/completions \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"model\":\"local\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"max_tokens\":50}'"
echo ""
echo "📱 然後運行油價機器人:"
echo "   cd ~/malaysia-fuel-bot && node index.js"
echo ""
echo "💡 貼士 / Tips:"
echo "   - 模型 server 和機器人需要在同一個 Termux session 或分屏運行"
echo "   - 若手機內存不足，選 Qwen2.5-1.5B (選項1)"
echo "   - 首次生成較慢 (~10秒)，後續會快一些"
