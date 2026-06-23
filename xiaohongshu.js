async function generateXiaohongshuContent(topic, content) {
  // Marvis 全自動本地 AI 生成，零外部 API Key
  // content 格式："RON95 (補貼Budi95): RM1.99, RON95 (無補貼): RM3.72, RON97: RM4.35, ..."
  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  // 解析傳入的真實價格
  const extract = (label) => {
    const m = content.match(new RegExp(label + '[^:]*?:\\s*RM\\s*([\\d.]+)', 'i'));
    return m ? `RM${m[1]}` : "—";
  };

  const budi95    = extract("補貼Budi95") || extract("補貼");
  const ron95     = extract("無補貼");
  const ron97     = extract("RON97");
  const diesel_p  = extract("西馬");
  const diesel_em = extract("東馬");

  return {
    text: `🇲🇾 大馬車主注意！本週油價出爐了！

━━━━━━━━━━━━━━━━━━

⛽️ RON95 (補貼Budi95)：${budi95}
🛢️ RON95 (無補貼)：${ron95}
🔥 RON97：${ron97}
🚛 Diesel (西馬)：${diesel_p}
🏝️ Diesel (東馬)：${diesel_em}

━━━━━━━━━━━━━━━━━━

📅 更新日期：${now}

💡 省錢小貼士：
▸ 用 Setel app 直接在車內付款，不用下車排隊
▸ 東馬柴油只要 ${diesel_em}，西馬朋友羨慕了 😂
▸ Budi95 補貼資格記得檢查，每公升省超多

📌 每週三財政部公佈最新油價，關注我第一時間更新！

━━━━━━━━━━━━━━━━━━

#馬來西亞 #大馬油價 #馬來西亞生活 #RON95 #RON97
#malaysia #petrolprice #penang #kl #johor #sarawak
#省錢攻略 #車主日常 #小紅書馬來西亞

🎯 轉發給你身邊每個開車的朋友！」`,
    // metadata for publishing
    title: "🇲🇾 大馬每週油價更新",
    tags: ["馬來西亞", "大馬油價", "RON95", "RON97", "malaysia", "petrolprice"],
    rednoteId: "8482347273"
  };
}

module.exports = { generateXiaohongshuContent };
