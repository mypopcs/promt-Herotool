// 全局状态
let libraries = []; // 提示词库数组
let currentLibraryId = ""; // 当前选中的提示词库ID
let categories = []; // 当前提示词库的分类
let prompts = []; // 当前提示词库的提示词
let selectedPrompts = []; // 选中的提示词ID
let filteredPrompts = [];
let selectedPromptIds = new Set();
let currentPage = 1;
let pageSize = 20;
let categoryFilter = "";
let searchKeyword = "";
let temporaryTags = []; // 临时标签数组
let currentContextTagId = null; // 当前右键点击的标签ID

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
    "libraries",
    "currentLibraryId",
    "selectedPrompts",
    "temporaryTags",
  ]);

  libraries = data.libraries || getDefaultLibraries();
  currentLibraryId = data.currentLibraryId || libraries[0]?.id || "";
  selectedPrompts = data.selectedPrompts || [];
  temporaryTags = data.temporaryTags || [];

  // 加载当前提示词库的数据
  loadCurrentLibraryData();

  // 如果是第一次使用，保存默认数据
  if (!data.libraries || data.libraries.length === 0) {
    await saveData();
  }
}

// 加载当前提示词库的数据
function loadCurrentLibraryData() {
  const currentLibrary = libraries.find((lib) => lib.id === currentLibraryId);
  if (currentLibrary) {
    categories = currentLibrary.categories || [];
    prompts = currentLibrary.prompts || [];
  } else {
    categories = [];
    prompts = [];
  }
  filteredPrompts = [...prompts];
}

// 获取默认提示词库
function getDefaultLibraries() {
  return [
    {
      id: "1",
      name: "默认提示词库",
      categories: [
        { id: "1", name: "画风" },
        { id: "2", name: "主体" },
        { id: "3", name: "场景" },
        { id: "4", name: "光照" },
        { id: "5", name: "质量" },
      ],
      prompts: [
        {
          id: "1",
          categoryId: "1",
          text: "anime style",
          chinese: "动漫风格",
          remark: "二次元动漫风格",
        },
        {
          id: "2",
          categoryId: "1",
          text: "realistic",
          chinese: "写实风格",
          remark: "逼真的写实风格",
        },
        {
          id: "3",
          categoryId: "1",
          text: "oil painting",
          chinese: "油画风格",
          remark: "古典油画风格",
        },
        {
          id: "4",
          categoryId: "1",
          text: "watercolor",
          chinese: "水彩风格",
          remark: "清新水彩风格",
        },
        {
          id: "5",
          categoryId: "2",
          text: "beautiful girl",
          chinese: "漂亮女孩",
          remark: "美丽的女性形象",
        },
        {
          id: "6",
          categoryId: "2",
          text: "landscape",
          chinese: "风景",
          remark: "自然风景画",
        },
        {
          id: "7",
          categoryId: "2",
          text: "portrait",
          chinese: "肖像",
          remark: "人物肖像画",
        },
        {
          id: "8",
          categoryId: "3",
          text: "cyberpunk city",
          chinese: "赛博朋克城市",
          remark: "未来科技感城市",
        },
        {
          id: "9",
          categoryId: "3",
          text: "fantasy world",
          chinese: "奇幻世界",
          remark: "魔法奇幻风格",
        },
        {
          id: "10",
          categoryId: "3",
          text: "sunset beach",
          chinese: "日落海滩",
          remark: "浪漫日落海滩",
        },
        {
          id: "11",
          categoryId: "4",
          text: "soft lighting",
          chinese: "柔和光线",
          remark: "温柔柔和的光线",
        },
        {
          id: "12",
          categoryId: "4",
          text: "dramatic lighting",
          chinese: "戏剧光线",
          remark: "强烈对比的戏剧光",
        },
        {
          id: "13",
          categoryId: "4",
          text: "golden hour",
          chinese: "黄金时刻",
          remark: "日落时分的金色光",
        },
        {
          id: "14",
          categoryId: "5",
          text: "masterpiece",
          chinese: "杰作",
          remark: "高质量作品",
        },
        {
          id: "15",
          categoryId: "5",
          text: "best quality",
          chinese: "最佳质量",
          remark: "最高质量",
        },
        {
          id: "16",
          categoryId: "5",
          text: "8k uhd",
          chinese: "8K超高清",
          remark: "超高分辨率",
        },
      ],
    },
  ];
}

// 保存数据
async function saveData() {
  // 更新当前提示词库的数据
  const currentLibrary = libraries.find((lib) => lib.id === currentLibraryId);
  if (currentLibrary) {
    currentLibrary.categories = categories;
    currentLibrary.prompts = prompts;
  }

  await chrome.storage.local.set({
    libraries,
    currentLibraryId,
    selectedPrompts,
    temporaryTags,
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

  // 始终显示已选择区域
  selectedSection.style.display = "block";
  renderSelectedTags();

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
                     data-id="${prompt.id}"
                     ${prompt.remark ? `data-remark="${escapeHtml(prompt.remark)}"` : ""}>
                  ${escapeHtml(prompt.text)}
                  ${prompt.chinese ? `<div class="prompt-tag-chinese">${escapeHtml(prompt.chinese)}</div>` : ""}
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

  // 渲染选中的提示词
  let html = selectedPrompts
    .map((id) => {
      const prompt = prompts.find((p) => p.id === id);
      return prompt
        ? `<div class="selected-tag" data-id="${prompt.id}" data-type="selected">
            <span class="selected-tag-text">${escapeHtml(prompt.text)}</span>
            <button class="selected-tag-remove" data-id="${prompt.id}" data-type="selected" title="移除">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
           </div>`
        : "";
    })
    .join("");

  // 渲染临时标签
  html += temporaryTags
    .map((tag) => {
      return `<div class="selected-tag temporary" data-id="${tag.id}" data-type="temporary">
            <span class="selected-tag-text">${escapeHtml(tag.text)}</span>
            <button class="selected-tag-remove" data-id="${tag.id}" data-type="temporary" title="删除">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
           </div>`;
    })
    .join("");

  selectedTags.innerHTML = html;

  // 绑定移除按钮事件
  selectedTags.querySelectorAll(".selected-tag-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      if (type === "selected") {
        togglePromptSelection(id);
      } else {
        removeTemporaryTag(id);
      }
    });
  });

  // 绑定右键菜单事件
  selectedTags.querySelectorAll(".selected-tag").forEach((tag) => {
    tag.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const id = tag.dataset.id;
      const type = tag.dataset.type;
      if (type === "selected") {
        showContextMenu(e, id);
      }
    });
  });
}

// 移除临时标签
function removeTemporaryTag(id) {
  temporaryTags = temporaryTags.filter((tag) => tag.id !== id);
  saveData();
  renderSelectedTags();
}

// 添加临时标签
function addTemporaryTag(text) {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  temporaryTags.push({
    id: Date.now().toString(),
    text: trimmedText,
  });

  saveData();
  renderSelectedTags();
}

// 显示右键菜单
function showContextMenu(event, promptId) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;

  currentContextTagId = promptId;
  const contextMenu = document.getElementById("contextMenu");
  const contextMenuItems = document.getElementById("contextMenuItems");

  // 获取同分类下的其他提示词
  const categoryPrompts = prompts.filter(
    (p) => p.categoryId === prompt.categoryId && p.id !== promptId,
  );

  if (categoryPrompts.length === 0) {
    contextMenuItems.innerHTML =
      '<div class="context-menu-item" style="cursor: default; color: var(--gray-500);">同分类下无其他提示词</div>';
  } else {
    contextMenuItems.innerHTML = categoryPrompts
      .map(
        (p) => `
        <div class="context-menu-item" data-id="${p.id}">
          <span class="prompt-text">${escapeHtml(p.text)}</span>
          ${p.chinese ? `<span class="prompt-chinese">${escapeHtml(p.chinese)}</span>` : ""}
        </div>
      `,
      )
      .join("");

    // 绑定点击事件
    contextMenuItems.querySelectorAll(".context-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        replacePrompt(currentContextTagId, item.dataset.id);
        hideContextMenu();
      });
    });
  }

  // 定位菜单
  const rect = event.target.getBoundingClientRect();
  contextMenu.style.left = `${rect.right + 5}px`;
  contextMenu.style.top = `${rect.top}px`;

  // 确保菜单不会超出屏幕
  const menuRect = contextMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    contextMenu.style.left = `${rect.left - menuRect.width - 5}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
  }

  contextMenu.classList.add("show");
}

// 隐藏右键菜单
function hideContextMenu() {
  const contextMenu = document.getElementById("contextMenu");
  contextMenu.classList.remove("show");
  currentContextTagId = null;
}

// 替换提示词
function replacePrompt(oldId, newId) {
  const index = selectedPrompts.indexOf(oldId);
  if (index > -1) {
    selectedPrompts[index] = newId;
    saveData();
    renderAll();
  }
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
  temporaryTags = [];
  await saveData();
  renderUseTab();
}

// 复制提示词
async function copyPrompts() {
  const promptTexts = selectedPrompts
    .map((id) => prompts.find((p) => p.id === id)?.text)
    .filter(Boolean);

  const temporaryTexts = temporaryTags.map((tag) => tag.text);

  const allTexts = [...temporaryTexts, ...promptTexts];

  const finalText = allTexts.join(", ");

  if (!finalText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(finalText);

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
  renderLibrarySelector();
  renderLibraryList();
  renderCategoriesList();
  renderCategorySelect();
  renderCategoryFilter();
  renderPromptsManageList();
  updatePaginationControls();
}

// 渲染提示词库选择器
function renderLibrarySelector() {
  const select = document.getElementById("librarySelector");

  if (!select) return;

  const html = libraries
    .map(
      (lib) =>
        `<option value="${lib.id}" ${lib.id === currentLibraryId ? "selected" : ""}>${escapeHtml(lib.name)}</option>`,
    )
    .join("");

  select.innerHTML = html;
}

// 渲染提示词库列表
function renderLibraryList() {
  const libraryList = document.getElementById("libraryList");

  if (!libraryList) return;

  if (libraries.length === 0) {
    libraryList.innerHTML =
      '<tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--gray-500);">暂无提示词库</td></tr>';
    return;
  }

  const html = libraries
    .map((library) => {
      const promptCount = library.prompts ? library.prompts.length : 0;
      const categoryCount = library.categories ? library.categories.length : 0;
      return `
          <tr>
            <td>${escapeHtml(library.name)}</td>
            <td><span class="table-count">${categoryCount} 分类 / ${promptCount} 提示词</span></td>
            <td>
              <div class="table-actions">
                <button class="edit-btn" data-id="${library.id}" data-type="library">编辑</button>
                <button class="delete-btn" data-id="${library.id}" data-type="library">删除</button>
              </div>
            </td>
          </tr>
        `;
    })
    .join("");

  libraryList.innerHTML = html;

  // 绑定编辑和删除事件
  libraryList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editLibrary(btn.dataset.id));
  });

  libraryList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteLibrary(btn.dataset.id));
  });
}

// 渲染分类列表
function renderCategoriesList() {
  const categoriesList = document.getElementById("categoriesList");

  if (categories.length === 0) {
    categoriesList.innerHTML =
      '<tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--gray-500);">暂无分类</td></tr>';
    return;
  }

  const html = categories
    .map((category) => {
      const promptCount = prompts.filter(
        (p) => p.categoryId === category.id,
      ).length;
      return `
          <tr>
            <td>${escapeHtml(category.name)}</td>
            <td><span class="table-count">${promptCount}</span></td>
            <td>
              <div class="table-actions">
                <button class="edit-btn" data-id="${category.id}" data-type="category">编辑</button>
                <button class="delete-btn" data-id="${category.id}" data-type="category">删除</button>
              </div>
            </td>
          </tr>
        `;
    })
    .join("");

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

// 渲染分类筛选器
function renderCategoryFilter() {
  const select = document.getElementById("promptCategoryFilter");

  const html = `
    <option value="">全部分类</option>
    ${categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join("")}
  `;

  select.innerHTML = html;
  select.value = categoryFilter;
}

// 筛选提示词
function filterPrompts() {
  filteredPrompts = prompts.filter((prompt) => {
    const matchCategory =
      !categoryFilter || prompt.categoryId === categoryFilter;
    const matchSearch =
      !searchKeyword ||
      prompt.text.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchCategory && matchSearch;
  });

  currentPage = 1;
  renderPromptsManageList();
  updatePaginationControls();
}

// 渲染提示词管理列表
function renderPromptsManageList() {
  const promptsManageList = document.getElementById("promptsManageList");
  const selectAllCheckbox = document.getElementById("selectAllPrompts");
  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

  // 计算分页
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagePrompts = filteredPrompts.slice(startIndex, endIndex);

  if (pagePrompts.length === 0) {
    promptsManageList.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">暂无提示词</td></tr>';
    selectAllCheckbox.checked = false;
    selectAllCheckbox.disabled = true;
    deleteSelectedBtn.style.display = "none";
    return;
  }

  selectAllCheckbox.disabled = false;

  // 检查当前页是否全部选中
  const allSelected = pagePrompts.every((p) => selectedPromptIds.has(p.id));
  selectAllCheckbox.checked = allSelected;

  // 更新删除选中按钮显示状态
  deleteSelectedBtn.style.display =
    selectedPromptIds.size > 0 ? "flex" : "none";

  const html = pagePrompts
    .map((prompt) => {
      const category = categories.find((c) => c.id === prompt.categoryId);
      const categoryName = category ? category.name : "未知分类";
      const isSelected = selectedPromptIds.has(prompt.id);
      return `
          <tr>
            <td style="text-align: center;">
              <input type="checkbox" class="prompt-checkbox" data-id="${prompt.id}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${escapeHtml(prompt.text)}</td>
            <td>${escapeHtml(prompt.chinese || "")}</td>
            <td>${escapeHtml(prompt.remark || "")}</td>
            <td>${escapeHtml(categoryName)}</td>
            <td>
              <div class="table-actions">
                <button class="edit-btn" data-id="${prompt.id}" data-type="prompt">编辑</button>
                <button class="delete-btn" data-id="${prompt.id}" data-type="prompt">删除</button>
              </div>
            </td>
          </tr>
        `;
    })
    .join("");

  promptsManageList.innerHTML = html;

  // 绑定编辑和删除事件
  promptsManageList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editPrompt(btn.dataset.id));
  });

  promptsManageList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deletePrompt(btn.dataset.id));
  });

  // 绑定复选框事件
  promptsManageList.querySelectorAll(".prompt-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedPromptIds.add(id);
      } else {
        selectedPromptIds.delete(id);
      }
      renderPromptsManageList();
    });
  });
}

// 更新分页控件
function updatePaginationControls() {
  const total = filteredPrompts.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  const paginationInfo = document.getElementById("paginationInfo");
  const currentPageSpan = document.getElementById("currentPage");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (total === 0) {
    paginationInfo.textContent = "0-0 共 0";
    currentPageSpan.textContent = "1";
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
  } else {
    paginationInfo.textContent = `${startIndex}-${endIndex} 共 ${total}`;
    currentPageSpan.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }
}

// 切换页面
function changePage(direction) {
  const total = filteredPrompts.length;
  const totalPages = Math.ceil(total / pageSize);

  if (direction === "prev" && currentPage > 1) {
    currentPage--;
  } else if (direction === "next" && currentPage < totalPages) {
    currentPage++;
  }

  renderPromptsManageList();
  updatePaginationControls();
}

// 更改每页显示数量
function changePageSize(newPageSize) {
  pageSize = parseInt(newPageSize);
  currentPage = 1;
  renderPromptsManageList();
  updatePaginationControls();
}

// 全选/取消全选当前页
function toggleSelectAll() {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagePrompts = filteredPrompts.slice(startIndex, endIndex);
  const selectAllCheckbox = document.getElementById("selectAllPrompts");

  if (selectAllCheckbox.checked) {
    pagePrompts.forEach((p) => selectedPromptIds.add(p.id));
  } else {
    pagePrompts.forEach((p) => selectedPromptIds.delete(p.id));
  }

  renderPromptsManageList();
}

// 删除选中的提示词
async function deleteSelectedPrompts() {
  if (selectedPromptIds.size === 0) {
    return;
  }

  if (!confirm(`确定删除选中的 ${selectedPromptIds.size} 个提示词吗?`)) {
    return;
  }

  prompts = prompts.filter((p) => !selectedPromptIds.has(p.id));
  selectedPrompts = selectedPrompts.filter((id) => !selectedPromptIds.has(id));
  selectedPromptIds.clear();

  await saveData();
  filterPrompts();
  renderAll();
}

// 添加提示词库
async function addLibrary() {
  const input = document.getElementById("newLibraryInput");
  const name = input.value.trim();

  if (!name) {
    alert("请输入提示词库名称");
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
  loadCurrentLibraryData();

  await saveData();
  input.value = "";
  renderAll();
}

// 编辑提示词库
async function editLibrary(id) {
  const library = libraries.find((lib) => lib.id === id);
  if (!library) return;

  // 填充弹窗数据
  document.getElementById("editLibraryId").value = library.id;
  document.getElementById("editLibraryName").value = library.name;

  // 显示弹窗
  document.getElementById("editLibraryModal").classList.add("show");
}

// 保存提示词库编辑
async function saveEditLibrary() {
  const id = document.getElementById("editLibraryId").value;
  const name = document.getElementById("editLibraryName").value.trim();

  if (!name) {
    alert("请输入提示词库名称");
    return;
  }

  const library = libraries.find((lib) => lib.id === id);
  if (library) {
    library.name = name;
    await saveData();
    renderAll();
    closeEditLibraryModal();
    showToast("提示词库编辑成功");
  }
}

// 关闭提示词库编辑弹窗
function closeEditLibraryModal() {
  document.getElementById("editLibraryModal").classList.remove("show");
  // 清空表单
  document.getElementById("editLibraryId").value = "";
  document.getElementById("editLibraryName").value = "";
}

// 删除提示词库
async function deleteLibrary(id) {
  if (libraries.length === 1) {
    alert("至少需要保留一个提示词库");
    return;
  }

  if (!confirm("确定删除此提示词库吗?删除后无法恢复。")) {
    return;
  }

  libraries = libraries.filter((lib) => lib.id !== id);

  // 如果删除的是当前提示词库，切换到第一个提示词库
  if (id === currentLibraryId) {
    currentLibraryId = libraries[0]?.id || "";
    loadCurrentLibraryData();
    // 清空选中的提示词，因为它们可能属于被删除的库
    selectedPrompts = [];
  }

  await saveData();
  renderAll();
}

// 切换提示词库
async function switchLibrary(libraryId) {
  if (libraryId === currentLibraryId) return;

  currentLibraryId = libraryId;
  loadCurrentLibraryData();

  // 清空选中的提示词，因为它们属于其他库
  selectedPrompts = [];
  selectedPromptIds.clear();

  await saveData();
  renderAll();
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

  // 填充弹窗数据
  document.getElementById("editCategoryId").value = category.id;
  document.getElementById("editCategoryName").value = category.name;

  // 显示弹窗
  document.getElementById("editCategoryModal").classList.add("show");
}

// 保存分类编辑
async function saveEditCategory() {
  const id = document.getElementById("editCategoryId").value;
  const name = document.getElementById("editCategoryName").value.trim();

  if (!name) {
    alert("请输入分类名称");
    return;
  }

  const category = categories.find((c) => c.id === id);
  if (category) {
    category.name = name;
    await saveData();
    renderAll();
    closeEditCategoryModal();
    showToast("分类编辑成功");
  }
}

// 关闭分类编辑弹窗
function closeEditCategoryModal() {
  document.getElementById("editCategoryModal").classList.remove("show");
  // 清空表单
  document.getElementById("editCategoryId").value = "";
  document.getElementById("editCategoryName").value = "";
}

// 删除分类
async function deleteCategory(id) {
  // 检查分类下是否有提示词
  const promptCount = prompts.filter((p) => p.categoryId === id).length;
  if (promptCount > 0) {
    alert(
      `该分类下还有 ${promptCount} 个提示词，无法删除。请先删除分类下的所有提示词。`,
    );
    return;
  }

  if (!confirm("确定删除此分类吗?")) {
    return;
  }

  categories = categories.filter((c) => c.id !== id);
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
  const chineseInput = document.getElementById("newPromptChinese");
  const remarkInput = document.getElementById("newPromptRemark");
  const text = input.value.trim();
  const chinese = chineseInput.value.trim();
  const remark = remarkInput.value.trim();

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
    chinese,
    remark,
  });

  await saveData();
  input.value = "";
  chineseInput.value = "";
  remarkInput.value = "";
  filterPrompts();
  renderAll();
}

// 编辑提示词
async function editPrompt(id) {
  const targetPrompt = prompts.find((p) => p.id === id);
  if (!targetPrompt) return;

  // 填充弹窗数据
  document.getElementById("editPromptId").value = targetPrompt.id;
  document.getElementById("editPromptText").value = targetPrompt.text;
  document.getElementById("editPromptChinese").value =
    targetPrompt.chinese || "";
  document.getElementById("editPromptRemark").value = targetPrompt.remark || "";

  // 填充分类选择器
  const categorySelect = document.getElementById("editPromptCategory");
  categorySelect.innerHTML = categories
    .map(
      (cat) =>
        `<option value="${cat.id}" ${cat.id === targetPrompt.categoryId ? "selected" : ""}>${escapeHtml(cat.name)}</option>`,
    )
    .join("");

  // 显示弹窗
  document.getElementById("editPromptModal").classList.add("show");
}

// 保存提示词编辑
async function saveEditPrompt() {
  const id = document.getElementById("editPromptId").value;
  const text = document.getElementById("editPromptText").value.trim();
  const chinese = document.getElementById("editPromptChinese").value.trim();
  const remark = document.getElementById("editPromptRemark").value.trim();
  const categoryId = document.getElementById("editPromptCategory").value;

  if (!text) {
    alert("请输入提示词内容");
    return;
  }

  if (!categoryId) {
    alert("请选择分类");
    return;
  }

  const targetPrompt = prompts.find((p) => p.id === id);
  if (targetPrompt) {
    targetPrompt.text = text;
    targetPrompt.chinese = chinese;
    targetPrompt.remark = remark;
    targetPrompt.categoryId = categoryId;
    await saveData();
    filterPrompts();
    renderAll();
    closeEditPromptModal();
    showToast("提示词编辑成功");
  }
}

// 关闭提示词编辑弹窗
function closeEditPromptModal() {
  document.getElementById("editPromptModal").classList.remove("show");
  // 清空表单
  document.getElementById("editPromptId").value = "";
  document.getElementById("editPromptText").value = "";
  document.getElementById("editPromptChinese").value = "";
  document.getElementById("editPromptRemark").value = "";
  document.getElementById("editPromptCategory").innerHTML = "";
}

// 删除提示词
async function deletePrompt(id) {
  if (!confirm("确定删除此提示词吗?")) {
    return;
  }

  prompts = prompts.filter((p) => p.id !== id);
  selectedPrompts = selectedPrompts.filter((sid) => sid !== id);
  selectedPromptIds.delete(id);

  await saveData();
  filterPrompts();
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
    .getElementById("addLibraryBtn")
    .addEventListener("click", addLibrary);
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", addCategory);
  document.getElementById("addPromptBtn").addEventListener("click", addPrompt);

  // 提示词库选择器事件
  const librarySelector = document.getElementById("librarySelector");
  if (librarySelector) {
    librarySelector.addEventListener("change", (e) => {
      switchLibrary(e.target.value);
    });
  }

  // 提示词筛选事件
  document
    .getElementById("promptCategoryFilter")
    .addEventListener("change", (e) => {
      categoryFilter = e.target.value;
      filterPrompts();
    });

  document.getElementById("promptSearch").addEventListener("input", (e) => {
    searchKeyword = e.target.value.trim();
    filterPrompts();
  });

  // 全选复选框事件
  document
    .getElementById("selectAllPrompts")
    .addEventListener("change", toggleSelectAll);

  // 删除选中按钮事件
  document
    .getElementById("deleteSelectedBtn")
    .addEventListener("click", deleteSelectedPrompts);

  // 分页事件
  document
    .getElementById("prevPage")
    .addEventListener("click", () => changePage("prev"));

  document
    .getElementById("nextPage")
    .addEventListener("click", () => changePage("next"));

  document
    .getElementById("pageSize")
    .addEventListener("change", (e) => changePageSize(e.target.value));

  // 回车键提交
  document
    .getElementById("newLibraryInput")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") addLibrary();
    });

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
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // 同步按钮
  document.getElementById("syncBtn").addEventListener("click", syncToFeishu);

  // 显示提示信息
  function showToast(message, type = "success", duration = 3000) {
    const toast = document.getElementById("toast");
    const toastContent = document.getElementById("toastContent");

    if (!toast || !toastContent) return;

    // 清除之前的类型
    toast.className = "toast";
    // 添加新类型
    toast.classList.add(type);
    // 设置内容
    toastContent.textContent = message;
    // 显示提示
    toast.classList.add("show");

    // 定时隐藏
    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => {
        toast.classList.remove("show", "hide");
      }, 300);
    }, duration);
  }

  // 监听存储变化
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      loadData().then(() => renderAll());
    }
  });

  // 分类编辑弹窗事件
  document
    .getElementById("closeEditCategoryModal")
    .addEventListener("click", closeEditCategoryModal);
  document
    .getElementById("cancelEditCategoryBtn")
    .addEventListener("click", closeEditCategoryModal);
  document
    .getElementById("saveEditCategoryBtn")
    .addEventListener("click", saveEditCategory);

  // 提示词编辑弹窗事件
  document
    .getElementById("closeEditPromptModal")
    .addEventListener("click", closeEditPromptModal);
  document
    .getElementById("cancelEditPromptBtn")
    .addEventListener("click", closeEditPromptModal);
  document
    .getElementById("saveEditPromptBtn")
    .addEventListener("click", saveEditPrompt);

  // 提示词库编辑弹窗事件
  document
    .getElementById("closeEditLibraryModal")
    .addEventListener("click", closeEditLibraryModal);
  document
    .getElementById("cancelEditLibraryBtn")
    .addEventListener("click", closeEditLibraryModal);
  document
    .getElementById("saveEditLibraryBtn")
    .addEventListener("click", saveEditLibrary);

  // 点击弹窗外部关闭弹窗
  document
    .getElementById("editCategoryModal")
    .addEventListener("click", (e) => {
      if (e.target === document.getElementById("editCategoryModal")) {
        closeEditCategoryModal();
      }
    });

  document.getElementById("editPromptModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("editPromptModal")) {
      closeEditPromptModal();
    }
  });

  document.getElementById("editLibraryModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("editLibraryModal")) {
      closeEditLibraryModal();
    }
  });

  // 标签输入框事件
  const tagInput = document.getElementById("tagInput");
  if (tagInput) {
    // 回车键添加标签
    tagInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const text = tagInput.value.trim();
        if (text) {
          addTemporaryTag(text);
          tagInput.value = "";
        }
      }
    });

    // 退格键删除最后一个标签
    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && tagInput.value === "") {
        if (temporaryTags.length > 0) {
          const lastTag = temporaryTags[temporaryTags.length - 1];
          removeTemporaryTag(lastTag.id);
        } else if (selectedPrompts.length > 0) {
          const lastPromptId = selectedPrompts[selectedPrompts.length - 1];
          togglePromptSelection(lastPromptId);
        }
      }
    });

    // 点击其他地方时将输入文字转为标签
    tagInput.addEventListener("blur", () => {
      const text = tagInput.value.trim();
      if (text) {
        addTemporaryTag(text);
        tagInput.value = "";
      }
    });
  }

  // 点击其他地方隐藏右键菜单
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".context-menu") &&
      !e.target.closest(".selected-tag")
    ) {
      hideContextMenu();
    }
  });
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
