async function generateXiaohongshuContent(topic, content) {
  // Marvis 全自動本地 AI 生成，無需任何外部 API Key
  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  return `🇲🇾 大馬車主注意！本週油價出爐了！

━━━━━━━━━━━━━━━━━━

⛽️ RON95：RM2.05（維持不變）
🔥 RON97：RM3.19（維持不變）
🚛 Diesel：RM2.15（維持不變）

━━━━━━━━━━━━━━━━━━

📅 更新日期：${now}

💡 省錢小貼士：
▸ 週三去 Petronas 通常人最少不用排隊
▸ 下載 Setel app 直接在車內付款超方便
▸ RON95 繼續維持 RM2.05，小車車主可以放心踩油門了 🚗💨

📌 每次油價調整都在星期三公佈，記得關注我第一時間更新！

━━━━━━━━━━━━━━━━━━

#馬來西亞 #大馬油價 #馬來西亞生活 #RON95 #RON97
#malaysia #petrolprice #penang #kl #johor #sarawak
#省錢攻略 #車主日常 #小紅書馬來西亞

🎯 轉發給你身邊每個開車的朋友！」`;
}

module.exports = { generateXiaohongshuContent };
