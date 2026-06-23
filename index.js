const { generateXiaohongshuContent } = require('./xiaohongshu');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ========== 真實油價爬蟲（零 API Key / 零護照）==========
// 來源：setel.com（Petronas 官方，固定 URL）→ bitauto.my → 內建預設值

const OUTPUT_DIR = path.join(__dirname, "output");
const REDNOTE_ID = "8482347273";
const LLAMA_SERVER_URL = "http://localhost:8080";
const LLAMA_BIN = path.join(process.env.HOME, "llama.cpp/llama-b9771/llama-server");
const LLAMA_LIB = path.join(process.env.HOME, "llama.cpp/llama-b9771");
const LLAMA_MODEL = path.join(process.env.HOME, "llama.cpp/qwen2.5-1.5b-instruct-q4_k_m.gguf");

const FALLBACK = {
  ron95_sub: "1.99", ron95_unsub: "3.72",
  ron97: "4.35", diesel_p: "4.37", diesel_em: "2.15"
};

async function fetchFromSetel() {
  const res = await fetch("https://www.setel.com/latest-fuel-prices-malaysia");
  const html = await res.text();
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const penBlock = text.match(/Peninsular Malaysia([\s\S]{0,1000}?)Sabah/i);
  const target = penBlock ? penBlock[0] : text;

  const ron95_unsub = (target.match(/RON95[^R]{0,200}?RM\s*([\d.]+)/i) || [])[1] || null;
  const ron95_sub = (text.match(/BUDI95[\s\S]{0,200}?RM\s*([\d.]+)/i) || text.match(/Subsidised[\s\S]{0,300}?RON95[\s\S]{0,100}?RM\s*([\d.]+)/i) || [])[1] || null;
  const ron97    = (target.match(/RON97[^R]{0,200}?RM\s*([\d.]+)/i) || [])[1] || null;
  const diesel_p = (text.match(/Peninsular Malaysia[\s\S]{0,600}?Diesel[\s\S]{0,200}?RM\s*([\d.]+)/i) || [])[1] || null;
  const diesel_em = (text.match(/Sabah[\s\S]{0,300}?Diesel[\s\S]{0,200}?RM\s*([\d.]+)/i) || [])[1] || null;

  return { ron95_sub, ron95_unsub, ron97, diesel_p, diesel_em };
}

async function fetchFromBitauto() {
  const searchRes = await fetch("https://www.bitauto.my/en/news/", { headers: { "User-Agent": "Mozilla/5.0" } });
  const searchHtml = await searchRes.text();
  const linkMatch = searchHtml.match(/href="(\/en\/news\/\d+\.html)"[^>]*>[\s\S]{0,50}?(?:fuel|petrol|diesel|RON)/i);
  if (!linkMatch) return null;
  const artUrl = "https://www.bitauto.my" + linkMatch[1];
  const artRes = await fetch(artUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const artHtml = await artRes.text();
  const artText = artHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return {
    ron95_sub:    (artText.match(/RON95\s*\(Subsidised\)[^R]*?RM\s*([\d.]+)/i) || [])[1] || null,
    ron95_unsub:  (artText.match(/RON95\s*\(Unsubsidised\)[^R]*?RM\s*([\d.]+)/i) || [])[1] || null,
    ron97:        (artText.match(/RON97[^R]*?RM\s*([\d.]+)/i) || [])[1] || null,
    diesel_p:     (artText.match(/Diesel\s*\(Peninsular[^)]*\)[^R]*?RM\s*([\d.]+)/i) || [])[1] || null,
    diesel_em:    (artText.match(/(?:Sabah|Sarawak|Labuan)[^R]*?Diesel[^R]*?RM\s*([\d.]+)/i) || [])[1] || null,
  };
}

async function fetchMalaysiaFuelPrices() {
  console.log("正在從 setel.com 爬取大馬最新油價...");

  let prices = null;

  try { prices = await fetchFromSetel(); console.log("  setel.com OK"); }
  catch (e) { console.warn("  setel.com 失敗:", e.message); }

  if (!prices || (!prices.ron95_unsub && !prices.ron97)) {
    try {
      console.log("  嘗試 bitauto.my...");
      prices = await fetchFromBitauto();
      if (prices) console.log("  bitauto.my OK");
    } catch (e) { console.warn("  bitauto.my 失敗:", e.message); }
  }

  const p = prices || {};
  const fb = FALLBACK;
  const ron95_sub   = p.ron95_sub   || fb.ron95_sub;
  const ron95_unsub = p.ron95_unsub || fb.ron95_unsub;
  const ron97       = p.ron97       || fb.ron97;
  const diesel_p    = p.diesel_p    || fb.diesel_p;
  const diesel_em   = p.diesel_em   || fb.diesel_em;

  const content = [
    `RON95 (補貼Budi95): RM${ron95_sub}`,
    `RON95 (無補貼): RM${ron95_unsub}`,
    `RON97: RM${ron97}`,
    `Diesel (西馬): RM${diesel_p}`,
    `Diesel (東馬): RM${diesel_em}`,
  ].join(", ");

  console.log(`  最終數據: ${content}`);
  return { success: !!prices && (!!p.ron95_unsub || !!p.ron97), topic: "馬來西亞每週最新油價更新", content };
}

// ========== 自動啟動本地 llama.cpp server ==========
async function ensureLlamaServer() {
  // 先檢查 server 是否已在運行 / Check if server already running
  try {
    const check = await fetch(`${LLAMA_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (check.ok) {
      console.log("✅ llama server 已在運行 / already running");
      return;
    }
  } catch (_) { /* server not running, start it */ }

  // 檢查執行檔和模型是否存在
  if (!fs.existsSync(LLAMA_BIN)) {
    console.log("⚠️ llama-server 不存在，跳過 / binary not found, skipping");
    return;
  }
  if (!fs.existsSync(LLAMA_MODEL)) {
    console.log("⚠️ 模型檔案不存在，跳過 / model file not found, skipping");
    return;
  }

  console.log("🔄 啟動本地 llama server... / Starting local llama server...");

  const server = spawn(LLAMA_BIN, [
    "-m", LLAMA_MODEL,
    "--host", "0.0.0.0",
    "--port", "8080",
    "-ngl", "0"
  ], {
    cwd: LLAMA_LIB,
    env: { ...process.env, LD_LIBRARY_PATH: LLAMA_LIB },
    stdio: ["ignore", "pipe", "pipe"]
  });

  // 等待 server ready / Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log("⚠️ server 啟動超時，繼續使用模板 / startup timeout, using template");
      resolve();
    }, 60000);

    server.stdout.on("data", (data) => {
      const text = data.toString();
      if (text.includes("server is listening")) {
        clearTimeout(timeout);
        console.log("✅ llama server 已啟動 / server started");
        resolve();
      }
    });

    server.stderr.on("data", (data) => {
      // llama.cpp logs to stderr, ignore
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      console.log("⚠️ 無法啟動 server:", err.message);
      resolve();
    });

    server.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) console.log(`⚠️ server 異常退出 / crashed (code ${code})`);
      resolve();
    });

    // 不等待 server 結束，放背景繼續跑 / Keep server running in background
    server.unref();
  });
}

async function startBot() {
  console.log("Bot starting...");

  // 自動啟動本地 AI server（若尚未運行）
  await ensureLlamaServer();

  const fuelData = await fetchMalaysiaFuelPrices();

  try {
    const result = await generateXiaohongshuContent(fuelData.topic, fuelData.content);
    const postText = result.text;

    console.log("\n====== 100% 全自動生成結果 ======");
    console.log(postText);

    // 保存到 output/ 目錄，方便手動複製到小紅書
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const filename = `xiaohongshu_${new Date().toISOString().slice(0, 10)}.txt`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, postText, "utf-8");
    console.log(`\n📁 文案已保存: ${filepath}`);

    // 小紅書發布資訊（無公開 API，需手動複製）
    console.log(`\n📱 小紅書發布指引:`);
    console.log(`   帳號 ID: ${REDNOTE_ID}`);
    console.log(`   1. 打開小紅書 App → 點 + 發布`);
    console.log(`   2. 複製上方文案內容貼入`);
    console.log(`   3. 加入標籤: ${result.tags.join(" ")}`);
    console.log(`   4. 確認後發布 ✅`);
  } catch (error) {
    console.log("\n====== 100% 全自動生成結果 ======");
    console.log("## 🇲🇾 大馬綜合情報導覽總部");
    console.log("### 💡 AI 生成的小紅書貼文");
    console.log("⚠️ AI 貼文生成失敗:", error.message);
  }
}

startBot();
