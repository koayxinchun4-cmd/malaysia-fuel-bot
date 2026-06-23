// ============================================================
// 小紅書文案生成引擎 / RedNote Content Engine
// 支援雙模式：本地 llama.cpp 模型（優先） + 內建模板（備援）
// Dual mode: local llama.cpp model (priority) + built-in template (fallback)
// ============================================================

const LLAMA_SERVER_URL = "http://localhost:8080";  // Termux llama.cpp server
const LLAMA_TIMEOUT = 300000;                      // 5 分鐘超時（手機跑 1.5B 模型較慢）

/**
 * 呼叫本地 llama.cpp server 生成小紅書文案
 * @returns {object|null} {text, source: "local"} or null
 */
async function generateWithLocalModel(prices) {
  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  // 精簡 prompt，省 token 也加快手機生成速度
  const prompt = `用繁體中文生成一篇小紅書油價貼文。語氣活潑，含 Emoji。
油價：RON95補貼${prices.budi95}，RON95無補貼${prices.ron95}，RON97 ${prices.ron97}，柴油西馬${prices.diesel_p}，柴油東馬${prices.diesel_em}。日期${now}。
結尾 hashtag：#馬來西亞 #大馬油價 #RON95 #RON97 #malaysia #petrolprice
只輸出貼文。`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLAMA_TIMEOUT);

    const res = await fetch(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text || text.length < 30) return null;

    return {
      text: text,
      source: "local",  // 標記來源 / Mark source
      title: "🇲🇾 大馬每週油價更新",
      tags: ["馬來西亞", "大馬油價", "RON95", "RON97", "malaysia", "petrolprice"],
      rednoteId: "8482347273"
    };
  } catch (e) {
    return null;  // 本地模型不可用，回退到模板 / Local model unavailable, fallback
  }
}

/**
 * 內建模板生成（備援方案）
 * Built-in template generation (fallback)
 */
function generateTemplate(prices) {
  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  return {
    text: `🇲🇾 大馬車主注意！本週油價出爐了！

━━━━━━━━━━━━━━━━━━

⛽️ RON95 (補貼Budi95)：${prices.budi95}
🛢️ RON95 (無補貼)：${prices.ron95}
🔥 RON97：${prices.ron97}
🚛 Diesel (西馬)：${prices.diesel_p}
🏝️ Diesel (東馬)：${prices.diesel_em}

━━━━━━━━━━━━━━━━━━

📅 更新日期：${now}

💡 省錢小貼士：
▸ 用 Setel app 直接在車內付款，不用下車排隊
▸ 東馬柴油只要 ${prices.diesel_em}，西馬朋友羨慕了 😂
▸ Budi95 補貼資格記得檢查，每公升省超多

📌 每週三財政部公佈最新油價，關注我第一時間更新！

━━━━━━━━━━━━━━━━━━

#馬來西亞 #大馬油價 #馬來西亞生活 #RON95 #RON97
#malaysia #petrolprice #penang #kl #johor #sarawak
#省錢攻略 #車主日常 #小紅書馬來西亞

🎯 轉發給你身邊每個開車的朋友！」`,
    source: "template",  // 標記來源 / Mark source
    title: "🇲🇾 大馬每週油價更新",
    tags: ["馬來西亞", "大馬油價", "RON95", "RON97", "malaysia", "petrolprice"],
    rednoteId: "8482347273"
  };
}

/**
 * 主入口：先嘗試本地模型，失敗則用模板
 * Main entry: try local model first, fallback to template
 */
async function generateXiaohongshuContent(topic, content) {
  // 解析傳入的真實價格 / Parse incoming real prices
  const extract = (label) => {
    const m = content.match(new RegExp(label + '[^:]*?:\\s*RM\\s*([\\d.]+)', 'i'));
    return m ? `RM${m[1]}` : "—";
  };

  const prices = {
    budi95:    extract("補貼Budi95") || extract("補貼"),
    ron95:     extract("無補貼"),
    ron97:     extract("RON97"),
    diesel_p:  extract("西馬"),
    diesel_em: extract("東馬"),
  };

  // 優先嘗試本地模型 / Try local model first
  const localResult = await generateWithLocalModel(prices);
  if (localResult) {
    console.log("✅ 文案來源: 本地 llama.cpp 模型 / Source: local LLM");
    return localResult;
  }

  // 本地模型不可用，用內建模板 / Local model unavailable, use template
  console.log("⚠️ 本地模型不可用，使用內建模板 / Local model unavailable, using template");
  return generateTemplate(prices);
}

module.exports = { generateXiaohongshuContent };
