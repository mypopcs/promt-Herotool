// 等待DOM加载完成
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  bindEvents();
});

// 页面加载时读取配置
async function loadSettings() {
  try {
    const config = await chrome.storage.local.get([
      "feishuAppId",
      "feishuAppSecret",
      "feishuSpreadsheetToken",
      "feishuSheetId",
      "lastSyncTime",
      "lastSyncStatus",
      "lastSyncError",
    ]);

    // 填充表单
    if (config.feishuAppId) {
      document.getElementById("feishuAppId").value = config.feishuAppId;
    }
    if (config.feishuAppSecret) {
      document.getElementById("feishuAppSecret").value = config.feishuAppSecret;
    }
    if (config.feishuSpreadsheetToken) {
      document.getElementById("feishuSpreadsheetToken").value =
        config.feishuSpreadsheetToken;
    }
    document.getElementById("feishuSheetId").value =
      config.feishuSheetId || "Sheet1";

    // 显示同步信息
    if (config.lastSyncTime) {
      const date = new Date(config.lastSyncTime);
      document.getElementById("lastSyncTime").value =
        date.toLocaleString("zh-CN");
    }

    if (config.lastSyncStatus) {
      const statusText =
        config.lastSyncStatus === "success"
          ? "成功"
          : `失败: ${config.lastSyncError || "未知错误"}`;
      document.getElementById("lastSyncStatus").value = statusText;
    }
  } catch (error) {
    console.error("加载设置失败:", error);
    showStatus("加载设置失败: " + error.message, "error");
  }
}

// 绑定事件
function bindEvents() {
  // 保存设置
  document
    .getElementById("saveSettings")
    .addEventListener("click", saveSettings);

  // 测试连接
  document
    .getElementById("testConnection")
    .addEventListener("click", testConnection);
}

// 保存设置
async function saveSettings() {
  const appId = document.getElementById("feishuAppId").value.trim();
  const appSecret = document.getElementById("feishuAppSecret").value.trim();
  const spreadsheetToken = document
    .getElementById("feishuSpreadsheetToken")
    .value.trim();
  const sheetId = document.getElementById("feishuSheetId").value.trim();

  if (!appId || !appSecret || !spreadsheetToken || !sheetId) {
    showStatus("请填写所有必填项", "error");
    return;
  }

  try {
    await chrome.storage.local.set({
      feishuAppId: appId,
      feishuAppSecret: appSecret,
      feishuSpreadsheetToken: spreadsheetToken,
      feishuSheetId: sheetId,
    });

    showStatus("设置保存成功!", "success");
  } catch (error) {
    console.error("保存失败:", error);
    showStatus("保存失败: " + error.message, "error");
  }
}

// 测试连接
async function testConnection() {
  const appId = document.getElementById("feishuAppId").value.trim();
  const appSecret = document.getElementById("feishuAppSecret").value.trim();

  if (!appId || !appSecret) {
    showStatus("请先填写App ID和App Secret", "error");
    return;
  }

  showStatus("正在测试连接...", "success");

  try {
    const response = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      },
    );

    const data = await response.json();

    if (data.code === 0) {
      showStatus("✓ 连接成功! 飞书API配置正确", "success");
    } else {
      showStatus(
        "✗ 连接失败: " + (data.msg || "请检查App ID和App Secret"),
        "error",
      );
    }
  } catch (error) {
    console.error("测试连接失败:", error);
    showStatus("✗ 连接失败: " + error.message, "error");
  }
}

// 显示状态消息
function showStatus(message, type) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;

  if (type === "success") {
    setTimeout(() => {
      statusEl.className = "status";
    }, 3000);
  }
}
