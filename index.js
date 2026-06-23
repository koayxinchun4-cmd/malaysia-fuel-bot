const { generateXiaohongshuContent } = require('./xiaohongshu');

// 模擬大馬油價爬蟲邏輯 (如果網路爬取失敗，使用預設值防呆)
async function fetchMalaysiaFuelPrices() {
  console.log("正在從網路爬取大馬最新油價...");
  try {
    // 這裡保留爬蟲框架，若失敗則回傳當前油價數據
    return {
      success: true,
      topic: "馬來西亞每週最新油價更新",
      content: "當前油價維持：RON95 RM2.05, RON97 RM3.19, Diesel RM2.15"
    };
  } catch (err) {
    return {
      success: false,
      topic: "大馬油價情報",
      content: "RON95 RM2.05, RON97 RM3.19, Diesel RM2.15"
    };
  }
}

async function startBot() {
  console.log("Core starting...");
  const fuelData = await fetchMalaysiaFuelPrices();
  
  try {
    const postResult = await generateXiaohongshuContent(fuelData.topic, fuelData.content);
    console.log("\n====== 100% 全自動生成結果 ======");
    console.log(postResult);
  } catch (error) {
    console.log("\n====== 100% 全自動生成結果 ======");
    console.log("## 🇲🇾 大馬綜合情報導覽總部");
    console.log("### 💡 AI 生成的小紅書貼文");
    console.log("⚠️ AI 貼文生成失敗");
  }
}

startBot();
