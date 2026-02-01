console.log("=== Background Script 开始加载 ===");

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log("=== 插件已安装/更新 ===");

  // 创建每天同步的定时任务
  chrome.alarms.create("dailySync", {
    delayInMinutes: 1440, // 24小时
    periodInMinutes: 1440,
  });

  console.log("定时同步任务已创建");
});

// 监听定时任务
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("=== 定时任务触发 ===", alarm.name);
  if (alarm.name === "dailySync") {
    syncToFeishu().catch((err) => {
      console.error("定时同步失败:", err);
    });
  }
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log("=== 快捷键触发 ===", command);
  if (command === "toggle_sidepanel") {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log("侧边栏已打开");
    } catch (error) {
      console.error("打开侧边栏失败:", error);
    }
  }
});

// 监听来自其他页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("=== 收到消息 ===", request.action);

  if (request.action === "syncToFeishu") {
    syncToFeishu()
      .then(() => {
        console.log("同步到飞书成功");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("同步到飞书失败:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开启
  } else if (request.action === "syncFromFeishu") {
    syncFromFeishu()
      .then(() => {
        console.log("从飞书同步成功");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("从飞书同步失败:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开启
  }
});

// 获取飞书访问令牌
async function getFeishuAccessToken() {
  const config = await chrome.storage.local.get([
    "feishuAppId",
    "feishuAppSecret",
  ]);

  if (!config.feishuAppId || !config.feishuAppSecret) {
    throw new Error("飞书配置未设置");
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
      throw new Error(data.msg || "获取令牌失败");
    }
  } catch (error) {
    console.error("获取飞书令牌错误:", error);
    throw error;
  }
}

// 通过 Wiki API 获取多维表格的 app_token
async function getBitableAppTokenFromWiki(token, wikiNodeId) {
  try {
    const url = `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=${wikiNodeId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    if (result.code === 0 && result.data && result.data.node) {
      const nodeType = result.data.node.obj_type;
      if (nodeType !== "bitable") {
        throw new Error(`该节点不是多维表格，类型为: ${nodeType}`);
      }
      const appToken = result.data.node.obj_token;
      if (!appToken) {
        throw new Error("无法获取多维表格的 app_token");
      }
      return appToken;
    } else {
      throw new Error(result.msg || "获取多维表格信息失败");
    }
  } catch (error) {
    console.error("从 Wiki 获取 app_token 错误:", error);
    throw error;
  }
}

// 同步数据到飞书多维表格
async function syncToFeishu() {
  try {
    const token = await getFeishuAccessToken();
    const config = await chrome.storage.local.get([
      "feishuAppId",
      "feishuTableId",
      "feishuWikiNodeId",
    ]);

    if (!config.feishuAppId || !config.feishuTableId) {
      throw new Error("飞书多维表格配置未设置");
    }

    if (!config.feishuTableId.startsWith("tbl")) {
      throw new Error("表格ID格式错误，应该以 tbl 开头");
    }

    let appToken = config.feishuAppId;
    if (config.feishuWikiNodeId) {
      try {
        appToken = await getBitableAppTokenFromWiki(
          token,
          config.feishuWikiNodeId,
        );
      } catch (error) {
        // 使用配置的 appId
      }
    }

    const data = await chrome.storage.local.get(["libraries"]);
    if (!data.libraries || data.libraries.length === 0) {
      throw new Error("没有提示词库数据");
    }

    try {
      await clearBitableRecords(token, appToken, config.feishuTableId);
    } catch (error) {
      // 表格可能为空，继续执行
    }

    const records = [];
    data.libraries.forEach((library) => {
      records.push({
        fields: {
          提示词ID: "",
          提示词: "",
          中文解释: "",
          备注: "提示词库",
          分类ID: "",
          分类名称: "",
          提示词库ID: library.id || "",
          提示词库名称: library.name || "",
        },
      });

      if (library.categories && library.categories.length > 0) {
        library.categories.forEach((category) => {
          records.push({
            fields: {
              提示词ID: "",
              提示词: "",
              中文解释: "",
              备注: "分类",
              分类ID: category.id || "",
              分类名称: category.name || "",
              提示词库ID: library.id || "",
              提示词库名称: library.name || "",
            },
          });
        });
      }

      if (library.prompts && library.prompts.length > 0) {
        library.prompts.forEach((prompt) => {
          const category = library.categories?.find(
            (c) => c.id === prompt.categoryId,
          );
          records.push({
            fields: {
              提示词ID: prompt.id || "",
              提示词: prompt.text || "",
              中文解释: prompt.chinese || "",
              备注: prompt.remark || "",
              分类ID: prompt.categoryId || "",
              分类名称: category?.name || "",
              提示词库ID: library.id || "",
              提示词库名称: library.name || "",
            },
          });
        });
      }
    });

    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await insertBitableRecords(token, appToken, config.feishuTableId, batch);
    }

    await chrome.storage.local.set({
      lastSyncTime: Date.now(),
      lastSyncStatus: "success",
      lastSyncError: "",
    });
  } catch (error) {
    console.error("飞书同步失败:", error.message);
    await chrome.storage.local.set({
      lastSyncStatus: "failed",
      lastSyncError: error.message,
    });
    throw error;
  }
}

// 清空多维表格的所有记录
async function clearBitableRecords(token, appToken, tableId) {
  try {
    // 1. 获取所有记录ID
    let allRecordIds = [];
    let hasMore = true;
    let pageToken = undefined;

    while (hasMore) {
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=500${pageToken ? `&page_token=${pageToken}` : ""}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.code === 0) {
        const recordIds = result.data.items.map((item) => item.record_id);
        allRecordIds = allRecordIds.concat(recordIds);
        hasMore = result.data.has_more;
        pageToken = result.data.page_token;
      } else {
        throw new Error(result.msg || "获取记录失败");
      }
    }

    // 2. 批量删除记录
    if (allRecordIds.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < allRecordIds.length; i += batchSize) {
        const batch = allRecordIds.slice(i, i + batchSize);
        const response = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_delete`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ record_ids: batch }),
          },
        );

        const result = await response.json();
        if (result.code !== 0) {
          throw new Error(result.msg || "删除记录失败");
        }
      }
    }
  } catch (error) {
    console.error("清空记录错误:", error);
    throw error;
  }
}

// 批量插入多维表格记录
async function insertBitableRecords(token, appToken, tableId, records) {
  const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: records }),
    });

    const result = await response.json();
    if (result.code !== 0) {
      throw new Error(result.msg || "插入记录失败");
    }

    return result.data;
  } catch (error) {
    console.error("插入记录错误:", error);
    throw error;
  }
}

// 从飞书多维表格同步数据
async function syncFromFeishu() {
  try {
    const token = await getFeishuAccessToken();
    const config = await chrome.storage.local.get([
      "feishuAppToken",
      "feishuTableId",
    ]);

    if (!config.feishuAppToken || !config.feishuTableId) {
      throw new Error("飞书多维表格配置未设置");
    }

    let allRecords = [];
    let hasMore = true;
    let pageToken = undefined;

    while (hasMore) {
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records?page_size=500${pageToken ? `&page_token=${pageToken}` : ""}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.code === 0) {
        allRecords = allRecords.concat(result.data.items);
        hasMore = result.data.has_more;
        pageToken = result.data.page_token;
      } else {
        throw new Error(result.msg || "获取记录失败");
      }
    }

    const libraries = [];
    const libraryMap = new Map();

    allRecords.forEach((record) => {
      const fields = record.fields;
      const dataType = fields["备注"];
      const libraryId = fields["提示词库ID"];
      const libraryName = fields["提示词库名称"];

      if (libraryId && !libraryMap.has(libraryId)) {
        const library = {
          id: libraryId,
          name: libraryName || "未命名提示词库",
          categories: [],
          prompts: [],
        };
        libraries.push(library);
        libraryMap.set(libraryId, library);
      }

      if (dataType === "分类") {
        const categoryId = fields["分类ID"];
        const categoryName = fields["分类名称"];
        const library = libraryMap.get(libraryId);
        if (library && categoryId && categoryName) {
          if (!library.categories.find((c) => c.id === categoryId)) {
            library.categories.push({
              id: categoryId,
              name: categoryName,
            });
          }
        }
      } else if (dataType !== "提示词库" && dataType !== "分类") {
        const promptId = fields["提示词ID"];
        const promptText = fields["提示词"];
        const categoryId = fields["分类ID"];
        const library = libraryMap.get(libraryId);
        if (library && promptId && promptText) {
          if (!library.prompts.find((p) => p.id === promptId)) {
            library.prompts.push({
              id: promptId,
              categoryId: categoryId,
              text: promptText,
              chinese: fields["中文解释"] || "",
              remark: fields["备注"] || "",
            });
          }
        }
      }
    });

    await chrome.storage.local.set({
      libraries,
      currentLibraryId: libraries[0]?.id || "",
      lastSyncTime: Date.now(),
      lastSyncStatus: "success",
      lastSyncError: "",
    });
  } catch (error) {
    console.error("从飞书同步失败:", error.message);
    await chrome.storage.local.set({
      lastSyncStatus: "failed",
      lastSyncError: error.message,
    });
    throw error;
  }
}

console.log("=== Background Script 加载完成 ===");
