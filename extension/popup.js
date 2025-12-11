(() => {
  const STORAGE_KEYS = {
    SETTINGS: "dwellControlSettings",
  };
  const DEFAULT_SETTINGS = {
    enabled: true,
    dwellDelay: 5000,
    showPanel: true,
  };

  const ui = {};
  let currentSettings = { ...DEFAULT_SETTINGS };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    await refreshSettings();
    render();
  }

  function cacheElements() {
    ui.enabledCheckbox = document.getElementById("toggle-enabled");
    ui.panelCheckbox = document.getElementById("toggle-panel");
    ui.delaySlider = document.getElementById("delay-slider");
    ui.delayInput = document.getElementById("delay-input");
    ui.statusPill = document.getElementById("status-pill");
    ui.quickToggleButton = document.getElementById("quick-toggle");
    ui.resetButton = document.getElementById("reset-defaults");
  }

  function bindEvents() {
    ui.enabledCheckbox?.addEventListener("change", () => saveSettings({ enabled: ui.enabledCheckbox.checked }));
    ui.panelCheckbox?.addEventListener("change", () => saveSettings({ showPanel: ui.panelCheckbox.checked }));

    ui.delaySlider?.addEventListener("input", () => {
      syncDelayInputs(parseInt(ui.delaySlider.value, 10));
    });

    ui.delaySlider?.addEventListener("change", () => {
      saveSettings({ dwellDelay: clampDelay(parseInt(ui.delaySlider.value, 10)) });
    });

    ui.delayInput?.addEventListener("change", () => {
      const value = clampDelay(parseInt(ui.delayInput.value, 10));
      syncDelayInputs(value);
      saveSettings({ dwellDelay: value });
    });

    ui.quickToggleButton?.addEventListener("click", () => {
      saveSettings({ enabled: !currentSettings.enabled });
    });

    ui.resetButton?.addEventListener("click", () => {
      saveSettings({ ...DEFAULT_SETTINGS });
    });
  }

  async function refreshSettings() {
    const stored = await storageGet([STORAGE_KEYS.SETTINGS]);
    currentSettings = sanitizeSettings(stored?.[STORAGE_KEYS.SETTINGS]);
  }

  function sanitizeSettings(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
      dwellDelay: clampDelay(candidate.dwellDelay ?? DEFAULT_SETTINGS.dwellDelay),
      showPanel: typeof candidate.showPanel === "boolean" ? candidate.showPanel : true,
    };
  }

  function render() {
    ui.enabledCheckbox.checked = currentSettings.enabled;
    ui.panelCheckbox.checked = currentSettings.showPanel;
    syncDelayInputs(currentSettings.dwellDelay);
    updateStatus();
  }

  function syncDelayInputs(value) {
    if (!Number.isFinite(value)) {
      value = DEFAULT_SETTINGS.dwellDelay;
    }
    ui.delaySlider.value = value;
    ui.delayInput.value = value;
  }

  function updateStatus() {
    if (!ui.statusPill) return;
    if (currentSettings.enabled) {
      ui.statusPill.textContent = "运行中";
      ui.statusPill.classList.remove("paused");
      ui.quickToggleButton.textContent = "关闭插件";
    } else {
      ui.statusPill.textContent = "已暂停";
      ui.statusPill.classList.add("paused");
      ui.quickToggleButton.textContent = "重新开启插件";
    }
  }

  function clampDelay(value) {
    const min = 2000;
    const max = 10000;
    if (!Number.isFinite(value)) {
      return DEFAULT_SETTINGS.dwellDelay;
    }
    return Math.min(max, Math.max(min, value));
  }

  async function saveSettings(partial) {
    currentSettings = sanitizeSettings({ ...currentSettings, ...partial });
    render();
    await storageSet({ [STORAGE_KEYS.SETTINGS]: currentSettings });
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (!chrome?.storage?.local?.get) {
        resolve({});
        return;
      }
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn("读取设置失败", chrome.runtime.lastError.message);
          resolve({});
          return;
        }
        resolve(result || {});
      });
    });
  }

  function storageSet(data) {
    return new Promise((resolve) => {
      if (!chrome?.storage?.local?.set) {
        resolve();
        return;
      }
      chrome.storage.local.set(data, () => {
        if (chrome.runtime?.lastError) {
          console.warn("保存设置失败", chrome.runtime.lastError.message);
        }
        resolve();
      });
    });
  }
})();
