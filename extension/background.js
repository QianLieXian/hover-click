const MESSAGE_TYPE = "DWELL_CONTROL_ACTION";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== MESSAGE_TYPE) {
    return false;
  }

  handleAction(message.action, sender)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || "Unexpected error" }));

  return true;
});

async function handleAction(action, sender) {
  const tabId = sender?.tab?.id;
  if (!tabId) {
    throw new Error("无法定位当前标签页");
  }

  switch (action) {
    case "closeTab":
      await callChrome(chrome.tabs.remove, tabId);
      return;
    case "prevTab":
      await activateRelativeTab(tabId, -1);
      return;
    case "nextTab":
      await activateRelativeTab(tabId, 1);
      return;
    default:
      throw new Error(`未知的操作: ${action}`);
  }
}

async function activateRelativeTab(currentTabId, offset) {
  const tabs = await callChrome(chrome.tabs.query, { currentWindow: true });
  if (!tabs.length) {
    throw new Error("当前窗口没有标签页");
  }

  const sorted = tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const activeIndex = sorted.findIndex((tab) => tab.id === currentTabId);
  if (activeIndex === -1) {
    throw new Error("找不到当前标签页");
  }

  const targetIndex = (activeIndex + offset + sorted.length) % sorted.length;
  const targetTab = sorted[targetIndex];
  if (!targetTab?.id) {
    throw new Error("无法切换到目标标签页");
  }

  await callChrome(chrome.tabs.update, targetTab.id, { active: true });
}

function callChrome(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

