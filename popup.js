// 等待DOM加载完成
document.addEventListener("DOMContentLoaded", () => {
  initializePopup();
});

// 初始化弹窗
function initializePopup() {
  // 打开侧边栏
  document.getElementById("openDrawer").addEventListener("click", async () => {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // 打开侧边栏
      await chrome.sidePanel.open({ windowId: tab.windowId });

      // 关闭弹窗
      window.close();
    } catch (error) {
      console.error("打开侧边栏失败:", error);
      alert("打开侧边栏失败: " + error.message);
    }
  });

  // 打开设置页
  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // 同步到飞书
  document
    .getElementById("syncToFeishu")
    .addEventListener("click", async () => {
      const statusEl = document.getElementById("status");
      const btn = document.getElementById("syncToFeishu");

      btn.disabled = true;
      statusEl.textContent = "正在同步到飞书...";
      statusEl.className = "status";
      statusEl.style.display = "block";

      try {
        const response = await chrome.runtime.sendMessage({
          action: "syncToFeishu",
        });

        if (response && response.success) {
          statusEl.textContent = "✓ 同步成功!";
          statusEl.className = "status success";
        } else {
          statusEl.textContent =
            "✗ 同步失败: " + (response?.error || "未知错误");
          statusEl.className = "status error";
        }
      } catch (error) {
        statusEl.textContent = "✗ 同步失败: " + error.message;
        statusEl.className = "status error";
      } finally {
        btn.disabled = false;
      }

      setTimeout(() => {
        statusEl.style.display = "none";
      }, 3000);
    });

  // 从飞书同步
  document
    .getElementById("syncFromFeishu")
    .addEventListener("click", async () => {
      const statusEl = document.getElementById("status");
      const btn = document.getElementById("syncFromFeishu");

      btn.disabled = true;
      statusEl.textContent = "正在从飞书同步...";
      statusEl.className = "status";
      statusEl.style.display = "block";

      try {
        const response = await chrome.runtime.sendMessage({
          action: "syncFromFeishu",
        });

        if (response && response.success) {
          statusEl.textContent = "✓ 同步成功!";
          statusEl.className = "status success";
        } else {
          statusEl.textContent =
            "✗ 同步失败: " + (response?.error || "未知错误");
          statusEl.className = "status error";
        }
      } catch (error) {
        statusEl.textContent = "✗ 同步失败: " + error.message;
        statusEl.className = "status error";
      } finally {
        btn.disabled = false;
      }

      setTimeout(() => {
        statusEl.style.display = "none";
      }, 3000);
    });

  // 显示上次同步时间
  loadSyncStatus();
}

// 加载同步状态
async function loadSyncStatus() {
  try {
    const data = await chrome.storage.local.get([
      "lastSyncTime",
      "lastSyncStatus",
      "lastSyncError",
    ]);

    if (data.lastSyncTime) {
      const date = new Date(data.lastSyncTime);
      const statusEl = document.getElementById("status");
      const timeStr = date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (data.lastSyncStatus === "success") {
        statusEl.textContent = `上次同步: ${timeStr}`;
        statusEl.className = "status success";
        statusEl.style.display = "block";
      } else if (data.lastSyncStatus === "failed") {
        statusEl.textContent = `同步失败: ${data.lastSyncError || "未知错误"}`;
        statusEl.className = "status error";
        statusEl.style.display = "block";
      }
    }
  } catch (error) {
    console.error("加载同步状态失败:", error);
  }
}
