// 全局变量
let selectedText = "";
let addButton = null;
let addModal = null;

// 初始化
function init() {
  // 监听文本选择事件
  document.addEventListener("mouseup", handleTextSelection);
  document.addEventListener("selectionchange", handleSelectionChange);
  // 监听点击事件，用于关闭浮动按钮
  document.addEventListener("click", handleClick);
  // 监听消息来自后台脚本
  chrome.runtime.onMessage.addListener(handleMessage);
}

// 处理文本选择
function handleTextSelection(event) {
  setTimeout(() => {
    selectedText = window.getSelection().toString().trim();

    // 移除旧的浮动按钮
    removeAddButton();

    // 如果选中了文本，显示浮动按钮
    if (selectedText && selectedText.length > 0) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showAddButton(rect.left + window.scrollX, rect.top + window.scrollY);
      }
    }
  }, 10);
}

// 处理选择变化
function handleSelectionChange() {
  selectedText = window.getSelection().toString().trim();

  if (!selectedText || selectedText.length === 0) {
    removeAddButton();
  }
}

// 显示浮动添加按钮
function showAddButton(x, y) {
  addButton = document.createElement("button");
  addButton.className = "prompt-add-button";
  addButton.innerHTML = "添加到提示词库 (Alt+Shift+A)";
  addButton.title = "添加到提示词库 (Alt+Shift+A)";

  // 设置按钮位置
  addButton.style.left = `${x}px`;
  addButton.style.top = `${y - 40}px`;

  // 添加点击事件
  addButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openAddPromptModal(selectedText);
  });

  // 阻止右键菜单
  addButton.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  });

  document.body.appendChild(addButton);
}

// 移除浮动按钮
function removeAddButton() {
  if (addButton && addButton.parentNode) {
    addButton.parentNode.removeChild(addButton);
    addButton = null;
  }
}

// 处理点击事件
function handleClick() {
  removeAddButton();
}

// 打开添加提示词弹窗
function openAddPromptModal(text) {
  // 移除旧的弹窗
  removeAddModal();

  // 创建弹窗
  addModal = document.createElement("div");
  addModal.className = "prompt-add-modal";

  // 弹窗内容
  addModal.innerHTML = `
    <div class="prompt-add-modal-content">
      <div class="prompt-add-modal-header">
        <h3 class="prompt-add-modal-title">添加到提示词库</h3>
        <button class="prompt-add-modal-close">&times;</button>
      </div>
      <form class="prompt-add-form">
        <div class="form-group">
          <label for="library-select">提示词库</label>
          <select id="library-select" class="form-control"></select>
        </div>
        <div class="form-group">
          <label for="category-select">分类</label>
          <select id="category-select" class="form-control"></select>
        </div>
        <div class="form-group">
          <label for="prompt-text">提示词</label>
          <input type="text" id="prompt-text" class="form-control" value="${escapeHtml(text)}" required>
        </div>
        <div class="form-group">
          <label for="prompt-chinese">中文解释</label>
          <input type="text" id="prompt-chinese" class="form-control">
        </div>
        <div class="form-group">
          <label for="prompt-remark">备注</label>
          <input type="text" id="prompt-remark" class="form-control">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary save-btn">保存</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(addModal);

  // 添加事件监听器
  addModal
    .querySelector(".prompt-add-modal-close")
    .addEventListener("click", closeAddPromptModal);
  addModal
    .querySelector(".cancel-btn")
    .addEventListener("click", closeAddPromptModal);

  // 表单提交
  addModal.querySelector(".prompt-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    savePrompt();
  });

  // 点击模态框外部关闭
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal) {
      closeAddPromptModal();
    }
  });

  // 加载提示词库和分类
  loadLibrariesAndCategories();
}

// 关闭添加提示词弹窗
function closeAddPromptModal() {
  removeAddModal();
  removeAddButton();
}

// 移除弹窗
function removeAddModal() {
  if (addModal && addModal.parentNode) {
    addModal.parentNode.removeChild(addModal);
    addModal = null;
  }
}

// 加载提示词库和分类
function loadLibrariesAndCategories() {
  chrome.storage.local.get(["libraries"], (result) => {
    const libraries = result.libraries || [];
    const librarySelect = document.getElementById("library-select");

    // 填充提示词库选项
    librarySelect.innerHTML = "";
    if (libraries.length > 0) {
      libraries.forEach((library) => {
        const option = document.createElement("option");
        option.value = library.id;
        option.textContent = library.name;
        librarySelect.appendChild(option);
      });

      // 加载第一个提示词库的分类
      loadCategories(libraries[0].id);

      // 监听提示词库选择变化
      librarySelect.addEventListener("change", (e) => {
        loadCategories(e.target.value);
      });
    } else {
      // 如果没有提示词库，显示默认选项
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "暂无提示词库";
      librarySelect.appendChild(option);
      librarySelect.disabled = true;
    }
  });
}

// 加载分类
function loadCategories(libraryId) {
  chrome.storage.local.get(["libraries"], (result) => {
    const libraries = result.libraries || [];
    const library = libraries.find((lib) => lib.id === libraryId);
    const categorySelect = document.getElementById("category-select");

    // 填充分类选项
    categorySelect.innerHTML = "";
    if (library && library.categories && library.categories.length > 0) {
      library.categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    } else {
      // 如果没有分类，显示默认选项
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "暂无分类";
      categorySelect.appendChild(option);
      categorySelect.disabled = true;
    }
  });
}

// 保存提示词
function savePrompt() {
  const libraryId = document.getElementById("library-select").value;
  const categoryId = document.getElementById("category-select").value;
  const text = document.getElementById("prompt-text").value;
  const chinese = document.getElementById("prompt-chinese").value;
  const remark = document.getElementById("prompt-remark").value;

  // 验证输入
  if (!libraryId || !categoryId || !text) {
    alert("请填写完整信息");
    return;
  }

  // 从存储中获取数据
  chrome.storage.local.get(["libraries"], (result) => {
    const libraries = result.libraries || [];

    // 找到对应的提示词库
    const libraryIndex = libraries.findIndex((lib) => lib.id === libraryId);
    if (libraryIndex === -1) {
      alert("提示词库不存在");
      return;
    }

    // 找到对应的分类
    const category = libraries[libraryIndex].categories.find(
      (cat) => cat.id === categoryId,
    );
    if (!category) {
      alert("分类不存在");
      return;
    }

    // 创建新的提示词
    const newPrompt = {
      id: Date.now().toString(),
      categoryId: categoryId,
      text: text,
      chinese: chinese,
      remark: remark,
    };

    // 添加到提示词库
    if (!libraries[libraryIndex].prompts) {
      libraries[libraryIndex].prompts = [];
    }
    libraries[libraryIndex].prompts.push(newPrompt);

    // 保存回存储
    chrome.storage.local.set({ libraries }, () => {
      // 关闭弹窗
      closeAddPromptModal();

      // 显示成功提示
      showNotification("提示词添加成功");
    });
  });
}

// 显示通知
function showNotification(message) {
  // 创建通知元素
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    z-index: 99999;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // 3秒后移除通知
  setTimeout(() => {
    notification.style.animation = "fadeIn 0.3s ease-out reverse";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 处理来自后台脚本的消息
function handleMessage(message, sender, sendResponse) {
  if (message.action === "addSelectedTextToPrompt") {
    const text = message.text || window.getSelection().toString().trim();
    openAddPromptModal(text);
  }
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 初始化
init();
