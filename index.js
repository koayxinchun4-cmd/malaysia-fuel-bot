const { generateXiaohongshuContent } = require('./xiaohongshu');
const fs = require('fs');
const path = require('path');

// ========== 真實油價爬蟲（零 API Key / 零護照）==========
// 來源：setel.com（Petronas 官方，固定 URL）→ bitauto.my → 內建預設值

const OUTPUT_DIR = path.join(__dirname, "output");
const REDNOTE_ID = "8482347273";

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

async function startBot() {
  console.log("Core starting...");
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
