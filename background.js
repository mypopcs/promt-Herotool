// 飞书API配置
const FEISHU_CONFIG = {
  appId: "", // 在options页面配置
  appSecret: "", // 在options页面配置
  spreadsheetToken: "", // 在options页面配置
  sheetId: "", // 在options页面配置
};

// 初始化定时同步
chrome.runtime.onInstalled.addListener(() => {
  // 创建每天同步的定时任务
  chrome.alarms.create("dailySync", {
    delayInMinutes: 1,
    periodInMinutes: 24 * 60, // 每24小时
  });
});

// 监听定时任务
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailySync") {
    syncToFeishu();
  }
});

// 获取飞书访问令牌
async function getFeishuAccessToken() {
  const config = await chrome.storage.local.get([
    "feishuAppId",
    "feishuAppSecret",
  ]);

  if (!config.feishuAppId || !config.feishuAppSecret) {
    console.log("飞书配置未设置");
    return null;
  }

  try {
    const response = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: config.feishuAppId,
          app_secret: config.feishuAppSecret,
        }),
      },
    );

    const data = await response.json();
    if (data.code === 0) {
      return data.tenant_access_token;
    } else {
      console.error("获取飞书令牌失败:", data);
      return null;
    }
  } catch (error) {
    console.error("获取飞书令牌错误:", error);
    return null;
  }
}

// 同步数据到飞书
async function syncToFeishu() {
  console.log("开始同步到飞书...");

  const token = await getFeishuAccessToken();
  if (!token) return;

  const config = await chrome.storage.local.get([
    "feishuSpreadsheetToken",
    "feishuSheetId",
  ]);
  const data = await chrome.storage.local.get(["categories", "prompts"]);

  if (!config.feishuSpreadsheetToken || !config.feishuSheetId) {
    console.log("飞书表格配置未设置");
    return;
  }

  try {
    // 准备表格数据
    const rows = [["ID", "分类ID", "分类名称", "提示词文本", "更新时间"]];

    // 添加分类数据
    if (data.categories) {
      data.categories.forEach((cat) => {
        rows.push([cat.id, "", cat.name, "", new Date().toISOString()]);
      });
    }

    // 添加提示词数据
    if (data.prompts) {
      data.prompts.forEach((prompt) => {
        const category = data.categories?.find(
          (c) => c.id === prompt.categoryId,
        );
        rows.push([
          prompt.id,
          prompt.categoryId,
          category?.name || "",
          prompt.text,
          new Date().toISOString(),
        ]);
      });
    }

    // 调用飞书API更新表格
    const response = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${config.feishuSpreadsheetToken}/values_batch_update`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueRanges: [
            {
              range: `${config.feishuSheetId}!A1:E${rows.length}`,
              values: rows,
            },
          ],
        }),
      },
    );

    const result = await response.json();
    if (result.code === 0) {
      console.log("同步到飞书成功");
      await chrome.storage.local.set({
        lastSyncTime: Date.now(),
        lastSyncStatus: "success",
      });
    } else {
      console.error("同步到飞书失败:", result);
      await chrome.storage.local.set({
        lastSyncStatus: "failed",
        lastSyncError: result.msg,
      });
    }
  } catch (error) {
    console.error("同步到飞书错误:", error);
    await chrome.storage.local.set({
      lastSyncStatus: "failed",
      lastSyncError: error.message,
    });
  }
}

// 从飞书同步数据
async function syncFromFeishu() {
  console.log("开始从飞书同步...");

  const token = await getFeishuAccessToken();
  if (!token) return;

  const config = await chrome.storage.local.get([
    "feishuSpreadsheetToken",
    "feishuSheetId",
  ]);

  if (!config.feishuSpreadsheetToken || !config.feishuSheetId) {
    console.log("飞书表格配置未设置");
    return;
  }

  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${config.feishuSpreadsheetToken}/values/${config.feishuSheetId}!A1:E1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();
    if (result.code === 0 && result.data.values) {
      const rows = result.data.values;
      const categories = [];
      const prompts = [];

      // 跳过标题行
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[2] && !row[3]) {
          // 分类行
          categories.push({
            id: row[0],
            name: row[2],
          });
        } else if (row[3]) {
          // 提示词行
          prompts.push({
            id: row[0],
            categoryId: row[1],
            text: row[3],
          });
        }
      }

      await chrome.storage.local.set({ categories, prompts });
      console.log("从飞书同步成功");
    }
  } catch (error) {
    console.error("从飞书同步错误:", error);
  }
}

// 监听来自popup或content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "syncToFeishu") {
    syncToFeishu().then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === "syncFromFeishu") {
    syncFromFeishu().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});
