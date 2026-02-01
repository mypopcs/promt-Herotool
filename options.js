console.log("=== Options Script 加载 ===");

// 等待DOM加载完成
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM加载完成,开始初始化...");
  await loadSettings();
  bindEvents();
  console.log("Options页面初始化完成");
});

// 页面加载时读取配置
async function loadSettings() {
  console.log("--- 开始加载设置 ---");

  try {
    const config = await chrome.storage.local.get([
      "feishuAppId",
      "feishuAppSecret",
      "feishuTableId",
      "feishuWikiNodeId",
      "lastSyncTime",
      "lastSyncStatus",
      "lastSyncError",
    ]);

    console.log("读取到的配置:", {
      hasAppId: !!config.feishuAppId,
      hasAppSecret: !!config.feishuAppSecret,
      hasTableId: !!config.feishuTableId,
      tableId: config.feishuTableId,
      hasWikiNodeId: !!config.feishuWikiNodeId,
      wikiNodeId: config.feishuWikiNodeId,
    });

    // 填充表单
    if (config.feishuAppId) {
      document.getElementById("feishuAppId").value = config.feishuAppId;
      console.log("✓ App ID已填充");
    }
    if (config.feishuAppSecret) {
      document.getElementById("feishuAppSecret").value = config.feishuAppSecret;
      console.log("✓ App Secret已填充");
    }
    if (config.feishuTableId) {
      document.getElementById("feishuSheetId").value = config.feishuTableId;
      console.log("✓ Table ID已填充:", config.feishuTableId);
    }
    if (config.feishuWikiNodeId) {
      document.getElementById("feishuWikiNodeId").value =
        config.feishuWikiNodeId;
      console.log("✓ Wiki 节点 ID已填充:", config.feishuWikiNodeId);
    }

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

    console.log("✓ 设置加载完成");
  } catch (error) {
    console.error("加载设置失败:", error);
    showStatus("加载设置失败: " + error.message, "error");
  }
}

// 绑定事件
function bindEvents() {
  console.log("绑定事件...");

  // 保存设置
  document
    .getElementById("saveSettings")
    .addEventListener("click", saveSettings);

  // 测试连接
  document
    .getElementById("testConnection")
    .addEventListener("click", testConnection);

  console.log("✓ 事件绑定完成");
}

// 保存设置
async function saveSettings() {
  console.log("--- 开始保存设置 ---");

  const appId = document.getElementById("feishuAppId").value.trim();
  const appSecret = document.getElementById("feishuAppSecret").value.trim();
  const tableId = document.getElementById("feishuSheetId").value.trim();
  const wikiNodeId = document.getElementById("feishuWikiNodeId").value.trim();

  console.log("准备保存的配置:", {
    appId: appId ? "已填写" : "未填写",
    appSecret: appSecret ? "已填写" : "未填写",
    tableId: tableId,
    wikiNodeId: wikiNodeId || "未填写",
  });

  if (!appId || !appSecret || !tableId) {
    const missing = [];
    if (!appId) missing.push("App ID");
    if (!appSecret) missing.push("App Secret");
    if (!tableId) missing.push("Table ID");

    const errorMsg = `请填写所有必填项: ${missing.join(", ")}`;
    console.error(errorMsg);
    showStatus(errorMsg, "error");
    return;
  }

  try {
    const dataToSave = {
      feishuAppId: appId,
      feishuAppSecret: appSecret,
      feishuTableId: tableId,
    };

    if (wikiNodeId) {
      dataToSave.feishuWikiNodeId = wikiNodeId;
    }

    console.log("调用storage.local.set保存数据...");
    await chrome.storage.local.set(dataToSave);
    console.log("✓ 数据已保存");

    // 验证保存是否成功
    const verification = await chrome.storage.local.get([
      "feishuAppId",
      "feishuTableId",
      "feishuWikiNodeId",
    ]);
    console.log("验证保存结果:", verification);

    if (
      verification.feishuAppId === appId &&
      verification.feishuTableId === tableId &&
      (!wikiNodeId || verification.feishuWikiNodeId === wikiNodeId)
    ) {
      console.log("✓ 验证成功,数据保存正确");
      showStatus("设置保存成功!", "success");
    } else {
      console.error("✗ 验证失败,保存的数据不正确");
      showStatus("保存失败: 数据验证不通过", "error");
    }
  } catch (error) {
    console.error("保存失败:", error);
    showStatus("保存失败: " + error.message, "error");
  }
}

// 测试连接
async function testConnection() {
  console.log("--- 开始测试连接 ---");

  const appId = document.getElementById("feishuAppId").value.trim();
  const appSecret = document.getElementById("feishuAppSecret").value.trim();

  console.log("测试连接配置:", {
    hasAppId: !!appId,
    hasAppSecret: !!appSecret,
  });

  if (!appId || !appSecret) {
    showStatus("请先填写App ID和App Secret", "error");
    return;
  }

  showStatus("正在测试连接...", "success");

  try {
    console.log("发送测试请求到飞书...");
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
    console.log("飞书响应:", data);

    if (data.code === 0) {
      console.log("✓ 连接测试成功");
      showStatus("✓ 连接成功! 飞书API配置正确", "success");
    } else {
      console.error("✗ 连接测试失败:", data.msg);
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
  console.log(`[状态] ${type}: ${message}`);

  // 创建自定义消息框
  const messageBox = document.createElement("div");
  messageBox.className = `message-box ${type}`;

  // 添加图标
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  else if (type === "error") icon = "❌";
  else if (type === "warning") icon = "⚠️";

  messageBox.innerHTML = `
    <div class="icon">${icon}</div>
    <div class="content">${message}</div>
  `;

  // 添加到页面
  document.body.appendChild(messageBox);

  // 3秒后自动移除
  setTimeout(() => {
    messageBox.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => {
      document.body.removeChild(messageBox);
    }, 300);
  }, 3000);
}

console.log("=== Options Script 加载完成 ===");
