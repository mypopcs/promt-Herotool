// 全局状态
let libraries = []; // 提示词库数组
let currentLibraryId = ""; // 当前选中的提示词库ID
let categories = []; // 当前提示词库的分类
let prompts = []; // 当前提示词库的提示词
let selectedPrompts = []; // 选中的提示词ID
let temporaryTags = []; // 临时标签数组
let currentContextTagId = null; // 当前右键点击的标签ID

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

// 初始化应用
async function initializeApp() {
  try {
    await loadData();
    await loadGitHubConfig();
    bindEvents();
    renderAll();
    updateSyncStatus();
  } catch (error) {
    console.error("初始化失败:", error);
  }
}

// 加载GitHub配置
async function loadGitHubConfig() {
  try {
    const result = await chrome.storage.local.get("githubConfig");
    if (result.githubConfig) {
      console.log("=== GitHub配置加载成功 ===", {
        owner: result.githubConfig.owner,
        repo: result.githubConfig.repo,
        token: result.githubConfig.token ? "***" : "",
      });
    }
  } catch (error) {
    console.error("=== GitHub配置加载失败 ===", error);
  }
}

// 加载数据
async function loadData() {
  try {
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
  } catch (error) {
    console.error("加载数据失败:", error);
    libraries = getDefaultLibraries();
    currentLibraryId = libraries[0]?.id || "";
    loadCurrentLibraryData();
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
  try {
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
  } catch (error) {
    console.error("保存数据失败:", error);
  }
}

// 渲染所有内容
function renderAll() {
  renderLibrarySelector();
  renderUseTab();
}

// 渲染提示词库选择器
function renderLibrarySelector() {
  const selectUse = document.getElementById("librarySelectorUse");
  if (!selectUse) return;

  const html = libraries
    .map(
      (lib) =>
        `<option value="${lib.id}" ${lib.id === currentLibraryId ? "selected" : ""}>${escapeHtml(lib.name)}</option>`,
    )
    .join("");

  selectUse.innerHTML = html;
}

// 渲染使用标签页
function renderUseTab() {
  const promptsList = document.getElementById("promptsList");
  const selectedSection = document.getElementById("selectedSection");
  const emptyState = document.getElementById("emptyState");

  // 始终显示已选择区域
  if (selectedSection) {
    selectedSection.style.display = "block";
    renderSelectedTags();
  }

  // 检查是否有提示词
  if (prompts.length === 0) {
    if (promptsList) promptsList.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  if (promptsList) promptsList.style.display = "block";
  if (emptyState) emptyState.style.display = "none";

  // 渲染分类和提示词
  if (promptsList) {
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
                  <div class="prompt-tag ${selectedPrompts.includes(prompt.id) ? "selected" : ""} ${prompt.imageUrl ? "has-image" : ""}
                       data-id="${prompt.id}"
                       ${prompt.remark ? `data-remark="${escapeHtml(prompt.remark)}"` : ""}>
                    ${
                      prompt.imageUrl
                        ? `
                    <div class="prompt-image-container">
                      <img 
                        src="${prompt.imageUrl}" 
                        alt="${escapeHtml(prompt.text)}" 
                        class="prompt-thumbnail" 
                        title="${escapeHtml(prompt.text)}"
                      />
                    </div>
                  `
                        : ""
                    }
                    <div class="prompt-tag-content">
                      ${escapeHtml(prompt.text)}
                      ${prompt.chinese ? `<div class="prompt-tag-chinese">${escapeHtml(prompt.chinese)}</div>` : ""}
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

    promptsList.innerHTML = html;

    // 绑定提示词点击事件
    document.querySelectorAll(".prompt-tag").forEach((tag) => {
      tag.addEventListener("click", () => {
        togglePromptSelection(tag.dataset.id);
      });
    });

    // 绑定图片hover和点击事件
    document
      .querySelectorAll(".prompt-tag .prompt-thumbnail")
      .forEach((img) => {
        // hover事件 - 显示浮动层
        img.addEventListener("mouseenter", (e) => {
          const imageUrl = img.src;
          const tooltip = document.getElementById("imageHoverTooltip");
          const tooltipImg = document.getElementById("imageHoverTooltipImg");

          if (tooltip && tooltipImg) {
            tooltipImg.src = imageUrl;
            tooltip.classList.add("show");

            // 计算位置
            const rect = img.getBoundingClientRect();
            const tooltipWidth = 400;
            const tooltipHeight = 400;

            let left = rect.right + 10;
            let top = rect.top;

            // 如果右侧空间不足，显示在左侧
            if (left + tooltipWidth > window.innerWidth) {
              left = rect.left - tooltipWidth - 10;
            }

            // 如果底部空间不足，向上调整
            if (top + tooltipHeight > window.innerHeight) {
              top = window.innerHeight - tooltipHeight - 10;
            }

            tooltip.style.left = left + "px";
            tooltip.style.top = top + "px";
          }
        });

        // hover离开事件 - 隐藏浮动层
        img.addEventListener("mouseleave", () => {
          const tooltip = document.getElementById("imageHoverTooltip");
          if (tooltip) {
            tooltip.classList.remove("show");
          }
        });

        // 点击事件 - 显示弹窗
        img.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const imageUrl = img.src;
          showImagePreviewModal(imageUrl);
        });
      });
  }
}

// 渲染已选择的标签
function renderSelectedTags() {
  const selectedTags = document.getElementById("selectedTags");
  if (!selectedTags) return;

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

  if (!contextMenu || !contextMenuItems) return;

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
  if (contextMenu) {
    contextMenu.classList.remove("show");
  }
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
    if (btn) {
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
    }
  } catch (error) {
    console.error("复制失败:", error);
  }
}

// 绑定事件
function bindEvents() {
  // 使用标签页事件
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearSelection);
  }

  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyPrompts);
  }

  // 标签输入框事件
  const tagInput = document.getElementById("tagInput");
  if (tagInput) {
    tagInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        addTemporaryTag(e.target.value);
        e.target.value = "";
      }
    });
  }

  // 提示词库选择器事件 - 使用提示词页面
  const librarySelectorUse = document.getElementById("librarySelectorUse");
  if (librarySelectorUse) {
    librarySelectorUse.addEventListener("change", (e) => {
      switchLibrary(e.target.value);
    });
  }

  // 同步按钮事件
  const syncBtn = document.getElementById("syncBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", syncToFeishu);
  }

  // 设置按钮事件
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
    });
  }
}

// 切换提示词库
async function switchLibrary(libraryId) {
  if (libraryId === currentLibraryId) return;

  currentLibraryId = libraryId;
  loadCurrentLibraryData();

  // 清空选中的提示词，因为它们属于其他库
  selectedPrompts = [];

  await saveData();
  renderAll();
}

// 同步到飞书
async function syncToFeishu() {
  const syncBtn = document.getElementById("syncBtn");
  const syncStatus = document.getElementById("syncStatus");

  if (syncBtn) syncBtn.classList.add("syncing");
  if (syncStatus) syncStatus.classList.add("syncing");

  try {
    const result = await chrome.storage.local.get("feishuConfig");
    const feishuConfig = result.feishuConfig || {};

    if (
      !feishuConfig.appId ||
      !feishuConfig.appSecret ||
      !feishuConfig.tableId
    ) {
      throw new Error("飞书配置不完整");
    }

    // 获取访问令牌
    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: feishuConfig.appId,
          app_secret: feishuConfig.appSecret,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error(`获取令牌失败: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.app_access_token;

    // 构建提示词数据
    const currentLibrary = libraries.find((lib) => lib.id === currentLibraryId);
    const libraryName = currentLibrary ? currentLibrary.name : "默认提示词库";

    const promptData = prompts.map((prompt) => {
      const category = categories.find((cat) => cat.id === prompt.categoryId);
      return {
        fields: {
          name: [{ text: prompt.text }],
          chinese: [{ text: prompt.chinese || "" }],
          remark: [{ text: prompt.remark || "" }],
          category: [{ text: category ? category.name : "未分类" }],
          library: [{ text: libraryName }],
          image_url: prompt.imageUrl
            ? [{ text: prompt.imageUrl }]
            : [{ text: "" }],
        },
      };
    });

    // 清空现有记录
    const clearResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${feishuConfig.appId}/tables/${feishuConfig.tableId}/records/batch_delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [],
        }),
      },
    );

    if (!clearResponse.ok) {
      throw new Error(`清空记录失败: ${clearResponse.statusText}`);
    }

    // 批量创建记录（每次最多100条）
    for (let i = 0; i < promptData.length; i += 100) {
      const batchData = promptData.slice(i, i + 100);

      const createResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${feishuConfig.appId}/tables/${feishuConfig.tableId}/records/batch_create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: batchData,
          }),
        },
      );

      if (!createResponse.ok) {
        throw new Error(`创建记录失败: ${createResponse.statusText}`);
      }
    }

    if (syncStatus) {
      syncStatus.innerHTML =
        '<span class="status-dot success"></span><span class="status-text">同步成功</span>';
      setTimeout(() => {
        syncStatus.innerHTML =
          '<span class="status-dot"></span><span class="status-text">未同步</span>';
      }, 3000);
    }
  } catch (error) {
    console.error("同步失败:", error);
    if (syncStatus) {
      syncStatus.innerHTML =
        '<span class="status-dot error"></span><span class="status-text">同步失败</span>';
      setTimeout(() => {
        syncStatus.innerHTML =
          '<span class="status-dot"></span><span class="status-text">未同步</span>';
      }, 3000);
    }
  } finally {
    if (syncBtn) syncBtn.classList.remove("syncing");
    if (syncStatus) syncStatus.classList.remove("syncing");
  }
}

// 更新同步状态
function updateSyncStatus() {
  const syncStatus = document.getElementById("syncStatus");
  if (syncStatus) {
    syncStatus.innerHTML =
      '<span class="status-dot"></span><span class="status-text">未同步</span>';
  }
}

// 显示图片预览弹窗
function showImagePreviewModal(imageUrl) {
  const modal = document.getElementById("imagePreviewModal");
  const modalImage = document.getElementById("imagePreviewModalImg");
  const closeModal = document.getElementById("closeImagePreviewModal");

  if (modal && modalImage) {
    modalImage.src = imageUrl;
    modal.style.display = "flex";
  }

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      if (modal) {
        modal.style.display = "none";
      }
    });
  }

  // 点击模态框外部关闭
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }
}

// 转义HTML特殊字符
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 显示提示信息
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === "success" ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
      </svg>
      ${message}
    </div>
  `;

  document.body.appendChild(toast);
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}
