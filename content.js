// 创建右侧抽屉
let drawer = null;
let isDrawerOpen = false;

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleDrawer") {
    toggleDrawer();
  }
});

// 切换抽屉显示
function toggleDrawer() {
  if (isDrawerOpen) {
    closeDrawer();
  } else {
    openDrawer();
  }
}

// 打开抽屉
function openDrawer() {
  if (drawer) {
    drawer.remove();
  }

  // 创建抽屉容器
  drawer = document.createElement("div");
  drawer.id = "ai-prompt-drawer";
  drawer.innerHTML = `
    <div class="drawer-overlay"></div>
    <div class="drawer-content">
      <div class="drawer-header">
        <h2>AI绘画提示词管理器</h2>
        <button class="close-btn" id="closeDrawer">×</button>
      </div>
      <div class="drawer-tabs">
        <button class="tab-btn active" data-tab="use">使用提示词</button>
        <button class="tab-btn" data-tab="manage">管理设置</button>
      </div>
      <div class="drawer-body">
        <div class="tab-content active" id="useTab">
          <div id="selectedPrompts" class="selected-prompts" style="display: none;">
            <div class="selected-header">
              <h3>已选择的提示词</h3>
              <button id="clearSelection">清空</button>
            </div>
            <div id="selectedList" class="selected-list"></div>
            <button id="copyPrompts" class="copy-btn">复制提示词</button>
          </div>
          <div id="promptsList"></div>
        </div>
        <div class="tab-content" id="manageTab">
          <div class="manage-section">
            <h3>添加分类</h3>
            <div class="input-group">
              <input type="text" id="newCategoryName" placeholder="分类名称">
              <button id="addCategory">添加</button>
            </div>
          </div>
          <div class="manage-section">
            <h3>分类管理</h3>
            <div id="categoriesList"></div>
          </div>
          <div class="manage-section">
            <h3>添加提示词</h3>
            <select id="newPromptCategory">
              <option value="">选择分类</option>
            </select>
            <div class="input-group">
              <input type="text" id="newPromptText" placeholder="提示词内容">
              <button id="addPrompt">添加</button>
            </div>
          </div>
          <div class="manage-section">
            <h3>提示词管理</h3>
            <div id="promptsManageList"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(drawer);
  isDrawerOpen = true;

  // 加载数据并渲染
  loadAndRender();

  // 绑定事件
  bindEvents();
}

// 关闭抽屉
function closeDrawer() {
  if (drawer) {
    drawer.remove();
    drawer = null;
    isDrawerOpen = false;
  }
}

// 加载数据并渲染
async function loadAndRender() {
  const data = await chrome.storage.local.get([
    "categories",
    "prompts",
    "selectedPrompts",
  ]);

  const categories = data.categories || [];
  const prompts = data.prompts || [];
  const selectedPrompts = data.selectedPrompts || [];

  renderUseTab(categories, prompts, selectedPrompts);
  renderManageTab(categories, prompts);
}

// 渲染使用标签页
function renderUseTab(categories, prompts, selectedPrompts) {
  const promptsList = document.getElementById("promptsList");
  const selectedPromptsDiv = document.getElementById("selectedPrompts");
  const selectedList = document.getElementById("selectedList");

  // 显示已选择的提示词
  if (selectedPrompts.length > 0) {
    selectedPromptsDiv.style.display = "block";
    selectedList.innerHTML = selectedPrompts
      .map((id) => {
        const prompt = prompts.find((p) => p.id === id);
        return prompt ? `<span class="selected-tag">${prompt.text}</span>` : "";
      })
      .join("");
  } else {
    selectedPromptsDiv.style.display = "none";
  }

  // 渲染分类和提示词
  promptsList.innerHTML = categories
    .map((category) => {
      const categoryPrompts = prompts.filter(
        (p) => p.categoryId === category.id,
      );
      if (categoryPrompts.length === 0) return "";

      return `
        <div class="category-section">
          <h3>${category.name}</h3>
          <div class="prompts-grid">
            ${categoryPrompts
              .map(
                (prompt) => `
              <button 
                class="prompt-tag ${selectedPrompts.includes(prompt.id) ? "selected" : ""}" 
                data-id="${prompt.id}"
              >
                ${prompt.text}
              </button>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  // 绑定提示词点击事件
  document.querySelectorAll(".prompt-tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      togglePromptSelection(tag.dataset.id);
    });
  });
}

// 渲染管理标签页
function renderManageTab(categories, prompts) {
  const categoriesList = document.getElementById("categoriesList");
  const newPromptCategory = document.getElementById("newPromptCategory");
  const promptsManageList = document.getElementById("promptsManageList");

  // 渲染分类列表
  categoriesList.innerHTML = categories
    .map(
      (cat) => `
    <div class="manage-item">
      <span>${cat.name}</span>
      <div>
        <button class="edit-btn" data-id="${cat.id}" data-type="category">编辑</button>
        <button class="delete-btn" data-id="${cat.id}" data-type="category">删除</button>
      </div>
    </div>
  `,
    )
    .join("");

  // 更新分类选择器
  newPromptCategory.innerHTML =
    '<option value="">选择分类</option>' +
    categories
      .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
      .join("");

  // 渲染提示词管理列表
  promptsManageList.innerHTML = categories
    .map((category) => {
      const categoryPrompts = prompts.filter(
        (p) => p.categoryId === category.id,
      );
      if (categoryPrompts.length === 0) return "";

      return `
        <div class="category-section">
          <h4>${category.name}</h4>
          ${categoryPrompts
            .map(
              (prompt) => `
            <div class="manage-item">
              <span>${prompt.text}</span>
              <div>
                <button class="edit-btn" data-id="${prompt.id}" data-type="prompt">编辑</button>
                <button class="delete-btn" data-id="${prompt.id}" data-type="prompt">删除</button>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    })
    .join("");
}

// 绑定事件
function bindEvents() {
  // 关闭按钮
  document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
  document
    .querySelector(".drawer-overlay")
    .addEventListener("click", closeDrawer);

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

  // 清空选择
  document
    .getElementById("clearSelection")
    .addEventListener("click", async () => {
      await chrome.storage.local.set({ selectedPrompts: [] });
      loadAndRender();
    });

  // 复制提示词
  document.getElementById("copyPrompts").addEventListener("click", async () => {
    const data = await chrome.storage.local.get(["prompts", "selectedPrompts"]);
    const selectedTexts = data.selectedPrompts
      .map((id) => data.prompts.find((p) => p.id === id)?.text)
      .filter(Boolean)
      .join(", ");

    navigator.clipboard.writeText(selectedTexts);

    const btn = document.getElementById("copyPrompts");
    btn.textContent = "已复制!";
    setTimeout(() => {
      btn.textContent = "复制提示词";
    }, 2000);
  });

  // 添加分类
  document.getElementById("addCategory").addEventListener("click", async () => {
    const name = document.getElementById("newCategoryName").value.trim();
    if (!name) return;

    const data = await chrome.storage.local.get(["categories"]);
    const categories = data.categories || [];
    categories.push({
      id: Date.now().toString(),
      name,
    });

    await chrome.storage.local.set({ categories });
    document.getElementById("newCategoryName").value = "";
    loadAndRender();
  });

  // 添加提示词
  document.getElementById("addPrompt").addEventListener("click", async () => {
    const categoryId = document.getElementById("newPromptCategory").value;
    const text = document.getElementById("newPromptText").value.trim();
    if (!categoryId || !text) return;

    const data = await chrome.storage.local.get(["prompts"]);
    const prompts = data.prompts || [];
    prompts.push({
      id: Date.now().toString(),
      categoryId,
      text,
    });

    await chrome.storage.local.set({ prompts });
    document.getElementById("newPromptText").value = "";
    loadAndRender();
  });

  // 编辑和删除按钮
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      editItem(btn.dataset.id, btn.dataset.type),
    );
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      deleteItem(btn.dataset.id, btn.dataset.type),
    );
  });
}

// 切换提示词选择
async function togglePromptSelection(id) {
  const data = await chrome.storage.local.get(["selectedPrompts"]);
  let selectedPrompts = data.selectedPrompts || [];

  if (selectedPrompts.includes(id)) {
    selectedPrompts = selectedPrompts.filter((pid) => pid !== id);
  } else {
    selectedPrompts.push(id);
  }

  await chrome.storage.local.set({ selectedPrompts });
  loadAndRender();
}

// 编辑项目
async function editItem(id, type) {
  const data = await chrome.storage.local.get([
    type === "category" ? "categories" : "prompts",
  ]);
  const items = data[type === "category" ? "categories" : "prompts"] || [];
  const item = items.find((i) => i.id === id);

  if (!item) return;

  const newValue = prompt(
    `编辑${type === "category" ? "分类" : "提示词"}:`,
    type === "category" ? item.name : item.text,
  );

  if (newValue && newValue.trim()) {
    if (type === "category") {
      item.name = newValue.trim();
    } else {
      item.text = newValue.trim();
    }

    await chrome.storage.local.set({
      [type === "category" ? "categories" : "prompts"]: items,
    });
    loadAndRender();
  }
}

// 删除项目
async function deleteItem(id, type) {
  if (!confirm(`确定删除此${type === "category" ? "分类" : "提示词"}吗?`))
    return;

  const data = await chrome.storage.local.get([
    type === "category" ? "categories" : "prompts",
  ]);
  const items = data[type === "category" ? "categories" : "prompts"] || [];
  const filtered = items.filter((i) => i.id !== id);

  await chrome.storage.local.set({
    [type === "category" ? "categories" : "prompts"]: filtered,
  });

  if (type === "category") {
    // 同时删除该分类下的所有提示词
    const promptsData = await chrome.storage.local.get(["prompts"]);
    const prompts = (promptsData.prompts || []).filter(
      (p) => p.categoryId !== id,
    );
    await chrome.storage.local.set({ prompts });
  }

  loadAndRender();
}

// 监听键盘快捷键 (Ctrl+Shift+P)
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "P") {
    toggleDrawer();
  }
});
