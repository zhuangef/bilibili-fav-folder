var mid;
var csrf;
var tar_media_id;
var src_media_id;
var platform;
// var KEY;
var folders_lists;
var favlist_btn;
var panel; //面板
var panelHeader; //面板头部
var headerButton; //新建收藏夹按钮
var panelHeaderLeft; // 面板头部左侧;
var confirmBtn; // 确定按钮
var messages; //信息列表
var content; //面板内容区
var favoriteSelectionOrder = 0; // 收藏夹选取顺序计数器

const targetNode = document.body;
const config = { childList: true, subtree: true };
const callback = function (mutationsList, observer) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        if (currentUrl.includes("favlist")) {
          insertfavlist_btn();
        }
      }
    }
  }
};

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);
let currentUrl = window.location.href;


function formatErrorMessage(error) {
  if (!error) return "未知错误";
  if (error instanceof Error) return error.message || error.toString();
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    return String(error);
  }
}

function escapeMessageHtml(content) {
  return String(content).replace(/[&<>"]/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
    };
    return entities[char];
  });
}

async function postErrorMessage(message, error) {
  const errorDetail = formatErrorMessage(error);
  const content = `${message}${errorDetail ? `：${errorDetail}` : ""}`;
  await postMessage(
    `<span class="error-message">${escapeMessageHtml(content)}</span>`
  );
}

function logAndPostError(message, error) {
  console.error(message, error);
  postErrorMessage(message, error).catch((postError) => {
    console.error("运行信息窗口显示报错失败:", postError);
  });
}

function insertfavlist_btn() {
  const detail__actions = this.document.querySelector(
    ".favlist-info-detail__actions"
  );
  const managementButton = this.document.querySelector(".management_button");
  if (!managementButton) {
    // 弹出管理面板的按钮
    favlist_btn = document.createElement("button");
    favlist_btn.className = "vui_button management_button";
    favlist_btn.textContent = "管理面板";
    favlist_btn.style.cssText = `margin: 0px 0px 0px 10px;`;
    detail__actions.appendChild(favlist_btn);
  }

  favlist_btn.addEventListener("click", async (e) => {
    e.stopImmediatePropagation();
    console.log("管理面板被点击");

    getParams();
    console.log(mid);
    console.log(tar_media_id);
    let up_favoriteLists = await myFavoriteLists(mid);
    let my_favoriteLists = await myFavoriteLists(tar_media_id);
    console.log(up_favoriteLists);
    console.log(my_favoriteLists);
    // 初始化面板
    createSelectionPanel(up_favoriteLists, my_favoriteLists);
  });
}

// 创建选择面板
async function createSelectionPanel(up_favoriteLists, my_favoriteLists) {
  favoriteSelectionOrder = 0;
  // 添加样式
  addStyles();

  // 禁用页面滚动
  document.body.style.overflow = "hidden";

  // 创建遮罩层
  const overlay = document.createElement("div");
  overlay.id = "selection-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "1000";

  // 创建主面板容器
  panel = document.createElement("div");
  panel.id = "selection-panel";
  panel.style.backgroundColor = "white";
  panel.style.borderRadius = "8px";
  panel.style.width = "50%";
  panel.style.maxWidth = "50%";
  panel.style.maxHeight = "80vh";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.overflow = "hidden";
  panel.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";

  // 面板标题区域
  panelHeader = document.createElement("div");
  panelHeader.style.display = "flex";
  panelHeader.style.alignItems = "center";
  panelHeader.style.justifyContent = "space-between"; // 使内容分居两侧
  panel.appendChild(panelHeader);

  // 左侧标题
  panelHeaderLeft = document.createElement("div");

  panelHeaderLeft.style.display = "flex";
  panelHeaderLeft.style.alignItems = "center";
  panelHeader.appendChild(panelHeaderLeft);

  const headerTitle = document.createElement("span");
  headerTitle.textContent = "选择收藏夹";
  headerTitle.style.padding = "16px";
  headerTitle.style.fontSize = "18px";
  headerTitle.style.fontWeight = "bold";
  headerTitle.style.borderBottom = "1px solid #eee";
  headerTitle.style.backgroundColor = "#f9f9f9";
  panelHeaderLeft.appendChild(headerTitle);

  headerButton = document.createElement("button");
  headerButton.className = "vui_button";
  headerButton.textContent = "新建收藏夹";
  headerButton.style.cssText = `margin: 10px 10px 10px 10px;`;
  panelHeaderLeft.appendChild(headerButton);
  headerButton.addEventListener("click", async () => {
    // 如果已经存在输入框，则不再添加
    if (panelHeader.querySelector(".folder-input-container")) return;

    newFolder(); //新建文件夹
  });

  // 头部右侧容器（用于放置按钮和单选框）
  const headerRight = document.createElement("div");
  headerRight.style.display = "flex";
  headerRight.style.alignItems = "center";
  headerRight.style.border = "1px solid #ddd";
  headerRight.style.padding = "5px";
  headerRight.style.borderRadius = "5px";
  headerRight.style.gap = "20px"; // 设置元素间距
  headerRight.style.marginRight = "20px";
  panelHeader.appendChild(headerRight);

  const modeSelector = document.createElement("div"); // 模式选择容器
  modeSelector.style.display = "flex";
  modeSelector.style.alignItems = "center";
  modeSelector.style.gap = "10px";
  headerRight.appendChild(modeSelector);

  // 添加模式单选框
  const addModeRadio = createRadioButton(
    "add-mode",
    "mode-selector",
    "添加模式",
    true
  );
  modeSelector.appendChild(addModeRadio.container);

  // 复制模式单选框
  const copyModeRadio = createRadioButton(
    "copy-mode",
    "mode-selector",
    "复制模式",
    false
  );
  modeSelector.appendChild(copyModeRadio.container);

  // 内容区域
  content = document.createElement("div");
  content.className = "user-favorites-list";
  content.style.display = "flex";
  content.style.flex = "1";
  content.style.overflow = "hidden";
  content.style.padding = "10px";
  content.style.gap = "20px";

  // 创建左右两个列表
  const leftList = createList(
    "left",
    "left_list",
    "源收藏夹",
    up_favoriteLists
  );
  leftList.style.flex = "1";
  leftList.style.overflowY = "auto";

  const rightList = createList(
    "right",
    "right_list",
    "目标收藏夹",
    my_favoriteLists
  );
  rightList.style.flex = "1";
  rightList.style.overflowY = "auto";

  const messageList = createList("message", "message_list", "运行信息", []);
  messageList.style.flex = "1";
  messageList.style.overflowY = "auto";

  content.appendChild(leftList);
  content.appendChild(rightList);
  content.appendChild(messageList);
  panel.appendChild(content);

  // 底部按钮区域
  const buttonArea = document.createElement("div");
  buttonArea.style.display = "flex";
  buttonArea.style.justifyContent = "space-between";
  buttonArea.style.padding = "16px";
  buttonArea.style.borderTop = "1px solid #eee";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "关闭";
  closeBtn.addEventListener("click", () => {
    document.body.style.overflow = "";
    document.body.removeChild(overlay);
  });

  confirmBtn = document.createElement("button");
  confirmBtn.className = "confirm";
  confirmBtn.textContent = "确定";
  confirmBtn.style.backgroundColor = "#00bcd4";
  confirmBtn.style.color = "white";

  function getCurrentMode() {
    return document.querySelector('input[name="mode-selector"]:checked').value;
  }

  confirmBtn.addEventListener("click", async () => {
    const mode = getCurrentMode();

    //获取当前 选择的收藏夹
    const leftFavorite = document.querySelector(".left_list");
    const rightFavorite = document.querySelector(".right_list");
    const Favorite_left = getSelectedFavorites(leftFavorite);
    const Favorite_right = getSelectedFavorites(rightFavorite);

    if (mode === "add-mode") {
      if (Favorite_left[0] && Favorite_right[0]) {
        // 添加模式逻辑
        await postMessage("选择模式:添加模式");
        Favorite_left.forEach(async (e) => {
          await postMessage(`已选源收藏夹:${e.title}`);
        });

        await postMessage(`已选目标收藏夹:${Favorite_right[0].title}`);

        const left_number = getTotalSelectedCount(leftFavorite);
        const right_number = getTotalSelectedCount(rightFavorite);
        if (left_number <= 1000 - right_number) {
          async function processFavorites() {
            for (const data of Favorite_left) {
              const favDa = await saveFavData(data.id);
              if (favDa) {
                let copy = await copy_data(
                  favDa,
                  data.id,
                  Favorite_right[0].id,
                  mid,
                  csrf
                );
                // 等待当前copy_data完成后再继续下一次循环
              }
            }
          }

          await processFavorites().catch((error) => {
            logAndPostError("处理收藏夹时出错", error);
          });
          await refresh();
        } else {
          alert("目标收藏夹容量不足,请更换新的目标收藏夹");
        }
      } else {
        alert("请选择源收藏夹和目标收藏夹");
      }
    } else {
      if (Favorite_left[0]) {
        // 复制模式逻辑：Favorite_left 已按用户选取顺序排列
        for (const e of Favorite_left) {
          await postMessage(`已选源收藏夹:${e.title}`);
        }

        const copyPairs = [];
        for (const source of Favorite_left) {
          try {
            const newFolderData = await newFolderReques(source.title, csrf, 0);
            const targetId = newFolderData?.data?.id;
            copyPairs.push({ source, targetId });
          } catch (error) {
            await postErrorMessage(`创建 ${source.title} 时出错`, error);
            console.error(`创建 ${source.title} 时出错:`, error);
            throw error;
          }
        }

        const rightList = await refresh();
        if (!rightList) return;

        const unmatchedCreatedFolders = getFavoriteItems(rightList).filter(
          (item) =>
            copyPairs.some(({ source }) => source.title === item.title) &&
            item.count === 0 &&
            !copyPairs.some(({ targetId }) => targetId === item.id)
        );

        try {
          for (const pair of copyPairs) {
            const targetId =
              pair.targetId ||
              unmatchedCreatedFolders.find(
                (item) => item.title === pair.source.title && !item.used
              )?.id;

            const fallbackTarget = unmatchedCreatedFolders.find(
              (item) => item.id === targetId
            );
            if (fallbackTarget) fallbackTarget.used = true;

            if (!targetId) {
              throw new Error(`未找到新建目标收藏夹：${pair.source.title}`);
            }

            const favDa = await saveFavData(pair.source.id);
            await copy_data(favDa, pair.source.id, targetId, mid, csrf);
            console.log(`成功处理 ${pair.source.title} -> ${targetId}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await refresh();
        } catch (error) {
          await postErrorMessage("处理收藏夹时出错", error);
          console.error("处理收藏夹时出错:", error);
        }
      }
    }
  });

  buttonArea.appendChild(closeBtn);
  buttonArea.appendChild(confirmBtn);
  panel.appendChild(buttonArea);

  // 添加到遮罩层
  overlay.appendChild(panel);

  // 添加到文档
  document.body.appendChild(overlay);

  // 返回面板引用以便后续操作
  return {
    panel,
    leftList,
    rightList,
    close: () => {
      // 关闭时恢复页面滚动
      document.body.style.overflow = "";
      document.body.removeChild(overlay);
    },
  };
}
/**
 * 获取左侧列表中所有选中收藏夹的信息
 * @returns {Array} 包含选中收藏夹对象的数组
 */
function getSelectedFavorites(dom) {
  if (!dom) return [];

  const selectedItems = dom.querySelectorAll(".favorite-item.selected");
  const selectedFavorites = [];

  selectedItems.forEach((item, index) => {
    const id = item.dataset.id;
    const title = item.querySelector(".item-title")?.textContent || "";
    const count = parseInt(item.querySelector(".item-count")?.textContent) || 0;
    const selectedOrder = parseInt(item.dataset.selectedOrder) || index;

    selectedFavorites.push({
      id,
      title,
      count,
      selectedOrder,
    });
  });

  return selectedFavorites.sort(
    (current, next) => current.selectedOrder - next.selectedOrder
  );
}

function getFavoriteItems(dom) {
  if (!dom) return [];

  return Array.from(dom.querySelectorAll(".favorite-item")).map((item) => ({
    id: item.dataset.id,
    title: item.querySelector(".item-title")?.textContent || "",
    count: parseInt(item.querySelector(".item-count")?.textContent) || 0,
    element: item,
  }));
}

/**
 * 计算选中收藏夹的总视频数量
 *
 * @returns {number} 选中收藏夹中视频的总数
 */
function getTotalSelectedCount(dom) {
  const selectedFavorites = getSelectedFavorites(dom);
  return selectedFavorites.reduce(
    (total, favorite) => total + favorite.count,
    0
  );
}

function createRadioButton(id, name, label, checked) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "radio";
  input.id = id;
  input.name = name;
  input.checked = checked;
  input.value = id;

  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  labelEl.style.marginLeft = "6px";
  labelEl.style.cursor = "pointer";

  container.appendChild(input);
  container.appendChild(labelEl);

  return { container, input };
}
// 新建文件夹
function newFolder() {
  // 创建输入框容器
  const inputContainer = document.createElement("div");
  inputContainer.className = "folder-input-container";
  inputContainer.style.display = "flex";
  inputContainer.style.alignItems = "center";
  inputContainer.style.marginLeft = "0px";

  // 创建输入框
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "输入收藏夹名称";
  input.className = "folder-input";
  input.style.padding = "6px 6px";
  input.style.border = "1px solid #ddd";
  input.style.borderRadius = "4px";
  input.style.marginRight = "8px";
  input.style.width = "190px";

  // 创建确认按钮
  const confirmNewCollection = document.createElement("button");
  confirmNewCollection.className = "vui_button vui_button--primary";
  confirmNewCollection.textContent = "确定";
  confirmNewCollection.style.padding = "6px 12px";
  confirmNewCollection.style.marginRight = "8px";

  // 创建取消按钮
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "vui_button";
  cancelBtn.textContent = "取消";
  cancelBtn.style.padding = "6px 12px";

  // 添加元素到容器
  inputContainer.appendChild(input);
  inputContainer.appendChild(confirmNewCollection);
  inputContainer.appendChild(cancelBtn);

  panelHeaderLeft.appendChild(inputContainer);

  // 自动聚焦输入框
  input.focus();

  // 确认按钮点击事件
  confirmNewCollection.addEventListener("click", async () => {
    const folderName = input.value.trim();

    if (!folderName) {
      alert("请输入收藏夹名称");
      return;
    }

    let newFolderData = await newFolderReques(folderName, csrf); // 发送新建收藏夹的请求

    // todo 刷新面板数据
    await refresh();
    // todo 刷新面板数据
    inputContainer.remove();
  });

  // 输入框回车事件
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      confirmNewCollection.click();
      inputContainer.remove();
    }
  });

  // 取消按钮点击事件
  cancelBtn.addEventListener("click", () => {
    inputContainer.remove();
  });

  // 点击外部区域取消
  const clickOutsideHandler = (e) => {
    if (!inputContainer.contains(e.target) && e.target !== headerButton) {
      inputContainer.remove();
      document.removeEventListener("click", clickOutsideHandler);
    }
  };

  setTimeout(() => {
    document.addEventListener("click", clickOutsideHandler);
  }, 0);
}

// 创建单个列表
function createList(position, classname, title, items) {
  const container = document.createElement("div");
  container.className = position;
  container.style.border = "1px solid #ddd";
  container.style.borderRadius = "5px";
  container.style.padding = "10px";
  container.style.boxSizing = "border-box";
  container.style.maxWidth = "33%"; // 固定高度
  // container.style.overflow = "hidden"; // 隐藏内部溢出
  // container.style.height = "100%";
  container.style.display = "flex";
  container.style.flexDirection = "column";

  // 列表标题
  const header = document.createElement("div");
  header.textContent = title;
  header.style.fontWeight = "bold";
  header.style.padding = "8px";
  header.style.backgroundColor = "#f5f5f5";
  header.style.borderBottom = "1px solid #ddd";
  header.style.marginBottom = "10px";
  header.style.flexShrink = "0"; // 防止标题被压缩
  container.appendChild(header);

  // 列表项容器
  const itemsContainer = document.createElement("div");
  itemsContainer.className = classname;
  itemsContainer.style.overflowY = "auto"; // 垂直滚动

  itemsContainer.style.flexGrow = "1"; // 占据剩余空间
  // itemsContainer.style.paddingRight = "5px"; // 为滚动条留出空间
  itemsContainer.style.maxHeight = "300px"; // 在这里限制高度
  itemsContainer.style.scrollbarWidth = "thin";
  itemsContainer.style.scrollbarColor = "#ccc #f5f5f5";
  // itemsContainer.style.maxHeight = "calc(100% - 40px)";

  // 渲染列表项
  items.forEach((item) => {
    const listItem = createFavoriteItem(item);
    itemsContainer.appendChild(listItem);
  });

  container.appendChild(itemsContainer);
  return container;
}

async function refresh() {
  // 更新右容器数据
  const existingList = panel.querySelector(".right");
  if (!existingList) {
    logAndPostError("Right container not found");
    return null;
  }

  const right_list = panel.querySelector(".right_list");
  if (right_list && right_list.parentNode === existingList) {
    existingList.removeChild(right_list);
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 500)); // 3秒延迟
    const my_favoriteList = await myFavoriteLists(tar_media_id);

    // 清空现有列表（如果存在）或创建新列表
    const newRightList = right_list || document.createElement("div");
    newRightList.className = "right_list";
    newRightList.innerHTML = ""; // 清空现有内容

    // 添加新的收藏项
    my_favoriteList.forEach((item) => {
      const listItem = createFavoriteItem(item);
      newRightList.appendChild(listItem);
    });

    // 如果这是新创建的列表，需要添加到DOM中
    if (!right_list) {
      // 插入到 existingList 的适当位置
      const firstChild = existingList.firstChild;
      existingList.insertBefore(
        newRightList,
        firstChild ? firstChild.nextSibling : null
      );
    } else {
      // 重新添加回原来的位置
      const firstChild = existingList.firstChild;
      existingList.insertBefore(newRightList, firstChild.nextSibling);
    }

    newRightList.style.flex = "1";
    newRightList.style.overflowY = "auto";

    return newRightList;
  } catch (error) {
    await postErrorMessage("Failed to refresh favorite list", error);
    console.error("Failed to refresh favorite list:", error);
    return null;
  }
}

/**
 * 创建单个收藏夹列表项
 * @param {Object} item 收藏夹对象
 * @param {String}  classname
 * @returns {HTMLElement} 列表项元素
 */
function createFavoriteItem(item) {
  const listItem = document.createElement("div");
  listItem.className = "favorite-item";
  listItem.dataset.id = item.id;

  // 创建内容容器
  const contentWrapper = document.createElement("div");
  contentWrapper.className = "item-content";

  // 收藏夹标题
  const titleElement = document.createElement("span");
  titleElement.className = "item-title";
  titleElement.textContent = item.title;

  // 视频数量
  const countElement = document.createElement("span");
  countElement.className = "item-count";
  countElement.textContent = `${item.media_count || 0}`;

  // 组装元素
  contentWrapper.appendChild(titleElement);
  contentWrapper.appendChild(countElement);
  listItem.appendChild(contentWrapper);

  // 添加点击事件
  listItem.addEventListener("click", function () {
    this.classList.toggle("selected");
    if (this.classList.contains("selected")) {
      this.dataset.selectedOrder = (++favoriteSelectionOrder).toString();
    } else {
      delete this.dataset.selectedOrder;
    }
    // 这里可以添加选中/取消选中的逻辑
    // 切换当前项的选中状态
    const isRightList = this.closest(".right_list") !== null;

    if (isRightList) {
      // 如果是右侧列表，实现单选逻辑
      const rightListItems =
        this.parentElement.querySelectorAll(".favorite-item");

      rightListItems.forEach((item) => {
        if (item !== this) {
          // 不是当前点击的项
          item.classList.remove("selected");
          delete item.dataset.selectedOrder;
        }
      });
    }
  });

  return listItem;
}
// 添加样式
function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .selected {
      background-color: #e0f7fa;
      border-left: 3px solid #00bcd4;
    }
    div[data-id]:hover {
      background-color:rgba(112, 221, 240, 0.9);
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background-color: #f0f0f0;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color:rgb(168, 166, 166);
    }
      /* 自定义滚动条样式 */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #f5f5f5;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #aaa;
    }
    .favorite-item {
      padding: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
    }

    .favorite-item:hover {
      background-color: #f5f5f5;
    }

    .favorite-item.selected {
      background-color: #e0f7fa;
      border-left: 3px solid #00bcd4;
    }

    .item-content {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }

    .item-title {
      font-weight: 500;
    }

    .item-count {
      color: #000000;
      font-weight: 500;
    }
      .vui_button--primary:hover {
     background-color: #00a5bb;
      }

    .folder-input:focus {
     outline: none;
     border-color: #00bcd4;
     box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.2);
    }
     /* 单选框样式增强 */
    input[type="radio"] {
      margin: 0;
      cursor: pointer;
      width: 16px;
      height: 16px;
    }
      .highlight {
      color: #00bcd4; /* 蓝色高亮 */
      background-color: #e0f7fa; /* 浅蓝色背景 */
    }
      .message-item{
      padding: 6px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
      }
      .error-message {
      color: #d32f2f;
      }
  `;
  document.head.appendChild(style);
}

async function getParams() {
  // 获取当前页面的fid参数

  function getCookie(name) {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split("=");
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  // ! ------参数-------------------------------------
  mid = window.location.pathname.split("/")[1];
  csrf = getCookie("bili_jct");
  tar_media_id = getCookie("DedeUserID");
  platform = "web";
  // KEY = `bili_fav_${src_media_id}`;
  // ! ------参数-------------------------------------
}

// 新建收藏夹
async function newFolderReques(folderName, csrfToken, privacy = 0) {
  //  https://api.bilibili.com/x/v3/fav/folder/add
  // title:test
  // intro
  // privacy:0
  // cover
  // csrf:44178b024a13ba2b86d499dbf2a89d3b
  // 1. 准备请求参数
  const requestParams = new URLSearchParams();
  requestParams.append("title", folderName);
  requestParams.append("intro", "");
  requestParams.append("privacy", privacy.toString());
  requestParams.append("cover", "");
  requestParams.append("csrf", csrfToken);

  try {
    const res = await fetch(`https://api.bilibili.com/x/v3/fav/folder/add`, {
      credentials: "include",
      method: "POST",
      body: requestParams,
    });
    add = await res.json();
    await postMessage(`一个名为#${folderName}#的收藏夹创建成功`);
    return add;
  } catch (error) {
    await postErrorMessage("添加收藏夹失败", error);
    console.error("添加收藏夹失败:", error);
    throw error;
  }
}

// console.log(mid);
// console.log(csrf);
// console.log(tar_media_id);
// console.log(src_media_id);
// resources=114092434004434:2,114092484336222:2&
// src_media_id=2267405711&
// tar_media_id=2546233407&m
// id=289254911&
// platform=web
// &csrf=44178b024a13ba2b86d499dbf2a89d3b

// 289254911
// favlist.js:30 44178b024a13ba2b86d499dbf2a89d3b
// favlist.js:31 1493259707
// favlist.js:32 2267405711
async function fetchAllPages(fids) {
  let page = 1;
  let allData = [];
  let pageData = [];

  while (true) {
    try {
      const res = await fetch(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${fids}&pn=${page}&ps=40&keyword=&order=mtime&type=0&tid=0&platform=web&web_location=333.1387`
      );
      const { data } = await res.json();
      const medias = data.medias || [];
      pageData.push({
        pageNumber: page,
        items: medias,
      });
      allData = allData.concat(medias);

      if (!data.has_more) break;
      page++;
    } catch (error) {
      await postErrorMessage("请求失败", error);
      console.error("请求失败:", error);
      break;
    }
  }

  return {
    data: allData,
    pages: pageData,
  };
}

function getFavData(source) {
  if (!source) return null;
  return typeof source === "object" ? source : null;
}

/**
 * 读取收藏数据，保留复制所需的最小字段
 * @param {string} mediaId 收藏夹ID
 * @param {number} [cacheHours=24] 缓存有效期(小时)
 */

async function saveFavData(mediaId, cacheHours = 24) {
  if (!mediaId) {
    console.warn("当前URL未找到fid参数");
    return;
  }

  try {
    const resources = await fetchAllPages(mediaId);
    const storageData = {
      timestamp: Date.now(),
      expires: Date.now() + cacheHours * 60 * 60 * 1000,
      data: resources.data.map(({ id, type }) => ({ id, type })),
      pages: resources.pages.map(({ pageNumber, items }) => ({
        pageNumber,
        items: items.map(({ id, type }) => ({ id, type })),
      })),
    };

    console.log("收藏数据读取成功:", {
      mediaId,
      count: storageData.data.length,
      expires: new Date(storageData.expires).toLocaleString(),
    });
    return storageData;
  } catch (error) {
    await postErrorMessage("保存数据失败", error);
    console.error("保存数据失败:", error);
  }
}

async function copy_data(key, src_media_id, tar_media_id, mid, csrf) {
  // 1. 获取源收藏夹数据
  const FavData = getFavData(key);
  if (!FavData || !FavData.data || FavData.data.length === 0) {
    logAndPostError("没有可导出的收藏数据");
    return;
  }

  // 3. 按哔哩哔哩收藏夹网页的实际分页倒序处理，并按页内项目倒序复制
  const batches = FavData.pages || [
    {
      pageNumber: 1,
      items: FavData.data,
    },
  ];

  const sumBatch = batches.length;
  for (let i = batches.length - 1; i >= 0; i--) {
    const { pageNumber, items } = batches[i];
    const batch = [...items].reverse();
    // 构造resources参数
    const resources = batch.map((item) => `${item.id}:${item.type}`).join(",");

    await postMessage(
      `正在倒序处理第 ${pageNumber} / ${sumBatch}页，当前页共 ${
        batch.length
      } 个项目`
    );

    // 4. 执行复制操作
    try {
      const result = await copyFavResources(
        resources,
        src_media_id,
        tar_media_id,
        mid,
        csrf,
        "web"
      );

      await postMessage(`第${pageNumber}页处理成功`);
      // 添加延迟防止请求过快
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      await postMessage(`第${pageNumber}页处理失败`);
    }
  }
  console.log("所有项目处理完成");
  await postMessage(`已复制到目标文件夹`);
}

/**
在哔哩哔哩收藏夹之间复制资源
@param {string} resources - 资源ID，格式为"id:type"（例如："114092434004434:2"）
@param {string} srcMediaId - 源收藏夹ID
@param {string} tarMediaId - 目标收藏夹ID
@param {string} mid - 用户ID
@param {string} csrf - CSRF令牌（bili_jct cookie的值）
@param {string} [platform='web'] - 平台标识符
@returns {Promise<Object>} API响应
*/
async function copyFavResources(
  resources,
  srcMediaId,
  tarMediaId,
  mid,
  csrf,
  platform = "web"
) {
  // console.log(resources, srcMediaId, tarMediaId, mid, csrf);
  const apiUrl = "https://api.bilibili.com/x/v3/fav/resource/copy";
  const referer = `https://space.bilibili.com/${mid}/favlist?fid=${srcMediaId}&ftype=create`;

  const params = new URLSearchParams();
  params.append("resources", resources);
  params.append("src_media_id", srcMediaId);
  params.append("tar_media_id", tarMediaId);
  params.append("mid", mid);
  params.append("platform", platform);
  params.append("csrf", csrf);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: referer,
      },
      body: params,
      credentials: "include",
    });
    const result = await response.json();
    console.log(result);
    if (result.code !== 0) {
      throw new Error(`API Error: ${result.message} (code: ${result.code})`);
    }
    return result;
  } catch (error) {
    await postErrorMessage("Failed to copy resources", error);
    console.error("Failed to copy resources:", error);
    throw error;
  }
}

/**
 *
 * @param {int} mid 插件用户的mid
 * @returns {Promise<Object>} API响应 [] 列表
 */

// 获取用户创建的所有收藏夹
async function myFavoriteLists(mid) {
  try {
    const res = await fetch(
      `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${mid}&web_location=333.1387`,
      {
        credentials: "include",
        headers: {
          Referer: `https://space.bilibili.com/${mid}/`,
        },
      }
    );
    list_alls = await res.json();
    console.log(list_alls);
    return list_alls.data.list;
  } catch (error) {
    await postErrorMessage("获取收藏夹失败", error);
    console.error("获取收藏夹失败:", error);
    throw error;
  }
}

// 推送消息
async function postMessage(content) {
  messagesContainer = this.document.querySelector(".message_list");
  if (!messagesContainer) {
    console.error("消息列表容器未找到");
    return;
  }

  const styledContent = content.replace(
    /#([^#]+)#/g,
    '<span class="highlight">$1</span>'
  );
  const messageElement = document.createElement("div");
  messageElement.className = "message-item";
  messageElement.innerHTML = styledContent;

  messagesContainer.appendChild(messageElement);
  // 自动滚动到底部
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
