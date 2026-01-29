// 全局状态
let categories = [];
let prompts = [];
let selectedPrompts = [];

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  bindEvents();
});

// 初始化应用
async function initializeApp() {
  await loadData();
  renderAll();
  updateSyncStatus();
}

// 加载数据
async function loadData() {
  const data = await chrome.storage.local.get([
    "categories",
    "prompts",
    "selectedPrompts",
  ]);

  categories = data.categories || getDefaultCategories();
  prompts = data.prompts || getDefaultPrompts();
  selectedPrompts = data.selectedPrompts || [];

  // 如果是第一次使用，保存默认数据
  if (!data.categories || !data.prompts) {
    await saveData();
  }
}

// 获取默认分类
function getDefaultCategories() {
  return [
    { id: "1", name: "画风" },
    { id: "2", name: "主体" },
    { id: "3", name: "场景" },
    { id: "4", name: "光照" },
    { id: "5", name: "质量" },
  ];
}

// 获取默认提示词
function getDefaultPrompts() {
  return [
    { id: "1", categoryId: "1", text: "anime style" },
    { id: "2", categoryId: "1", text: "realistic" },
    { id: "3", categoryId: "1", text: "oil painting" },
    { id: "4", categoryId: "1", text: "watercolor" },
    { id: "5", categoryId: "2", text: "beautiful girl" },
    { id: "6", categoryId: "2", text: "landscape" },
    { id: "7", categoryId: "2", text: "portrait" },
    { id: "8", categoryId: "3", text: "cyberpunk city" },
    { id: "9", categoryId: "3", text: "fantasy world" },
    { id: "10", categoryId: "3", text: "sunset beach" },
    { id: "11", categoryId: "4", text: "soft lighting" },
    { id: "12", categoryId: "4", text: "dramatic lighting" },
    { id: "13", categoryId: "4", text: "golden hour" },
    { id: "14", categoryId: "5", text: "masterpiece" },
    { id: "15", categoryId: "5", text: "best quality" },
    { id: "16", categoryId: "5", text: "8k uhd" },
  ];
}

// 保存数据
async function saveData() {
  await chrome.storage.local.set({
    categories,
    prompts,
    selectedPrompts,
  });
}

// 渲染所有内容
function renderAll() {
  renderUseTab();
  renderManageTab();
}

// 渲染使用标签页
function renderUseTab() {
  const promptsList = document.getElementById("promptsList");
  const selectedSection = document.getElementById("selectedSection");
  const emptyState = document.getElementById("emptyState");

  // 显示/隐藏已选择区域
  if (selectedPrompts.length > 0) {
    selectedSection.style.display = "block";
    renderSelectedTags();
  } else {
    selectedSection.style.display = "none";
  }

  // 检查是否有提示词
  if (prompts.length === 0) {
    promptsList.style.display = "none";
    emptyState.style.display = "flex";
    return;
  }

  promptsList.style.display = "block";
  emptyState.style.display = "none";

  // 渲染分类和提示词
  const html = categories
    .map((category) => {
      const categoryPrompts = prompts.filter(
        (p) => p.categoryId === category.id,
      );
      if (categoryPrompts.length === 0) return "";

      return `
        <div class="category-card">
          <h3>${escapeHtml(category.name)}</h3>
          <div class="prompt-tags">
            ${categoryPrompts
              .map(
                (prompt) => `
                <div class="prompt-tag ${selectedPrompts.includes(prompt.id) ? "selected" : ""}" 
                     data-id="${prompt.id}">
                  ${escapeHtml(prompt.text)}
                </div>
              `,
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  promptsList.innerHTML = html;

  // 绑定提示词点击事件
  document.querySelectorAll(".prompt-tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      togglePromptSelection(tag.dataset.id);
    });
  });
}

// 渲染已选择的标签
function renderSelectedTags() {
  const selectedTags = document.getElementById("selectedTags");

  const html = selectedPrompts
    .map((id) => {
      const prompt = prompts.find((p) => p.id === id);
      return prompt
        ? `<div class="selected-tag">${escapeHtml(prompt.text)}</div>`
        : "";
    })
    .join("");

  selectedTags.innerHTML = html;
}

// 切换提示词选择
async function togglePromptSelection(id) {
  const index = selectedPrompts.indexOf(id);

  if (index > -1) {
    selectedPrompts.splice(index, 1);
  } else {
    selectedPrompts.push(id);
  }

  await saveData();
  renderUseTab();
}

// 清空选择
async function clearSelection() {
  selectedPrompts = [];
  await saveData();
  renderUseTab();
}

// 复制提示词
async function copyPrompts() {
  const texts = selectedPrompts
    .map((id) => prompts.find((p) => p.id === id)?.text)
    .filter(Boolean)
    .join(", ");

  if (!texts) {
    return;
  }

  try {
    await navigator.clipboard.writeText(texts);

    const btn = document.getElementById("copyBtn");
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      已复制!
    `;
    btn.classList.add("copied");

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove("copied");
    }, 2000);
  } catch (error) {
    console.error("复制失败:", error);
  }
}

// 渲染管理标签页
function renderManageTab() {
  renderCategoriesList();
  renderCategorySelect();
  renderPromptsManageList();
}

// 渲染分类列表
function renderCategoriesList() {
  const categoriesList = document.getElementById("categoriesList");

  if (categories.length === 0) {
    categoriesList.innerHTML =
      '<div class="empty-state" style="padding: 20px;">暂无分类</div>';
    return;
  }

  const html = `
    <div class="manage-list">
      ${categories
        .map(
          (category) => `
          <div class="manage-item">
            <div class="manage-item-text">${escapeHtml(category.name)}</div>
            <div class="manage-item-actions">
              <button class="edit-btn" data-id="${category.id}" data-type="category">编辑</button>
              <button class="delete-btn" data-id="${category.id}" data-type="category">删除</button>
            </div>
          </div>
        `,
        )
        .join("")}
    </div>
  `;

  categoriesList.innerHTML = html;

  // 绑定编辑和删除事件
  categoriesList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editCategory(btn.dataset.id));
  });

  categoriesList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(btn.dataset.id));
  });
}

// 渲染分类选择器
function renderCategorySelect() {
  const select = document.getElementById("promptCategorySelect");

  const html = `
    <option value="">选择分类...</option>
    ${categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join("")}
  `;

  select.innerHTML = html;
}

// 渲染提示词管理列表
function renderPromptsManageList() {
  const promptsManageList = document.getElementById("promptsManageList");

  const html = categories
    .map((category) => {
      const categoryPrompts = prompts.filter(
        (p) => p.categoryId === category.id,
      );
      if (categoryPrompts.length === 0) return "";

      return `
        <div class="prompts-manage-section">
          <h4>${escapeHtml(category.name)}</h4>
          <div class="manage-list">
            ${categoryPrompts
              .map(
                (prompt) => `
                <div class="manage-item">
                  <div class="manage-item-text">${escapeHtml(prompt.text)}</div>
                  <div class="manage-item-actions">
                    <button class="edit-btn" data-id="${prompt.id}" data-type="prompt">编辑</button>
                    <button class="delete-btn" data-id="${prompt.id}" data-type="prompt">删除</button>
                  </div>
                </div>
              `,
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  promptsManageList.innerHTML =
    html || '<div class="empty-state" style="padding: 20px;">暂无提示词</div>';

  // 绑定编辑和删除事件
  promptsManageList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editPrompt(btn.dataset.id));
  });

  promptsManageList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deletePrompt(btn.dataset.id));
  });
}

// 添加分类
async function addCategory() {
  const input = document.getElementById("newCategoryInput");
  const name = input.value.trim();

  if (!name) {
    alert("请输入分类名称");
    return;
  }

  categories.push({
    id: Date.now().toString(),
    name,
  });

  await saveData();
  input.value = "";
  renderManageTab();
}

// 编辑分类
async function editCategory(id) {
  const category = categories.find((c) => c.id === id);
  if (!category) return;

  const newName = prompt("编辑分类名称:", category.name);
  if (newName && newName.trim()) {
    category.name = newName.trim();
    await saveData();
    renderAll();
  }
}

// 删除分类
async function deleteCategory(id) {
  if (!confirm("确定删除此分类吗?该分类下的所有提示词也将被删除。")) {
    return;
  }

  categories = categories.filter((c) => c.id !== id);
  prompts = prompts.filter((p) => p.categoryId !== id);
  selectedPrompts = selectedPrompts.filter((sid) => {
    const prompt = prompts.find((p) => p.id === sid);
    return prompt && prompt.categoryId !== id;
  });

  await saveData();
  renderAll();
}

// 添加提示词
async function addPrompt() {
  const categoryId = document.getElementById("promptCategorySelect").value;
  const input = document.getElementById("newPromptInput");
  const text = input.value.trim();

  if (!categoryId) {
    alert("请选择分类");
    return;
  }

  if (!text) {
    alert("请输入提示词内容");
    return;
  }

  prompts.push({
    id: Date.now().toString(),
    categoryId,
    text,
  });

  await saveData();
  input.value = "";
  renderAll();
}

// 编辑提示词
async function editPrompt(id) {
  const targetPrompt = prompts.find((p) => p.id === id);
  if (!targetPrompt) return;

  const newText = prompt("编辑提示词:", targetPrompt.text);
  if (newText && newText.trim()) {
    targetPrompt.text = newText.trim();
    await saveData();
    renderAll();
  }
}

// 删除提示词
async function deletePrompt(id) {
  if (!confirm("确定删除此提示词吗?")) {
    return;
  }

  prompts = prompts.filter((p) => p.id !== id);
  selectedPrompts = selectedPrompts.filter((sid) => sid !== id);

  await saveData();
  renderAll();
}

// 同步到飞书
async function syncToFeishu() {
  const syncBtn = document.getElementById("syncBtn");
  const syncStatus = document.getElementById("syncStatus");

  syncBtn.classList.add("syncing");
  syncStatus.classList.add("syncing");
  syncStatus.querySelector(".status-text").textContent = "同步中...";

  try {
    const response = await chrome.runtime.sendMessage({
      action: "syncToFeishu",
    });

    if (response.success) {
      syncStatus.classList.remove("syncing");
      syncStatus.classList.add("synced");
      syncStatus.querySelector(".status-text").textContent = "同步成功";

      setTimeout(() => {
        updateSyncStatus();
      }, 3000);
    } else {
      throw new Error("同步失败");
    }
  } catch (error) {
    console.error("同步失败:", error);
    syncStatus.classList.remove("syncing");
    syncStatus.querySelector(".status-text").textContent = "同步失败";
    alert("同步失败: " + error.message);
  } finally {
    syncBtn.classList.remove("syncing");
  }
}

// 更新同步状态
async function updateSyncStatus() {
  const syncStatus = document.getElementById("syncStatus");
  const data = await chrome.storage.local.get([
    "lastSyncTime",
    "lastSyncStatus",
  ]);

  if (data.lastSyncTime && data.lastSyncStatus === "success") {
    const date = new Date(data.lastSyncTime);
    const timeStr = formatRelativeTime(date);

    syncStatus.classList.add("synced");
    syncStatus.querySelector(".status-text").textContent =
      `已同步 (${timeStr})`;
  } else if (data.lastSyncStatus === "failed") {
    syncStatus.querySelector(".status-text").textContent = "同步失败";
  } else {
    syncStatus.querySelector(".status-text").textContent = "未同步";
  }
}

// 格式化相对时间
function formatRelativeTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // 秒

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

  return date.toLocaleDateString("zh-CN");
}

// 绑定事件
function bindEvents() {
  // 标签切换
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(tab + "Tab").classList.add("active");
    });
  });

  // 使用标签页事件
  document.getElementById("clearBtn").addEventListener("click", clearSelection);
  document.getElementById("copyBtn").addEventListener("click", copyPrompts);

  // 管理标签页事件
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", addCategory);
  document.getElementById("addPromptBtn").addEventListener("click", addPrompt);

  // 回车键提交
  document
    .getElementById("newCategoryInput")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") addCategory();
    });

  document
    .getElementById("newPromptInput")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") addPrompt();
    });

  // 设置按钮
  document.getElementById("settingsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // 同步按钮
  document.getElementById("syncBtn").addEventListener("click", syncToFeishu);

  // 监听存储变化
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      loadData().then(() => renderAll());
    }
  });
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
