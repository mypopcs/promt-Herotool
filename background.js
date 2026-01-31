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
  const data = await chrome.storage.local.get(["libraries"]);

  if (!config.feishuSpreadsheetToken || !config.feishuSheetId) {
    console.log("飞书表格配置未设置");
    return;
  }

  if (!data.libraries || data.libraries.length === 0) {
    console.log("没有提示词库数据");
    return;
  }

  try {
    // 准备表格数据
    const rows = [
      [
        "提示词库ID",
        "提示词库名称",
        "分类ID",
        "分类名称",
        "提示词ID",
        "提示词文本",
        "中文解释",
        "备注",
        "更新时间",
      ],
    ];

    // 遍历所有提示词库
    data.libraries.forEach((library) => {
      // 添加提示词库信息
      rows.push([
        library.id,
        library.name,
        "",
        "",
        "",
        "",
        "",
        "",
        new Date().toISOString(),
      ]);

      // 添加分类数据
      if (library.categories) {
        library.categories.forEach((cat) => {
          rows.push([
            library.id,
            library.name,
            cat.id,
            cat.name,
            "",
            "",
            "",
            "",
            new Date().toISOString(),
          ]);
        });
      }

      // 添加提示词数据
      if (library.prompts) {
        library.prompts.forEach((prompt) => {
          const category = library.categories?.find(
            (c) => c.id === prompt.categoryId,
          );
          rows.push([
            library.id,
            library.name,
            prompt.categoryId,
            category?.name || "",
            prompt.id,
            prompt.text,
            prompt.chinese || "",
            prompt.remark || "",
            new Date().toISOString(),
          ]);
        });
      }
    });

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
              range: `${config.feishuSheetId}!A1:I${rows.length}`,
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
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${config.feishuSpreadsheetToken}/values/${config.feishuSheetId}!A1:I1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();
    if (result.code === 0 && result.data.values) {
      const rows = result.data.values;
      const libraries = [];
      const libraryMap = new Map();

      // 跳过标题行
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const libraryId = row[0];
        const libraryName = row[1];

        // 如果是新提示词库，创建它
        if (!libraryMap.has(libraryId)) {
          const library = {
            id: libraryId,
            name: libraryName,
            categories: [],
            prompts: [],
          };
          libraries.push(library);
          libraryMap.set(libraryId, library);
        }

        const library = libraryMap.get(libraryId);
        const categoryId = row[2];
        const categoryName = row[3];
        const promptId = row[4];
        const promptText = row[5];
        const promptChinese = row[6];
        const promptRemark = row[7];

        // 添加分类
        if (categoryId && categoryName && !promptId) {
          if (!library.categories.find((c) => c.id === categoryId)) {
            library.categories.push({
              id: categoryId,
              name: categoryName,
            });
          }
        }

        // 添加提示词
        if (promptId && promptText) {
          if (!library.prompts.find((p) => p.id === promptId)) {
            library.prompts.push({
              id: promptId,
              categoryId: categoryId,
              text: promptText,
              chinese: promptChinese || "",
              remark: promptRemark || "",
            });
          }
        }
      }

      await chrome.storage.local.set({
        libraries,
        currentLibraryId: libraries[0]?.id || "",
      });
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
