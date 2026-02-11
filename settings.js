let libraries = [];
let currentLibraryId = "";
let githubConfig = {
  owner: "",
  repo: "",
  token: "",
};
let feishuConfig = {
  appId: "",
  appSecret: "",
  bitableId: "",
  tableId: "",
  syncInterval: 30,
};

document.addEventListener("DOMContentLoaded", function () {
  initializeSettings();
});

async function initializeSettings() {
  await loadData();
  await loadGitHubConfig();
  await loadFeishuConfig();
  setupEventListeners();
  renderLibraryList();
  updateUI();
}

async function loadData() {
  const data = await chrome.storage.local.get([
    "libraries",
    "currentLibraryId",
  ]);
  libraries = data.libraries || [];
  currentLibraryId = data.currentLibraryId || libraries[0]?.id || "";
}

async function loadGitHubConfig() {
  try {
    const result = await chrome.storage.local.get("githubConfig");
    if (result.githubConfig) {
      githubConfig = result.githubConfig;
      document.getElementById("githubOwner").value = githubConfig.owner || "";
      document.getElementById("githubRepo").value = githubConfig.repo || "";
      document.getElementById("githubToken").value = githubConfig.token || "";
    }
  } catch (error) {
    console.error("GitHub配置加载失败:", error);
  }
}

async function loadFeishuConfig() {
  try {
    const result = await chrome.storage.local.get("feishuConfig");
    if (result.feishuConfig) {
      feishuConfig = result.feishuConfig;
    }
    document.getElementById("feishuAppId").value = feishuConfig?.appId || "";
    document.getElementById("feishuAppSecret").value =
      feishuConfig?.appSecret || "";
    document.getElementById("feishuBitableId").value =
      feishuConfig?.bitableId || "";
    document.getElementById("feishuTableId").value =
      feishuConfig?.tableId || "";
    document.getElementById("feishuSyncInterval").value =
      feishuConfig?.syncInterval || 30;
  } catch (error) {
    console.error("飞书配置加载失败:", error);
  }
}

function setupEventListeners() {
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      const page = this.getAttribute("data-page");
      switchPage(page);
    });
  });

  document
    .getElementById("sidebarToggle")
    .addEventListener("click", function () {
      document.getElementById("settingsSidebar").classList.toggle("collapsed");
    });

  document
    .getElementById("addLibraryBtn")
    .addEventListener("click", addLibrary);
  document
    .getElementById("saveEditLibrary")
    .addEventListener("click", saveEditLibrary);
  document
    .getElementById("cancelEditLibrary")
    .addEventListener("click", closeEditLibraryModal);
  document
    .getElementById("closeEditLibraryModal")
    .addEventListener("click", closeEditLibraryModal);

  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", addCategory);
  document
    .getElementById("saveEditCategory")
    .addEventListener("click", saveEditCategory);
  document
    .getElementById("cancelEditCategory")
    .addEventListener("click", closeEditCategoryModal);
  document
    .getElementById("closeEditCategoryModal")
    .addEventListener("click", closeEditCategoryModal);

  document.getElementById("addPromptBtn").addEventListener("click", addPrompt);
  document
    .getElementById("saveEditPrompt")
    .addEventListener("click", saveEditPrompt);
  document
    .getElementById("cancelEditPrompt")
    .addEventListener("click", closeEditPromptModal);
  document
    .getElementById("closeEditPromptModal")
    .addEventListener("click", closeEditPromptModal);

  document
    .getElementById("saveFeishuSettings")
    .addEventListener("click", saveFeishuSettings);
  document
    .getElementById("saveGithubSettings")
    .addEventListener("click", saveGithubSettings);
  document.getElementById("testSync").addEventListener("click", testSync);
  document
    .getElementById("syncToFeishu")
    .addEventListener("click", syncToFeishu);
  document
    .getElementById("syncFromFeishu")
    .addEventListener("click", syncFromFeishu);

  document
    .getElementById("librarySelectorCategories")
    .addEventListener("change", function () {
      currentLibraryId = this.value;
      updateUI();
    });

  document
    .getElementById("librarySelectorPrompts")
    .addEventListener("change", function () {
      currentLibraryId = this.value;
      updateUI();
    });

  document
    .getElementById("promptCategoryFilter")
    .addEventListener("change", filterPrompts);
  document
    .getElementById("promptSearch")
    .addEventListener("input", filterPrompts);
  document
    .getElementById("selectAllPrompts")
    .addEventListener("change", toggleSelectAllPrompts);
  document
    .getElementById("deleteSelectedBtn")
    .addEventListener("click", deleteSelectedPrompts);

  document
    .getElementById("prevPage")
    .addEventListener("click", () => changePage(-1));
  document
    .getElementById("nextPage")
    .addEventListener("click", () => changePage(1));
  document.getElementById("pageSize").addEventListener("change", () => {
    currentPage = 1;
    filterPrompts();
  });

  setupImageUpload();
}

function switchPage(pageName) {
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach((item) => item.classList.remove("active"));

  const activeItem = document.querySelector(
    `.sidebar-item[data-page="${pageName}"]`,
  );
  if (activeItem) {
    activeItem.classList.add("active");
  }

  const pages = document.querySelectorAll(".settings-page");
  pages.forEach((page) => page.classList.remove("active"));

  const activePage = document.getElementById(`${pageName}Page`);
  if (activePage) {
    activePage.classList.add("active");
  }

  if (pageName === "categories" || pageName === "prompts") {
    updateUI();
  }
}

function updateUI() {
  renderLibrarySelector();
  renderLibraryList();
  renderCategoryList();
  renderPromptsList();
  renderCategorySelectors();
}

function renderCategorySelectors() {
  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const selectors = [
    document.getElementById("promptCategorySelect"),
    document.getElementById("editPromptCategory"),
    document.getElementById("promptCategoryFilter"),
  ];

  selectors.forEach((selector) => {
    if (!selector) return;
    selector.innerHTML = `
      <option value="">选择分类...</option>
      ${(library.categories || [])
        .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
        .join("")}
    `;
  });
}

function renderLibrarySelector() {
  const selectors = [
    document.getElementById("librarySelectorCategories"),
    document.getElementById("librarySelectorPrompts"),
  ];

  selectors.forEach((selector) => {
    if (!selector) return;
    selector.innerHTML = libraries
      .map(
        (lib) =>
          `<option value="${lib.id}" ${lib.id === currentLibraryId ? "selected" : ""}>${lib.name}</option>`,
      )
      .join("");
  });
}

function renderLibraryList() {
  const tbody = document.getElementById("libraryList");
  tbody.innerHTML = libraries
    .map((lib) => {
      const promptCount = lib.prompts ? lib.prompts.length : 0;
      const categoryCount = lib.categories ? lib.categories.length : 0;
      return `
        <tr data-id="${lib.id}">
          <td>${lib.name}</td>
          <td>
            <span class="badge badge-primary">${categoryCount} 分类</span>
            <span class="badge badge-success">${promptCount} 提示词</span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-secondary edit-library-btn">编辑</button>
              <button class="btn btn-sm btn-danger delete-library-btn">删除</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // 添加事件监听器
  addLibraryTableEventListeners();
}

function renderCategoryList() {
  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const tbody = document.getElementById("categoriesList");
  tbody.innerHTML = (library.categories || [])
    .map((cat) => {
      const promptCount = library.prompts
        ? library.prompts.filter((p) => p.categoryId === cat.id).length
        : 0;
      return `
        <tr data-id="${cat.id}">
          <td>${cat.name}</td>
          <td><span class="badge badge-success">${promptCount} 提示词</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-secondary edit-category-btn">编辑</button>
              <button class="btn btn-sm btn-danger delete-category-btn">删除</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // 添加事件监听器
  addCategoryTableEventListeners();
}

let currentPage = 1;
let pageSize = 20;
let filteredPrompts = [];
let selectedPromptIds = new Set();

function renderPromptsList() {
  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const prompts = library.prompts || [];
  filteredPrompts = prompts;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagePrompts = filteredPrompts.slice(startIndex, endIndex);

  const tbody = document.getElementById("promptsManageList");
  tbody.innerHTML = pagePrompts
    .map((prompt) => {
      const category = library.categories?.find(
        (c) => c.id === prompt.categoryId,
      );
      const isSelected = selectedPromptIds.has(prompt.id);
      return `
        <tr data-id="${prompt.id}">
          <td style="text-align: center">
            <input type="checkbox" data-id="${prompt.id}" ${isSelected ? "checked" : ""}>
          </td>
          <td>${prompt.text}</td>
          <td>${prompt.chinese || "-"}</td>
          <td>${prompt.remark || "-"}</td>
          <td>${category ? category.name : "-"}</td>
          <td>
            ${prompt.imageUrl ? `<img src="${prompt.imageUrl}" class="prompt-thumbnail" data-image-url="${prompt.imageUrl}">` : "-"}
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-secondary edit-prompt-btn">编辑</button>
              <button class="btn btn-sm btn-danger delete-prompt-btn">删除</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  updatePagination();
  updateDeleteSelectedButton();

  // 添加事件监听器
  addPromptsTableEventListeners();
}

function updatePagination() {
  const totalPages = Math.ceil(filteredPrompts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredPrompts.length);

  document.getElementById("paginationInfo").textContent =
    `${startIndex}-${endIndex} 共 ${filteredPrompts.length}`;
  document.getElementById("currentPage").textContent = currentPage;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage >= totalPages;
}

function changePage(delta) {
  currentPage += delta;
  renderPromptsList();
}

function filterPrompts() {
  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const categoryFilter = document.getElementById("promptCategoryFilter").value;
  const searchTerm = document
    .getElementById("promptSearch")
    .value.toLowerCase();

  let prompts = library.prompts || [];

  if (categoryFilter) {
    prompts = prompts.filter((p) => p.categoryId === categoryFilter);
  }

  if (searchTerm) {
    prompts = prompts.filter(
      (p) =>
        p.text.toLowerCase().includes(searchTerm) ||
        (p.chinese && p.chinese.toLowerCase().includes(searchTerm)) ||
        (p.remark && p.remark.toLowerCase().includes(searchTerm)),
    );
  }

  filteredPrompts = prompts;
  currentPage = 1;
  renderPromptsList();
}

function toggleSelectAllPrompts() {
  const checkbox = document.getElementById("selectAllPrompts");
  const checkboxes = document.querySelectorAll(
    '#promptsManageList input[type="checkbox"]',
  );

  checkboxes.forEach((cb) => {
    cb.checked = checkbox.checked;
    const id = cb.getAttribute("data-id");
    if (checkbox.checked) {
      selectedPromptIds.add(id);
    } else {
      selectedPromptIds.delete(id);
    }
  });

  updateDeleteSelectedButton();
}

function togglePromptSelection(id) {
  if (selectedPromptIds.has(id)) {
    selectedPromptIds.delete(id);
  } else {
    selectedPromptIds.add(id);
  }
  updateDeleteSelectedButton();
}

function updateDeleteSelectedButton() {
  const btn = document.getElementById("deleteSelectedBtn");
  btn.style.display = selectedPromptIds.size > 0 ? "inline-flex" : "none";
}

async function addLibrary() {
  const input = document.getElementById("newLibraryInput");
  const name = input.value.trim();

  if (!name) {
    showToast("请输入提示词库名称", "error");
    return;
  }

  const newLibrary = {
    id: Date.now().toString(),
    name,
    categories: [],
    prompts: [],
  };

  libraries.push(newLibrary);
  currentLibraryId = newLibrary.id;

  await saveData();
  updateUI();
  input.value = "";
  showToast("提示词库添加成功");
}

async function editLibrary(id) {
  const library = libraries.find((lib) => lib.id === id);
  if (!library) return;

  document.getElementById("editLibraryId").value = library.id;
  document.getElementById("editLibraryName").value = library.name;
  document.getElementById("editLibraryModal").classList.add("show");
}

async function saveEditLibrary() {
  const id = document.getElementById("editLibraryId").value;
  const name = document.getElementById("editLibraryName").value.trim();

  if (!name) {
    showToast("请输入提示词库名称", "error");
    return;
  }

  const library = libraries.find((lib) => lib.id === id);
  if (library) {
    library.name = name;
    await saveData();
    updateUI();
    closeEditLibraryModal();
    showToast("提示词库更新成功");
  }
}

function closeEditLibraryModal() {
  document.getElementById("editLibraryModal").classList.remove("show");
}

async function deleteLibrary(id) {
  if (libraries.length === 1) {
    showToast("至少需要保留一个提示词库", "error");
    return;
  }

  if (!confirm("确定删除此提示词库吗？删除后无法恢复。")) {
    return;
  }

  libraries = libraries.filter((lib) => lib.id !== id);

  if (id === currentLibraryId) {
    currentLibraryId = libraries[0]?.id || "";
  }

  await saveData();
  updateUI();
  showToast("提示词库删除成功");
}

async function addCategory() {
  const input = document.getElementById("newCategoryInput");
  const name = input.value.trim();

  if (!name) {
    showToast("请输入分类名称", "error");
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) {
    showToast("请先选择提示词库", "error");
    return;
  }

  const newCategory = {
    id: Date.now().toString(),
    name,
  };

  if (!library.categories) {
    library.categories = [];
  }
  library.categories.push(newCategory);

  await saveData();
  updateUI();
  input.value = "";
  showToast("分类添加成功");
}

async function editCategory(id) {
  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const category = library.categories?.find((c) => c.id === id);
  if (!category) return;

  document.getElementById("editCategoryId").value = category.id;
  document.getElementById("editCategoryName").value = category.name;
  document.getElementById("editCategoryModal").classList.add("show");
}

async function saveEditCategory() {
  const id = document.getElementById("editCategoryId").value;
  const name = document.getElementById("editCategoryName").value.trim();

  if (!name) {
    showToast("请输入分类名称", "error");
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const category = library.categories?.find((c) => c.id === id);
  if (category) {
    category.name = name;
    await saveData();
    updateUI();
    closeEditCategoryModal();
    showToast("分类更新成功");
  }
}

function closeEditCategoryModal() {
  document.getElementById("editCategoryModal").classList.remove("show");
}

async function deleteCategory(id) {
  if (!confirm("确定删除此分类吗？删除后无法恢复。")) {
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  library.categories = library.categories?.filter((c) => c.id !== id) || [];
  library.prompts = library.prompts?.filter((p) => p.categoryId !== id) || [];

  await saveData();
  updateUI();
  showToast("分类删除成功");
}

let currentEditingPromptId = null;
let newPromptImageFile = null;
let editPromptImageFile = null;

function setupImageUpload() {
  const newPromptImageBtn = document.getElementById("newPromptImageBtn");
  const newPromptImage = document.getElementById("newPromptImage");
  const newPromptImageRemove = document.getElementById("newPromptImageRemove");
  const newPromptImagePreview = document.getElementById(
    "newPromptImagePreview",
  );

  const editPromptImageBtn = document.getElementById("editPromptImageBtn");
  const editPromptImage = document.getElementById("editPromptImage");
  const editPromptImageRemove = document.getElementById(
    "editPromptImageRemove",
  );
  const editPromptImagePreview = document.getElementById(
    "editPromptImagePreview",
  );

  newPromptImageBtn.addEventListener("click", () => newPromptImage.click());
  newPromptImage.addEventListener("change", (e) =>
    handleImageSelect(
      e,
      newPromptImagePreview,
      newPromptImageRemove,
      (file) => {
        newPromptImageFile = file;
      },
    ),
  );
  newPromptImageRemove.addEventListener("click", () => {
    newPromptImageFile = null;
    newPromptImage.value = "";
    newPromptImagePreview.innerHTML =
      '<span class="image-placeholder">拖拽图片到此处或点击上传</span>';
    newPromptImageRemove.style.display = "none";
  });

  editPromptImageBtn.addEventListener("click", () => editPromptImage.click());
  editPromptImage.addEventListener("change", (e) =>
    handleImageSelect(
      e,
      editPromptImagePreview,
      editPromptImageRemove,
      (file) => {
        editPromptImageFile = file;
      },
    ),
  );
  editPromptImageRemove.addEventListener("click", () => {
    editPromptImageFile = null;
    editPromptImage.value = "";
    editPromptImagePreview.innerHTML =
      '<span class="image-placeholder">拖拽图片到此处或点击上传</span>';
    editPromptImageRemove.style.display = "none";
  });
}

function handleImageSelect(event, previewElement, removeButton, callback) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewElement.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    removeButton.style.display = "inline-flex";
    callback(file);
  };
  reader.readAsDataURL(file);
}

async function addPrompt() {
  const categoryId = document.getElementById("promptCategorySelect").value;
  const text = document.getElementById("newPromptInput").value.trim();
  const chinese = document.getElementById("newPromptChinese").value.trim();
  const remark = document.getElementById("newPromptRemark").value.trim();

  if (!categoryId) {
    showToast("请选择分类", "error");
    return;
  }

  if (!text) {
    showToast("请输入提示词内容", "error");
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) {
    showToast("请先选择提示词库", "error");
    return;
  }

  const newPrompt = {
    id: Date.now().toString(),
    categoryId,
    text,
    chinese,
    remark,
    imageUrl: "",
  };

  if (newPromptImageFile) {
    try {
      const imageUrl = await uploadImageToGitHub(
        newPromptImageFile,
        newPrompt.id,
      );
      newPrompt.imageUrl = imageUrl;
    } catch (error) {
      showToast("图片上传失败: " + error.message, "error");
      return;
    }
  }

  if (!library.prompts) {
    library.prompts = [];
  }
  library.prompts.push(newPrompt);

  await saveData();
  updateUI();

  document.getElementById("promptCategorySelect").value = "";
  document.getElementById("newPromptInput").value = "";
  document.getElementById("newPromptChinese").value = "";
  document.getElementById("newPromptRemark").value = "";
  newPromptImageFile = null;
  document.getElementById("newPromptImagePreview").innerHTML =
    '<span class="image-placeholder">拖拽图片到此处或点击上传</span>';
  document.getElementById("newPromptImageRemove").style.display = "none";

  showToast("提示词添加成功");
}

async function editPrompt(id) {
  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const prompt = library.prompts?.find((p) => p.id === id);
  if (!prompt) return;

  currentEditingPromptId = id;

  document.getElementById("editPromptId").value = prompt.id;
  document.getElementById("editPromptLibraryId").value = currentLibraryId;
  document.getElementById("editPromptCategory").value = prompt.categoryId || "";
  document.getElementById("editPromptText").value = prompt.text || "";
  document.getElementById("editPromptChinese").value = prompt.chinese || "";
  document.getElementById("editPromptRemark").value = prompt.remark || "";

  if (prompt.imageUrl) {
    document.getElementById("editPromptImagePreview").innerHTML =
      `<img src="${prompt.imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    document.getElementById("editPromptImageRemove").style.display =
      "inline-flex";
  } else {
    document.getElementById("editPromptImagePreview").innerHTML =
      '<span class="image-placeholder">拖拽图片到此处或点击上传</span>';
    document.getElementById("editPromptImageRemove").style.display = "none";
  }

  document.getElementById("editPromptModal").classList.add("show");
}

async function saveEditPrompt() {
  const id = document.getElementById("editPromptId").value;
  const categoryId = document.getElementById("editPromptCategory").value;
  const text = document.getElementById("editPromptText").value.trim();
  const chinese = document.getElementById("editPromptChinese").value.trim();
  const remark = document.getElementById("editPromptRemark").value.trim();

  if (!categoryId) {
    showToast("请选择分类", "error");
    return;
  }

  if (!text) {
    showToast("请输入提示词内容", "error");
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const prompt = library.prompts?.find((p) => p.id === id);
  if (!prompt) return;

  const oldImageUrl = prompt.imageUrl;

  if (editPromptImageFile) {
    try {
      if (oldImageUrl) {
        await deleteImageFromGitHub(oldImageUrl);
      }
      const imageUrl = await uploadImageToGitHub(editPromptImageFile, id);
      prompt.imageUrl = imageUrl;
    } catch (error) {
      showToast("图片上传失败: " + error.message, "error");
      return;
    }
  }

  prompt.categoryId = categoryId;
  prompt.text = text;
  prompt.chinese = chinese;
  prompt.remark = remark;

  await saveData();
  updateUI();
  closeEditPromptModal();
  showToast("提示词更新成功");
}

function closeEditPromptModal() {
  document.getElementById("editPromptModal").classList.remove("show");
  currentEditingPromptId = null;
  editPromptImageFile = null;
}

async function deletePrompt(id) {
  if (!confirm("确定删除此提示词吗？删除后无法恢复。")) {
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  const prompt = library.prompts?.find((p) => p.id === id);
  if (prompt && prompt.imageUrl) {
    try {
      await deleteImageFromGitHub(prompt.imageUrl);
    } catch (error) {
      console.error("删除图片失败:", error);
    }
  }

  library.prompts = library.prompts?.filter((p) => p.id !== id) || [];
  selectedPromptIds.delete(id);

  await saveData();
  updateUI();
  showToast("提示词删除成功");
}

async function deleteSelectedPrompts() {
  if (selectedPromptIds.size === 0) return;

  if (
    !confirm(
      `确定删除选中的 ${selectedPromptIds.size} 个提示词吗？删除后无法恢复。`,
    )
  ) {
    return;
  }

  const library = libraries.find((lib) => lib.id === currentLibraryId);
  if (!library) return;

  for (const id of selectedPromptIds) {
    const prompt = library.prompts?.find((p) => p.id === id);
    if (prompt && prompt.imageUrl) {
      try {
        await deleteImageFromGitHub(prompt.imageUrl);
      } catch (error) {
        console.error("删除图片失败:", error);
      }
    }
  }

  library.prompts =
    library.prompts?.filter((p) => !selectedPromptIds.has(p.id)) || [];
  selectedPromptIds.clear();

  await saveData();
  updateUI();
  showToast("提示词删除成功");
}

async function saveFeishuSettings() {
  feishuConfig = {
    appId: document.getElementById("feishuAppId").value.trim(),
    appSecret: document.getElementById("feishuAppSecret").value.trim(),
    bitableId: document.getElementById("feishuBitableId").value.trim(),
    tableId: document.getElementById("feishuTableId").value.trim(),
    syncInterval:
      parseInt(document.getElementById("feishuSyncInterval").value) || 30,
  };

  await chrome.storage.local.set({ feishuConfig });
  showToast("飞书配置保存成功");
}

async function saveGithubSettings() {
  githubConfig = {
    owner: document.getElementById("githubOwner").value.trim(),
    repo: document.getElementById("githubRepo").value.trim(),
    token: document.getElementById("githubToken").value.trim(),
  };

  await chrome.storage.local.set({ githubConfig });
  showToast("GitHub配置保存成功");
}

async function testSync() {
  showToast("测试同步功能...");
  try {
    const response = await chrome.runtime.sendMessage({ action: "testSync" });
    if (response.success) {
      showToast("同步测试成功");
    } else {
      showToast("同步测试失败: " + response.message, "error");
    }
  } catch (error) {
    showToast("同步测试失败: " + error.message, "error");
  }
}

async function syncToFeishu() {
  showToast("正在同步到飞书...");
  try {
    const response = await chrome.runtime.sendMessage({
      action: "syncToFeishu",
    });
    if (response.success) {
      showToast("同步到飞书成功");
    } else {
      showToast("同步失败: " + response.message, "error");
    }
  } catch (error) {
    showToast("同步失败: " + error.message, "error");
  }
}

async function syncFromFeishu() {
  showToast("正在从飞书同步...");
  try {
    const response = await chrome.runtime.sendMessage({
      action: "syncFromFeishu",
    });
    if (response.success) {
      showToast("从飞书同步成功");
      await loadData();
      updateUI();
    } else {
      showToast("同步失败: " + response.message, "error");
    }
  } catch (error) {
    showToast("同步失败: " + error.message, "error");
  }
}

async function uploadImageToGitHub(imageFile, promptId) {
  if (!imageFile || !githubConfig.token) {
    throw new Error("GitHub配置不完整");
  }

  try {
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const timestamp = Date.now();
    const extension = imageFile.name.split(".").pop();
    const fileName = `prompt_${promptId}_${timestamp}.${extension}`;
    const filePath = `prompts/${fileName}`;

    const apiUrl = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${filePath}`;

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubConfig.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add image for prompt: ${promptId}`,
        content: base64Image,
        encoding: "base64",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || response.statusText);
    }

    const data = await response.json();
    return data.content.download_url;
  } catch (error) {
    console.error("上传图片失败:", error);
    throw error;
  }
}

async function deleteImageFromGitHub(imageUrl) {
  if (!imageUrl || !githubConfig.token) {
    return false;
  }

  try {
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `prompts/${fileName}`;

    const getResponse = await fetch(
      `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `token ${githubConfig.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!getResponse.ok) {
      console.error("获取文件信息失败:", getResponse.statusText);
      return false;
    }

    const fileInfo = await getResponse.json();
    const sha = fileInfo.sha;

    const deleteResponse = await fetch(
      `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${filePath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `token ${githubConfig.token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Delete image: ${fileName}`,
          sha: sha,
        }),
      },
    );

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.error("删除图片失败:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("删除图片时发生错误:", error);
    return false;
  }
}

function showImagePreview(imageUrl) {
  console.log("showImagePreview called with imageUrl:", imageUrl);

  // 移除任何现有的预览窗口
  const existingModal = document.querySelector(".image-preview-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // 创建模态框容器
  const modal = document.createElement("div");
  modal.className = "image-preview-modal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    opacity: 1;
    transition: opacity 0.3s ease;
    pointer-events: auto;
  `;

  // 创建模态框内容
  const modalContent = document.createElement("div");
  modalContent.className = "image-preview-modal-content";
  modalContent.style.cssText = `
    position: relative;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 90%;
    max-height: 90%;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
    z-index: 999999;
  `;

  // 创建关闭按钮
  const closeBtn = document.createElement("button");
  closeBtn.className = "image-preview-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    z-index: 9999999;
  `;

  // 创建图片元素
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = "图片预览";
  img.style.cssText = `
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
  `;

  // 组装模态框
  modalContent.appendChild(closeBtn);
  modalContent.appendChild(img);
  modal.appendChild(modalContent);

  console.log("Created modal:", modal);

  // 添加到document.body（确保添加到最顶层）
  document.body.appendChild(modal);
  console.log("Modal added to body");

  // 确保模态框可见
  modal.style.display = "flex";
  modal.style.opacity = "1";

  // 关闭按钮事件
  closeBtn.addEventListener("click", () => {
    console.log("Close button clicked");
    modal.remove();
  });

  // 点击背景关闭
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      console.log("Modal background clicked");
      modal.remove();
    }
  });

  // ESC键关闭
  document.addEventListener("keydown", function closeOnEscape(e) {
    if (e.key === "Escape") {
      console.log("Escape key pressed");
      modal.remove();
      document.removeEventListener("keydown", closeOnEscape);
    }
  });
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");

  toastMessage.textContent = message;
  toast.className = "toast show";

  if (type === "error") {
    toast.classList.add("error");
  } else if (type === "warning") {
    toast.classList.add("warning");
  }

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

async function saveData() {
  await chrome.storage.local.set({
    libraries,
    currentLibraryId,
  });
}

// 为提示词库表格添加事件监听器
function addLibraryTableEventListeners() {
  const editButtons = document.querySelectorAll(".edit-library-btn");
  const deleteButtons = document.querySelectorAll(".delete-library-btn");

  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const id = row.getAttribute("data-id");
      editLibrary(id);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const id = row.getAttribute("data-id");
      deleteLibrary(id);
    });
  });
}

// 为分类表格添加事件监听器
function addCategoryTableEventListeners() {
  const editButtons = document.querySelectorAll(".edit-category-btn");
  const deleteButtons = document.querySelectorAll(".delete-category-btn");

  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const id = row.getAttribute("data-id");
      editCategory(id);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const id = row.getAttribute("data-id");
      deleteCategory(id);
    });
  });
}

// 为提示词表格添加事件监听器
function addPromptsTableEventListeners() {
  console.log("addPromptsTableEventListeners called");
  const editButtons = document.querySelectorAll(".edit-prompt-btn");
  const deleteButtons = document.querySelectorAll(".delete-prompt-btn");
  const checkboxes = document.querySelectorAll(
    '#promptsManageList input[type="checkbox"]',
  );
  const thumbnails = document.querySelectorAll(".prompt-thumbnail");

  console.log("Found thumbnails:", thumbnails.length);

  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const id = row.getAttribute("data-id");
      editPrompt(id);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const id = row.getAttribute("data-id");
      deletePrompt(id);
    });
  });

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const id = this.getAttribute("data-id");
      togglePromptSelection(id);
    });
  });

  thumbnails.forEach((thumbnail, index) => {
    console.log(`Adding event listeners to thumbnail ${index}:`, thumbnail);

    thumbnail.addEventListener("click", function () {
      const imageUrl = this.getAttribute("data-image-url");
      console.log("Thumbnail clicked, imageUrl:", imageUrl);
      showImagePreview(imageUrl);
    });

    // 添加浮动预览效果
    thumbnail.addEventListener("mouseenter", function (e) {
      console.log("Thumbnail mouseenter");
      const imageUrl = this.getAttribute("data-image-url");

      // 创建浮动预览窗口
      const previewDiv = document.createElement("div");
      previewDiv.className = "floating-preview";
      previewDiv.style.cssText = `
        position: fixed;
        top: ${e.pageY + 10}px;
        left: ${e.pageX + 10}px;
        width: 300px;
        height: 300px;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 99999;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        animation: fadeIn 0.3s ease;
      `;

      // 添加动画效果
      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `;
      document.head.appendChild(style);

      // 创建预览图片
      const previewImg = document.createElement("img");
      previewImg.src = imageUrl;
      previewImg.alt = "Floating Preview";
      previewImg.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      `;

      previewDiv.appendChild(previewImg);
      document.body.appendChild(previewDiv);

      // 存储预览窗口引用，以便在mouseleave时移除
      this._floatingPreview = previewDiv;
      this._styleElement = style;

      // 光标变为指针
      this.style.cursor = "pointer";
    });

    thumbnail.addEventListener("mouseleave", function () {
      console.log("Thumbnail mouseleave");
      // 移除浮动预览窗口
      if (this._floatingPreview) {
        this._floatingPreview.remove();
        this._floatingPreview = null;
      }

      // 移除样式元素
      if (this._styleElement) {
        this._styleElement.remove();
        this._styleElement = null;
      }

      // 恢复原始光标
      this.style.cursor = "default";
    });

    // 鼠标移动时更新预览窗口位置
    thumbnail.addEventListener("mousemove", function (e) {
      if (this._floatingPreview) {
        this._floatingPreview.style.top = `${e.pageY + 10}px`;
        this._floatingPreview.style.left = `${e.pageX + 10}px`;
      }
    });
  });
}
