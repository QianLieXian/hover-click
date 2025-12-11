(() => {
  if (window.__DWELL_CONTROL_ASSISTANT__) {
    return;
  }
  window.__DWELL_CONTROL_ASSISTANT__ = true;

  const MOVE_RESET_THRESHOLD_PX = 6;
  const MESSAGE_TYPE = "DWELL_CONTROL_ACTION";
  const ALLOWED_POINTER_TYPES = new Set(["", "mouse", "pen", undefined]);
  const STORAGE_KEYS = {
    SETTINGS: "dwellControlSettings",
    PANEL_POSITION: "dwellControlPanelPosition",
  };
  const DEFAULT_SETTINGS = {
    enabled: true,
    dwellDelay: 5000,
    showPanel: true,
  };
  const PANEL_MARGIN = 12;

  const pointerState = {
    anchorX: null,
    anchorY: null,
    lastX: null,
    lastY: null,
    timerId: null,
    autoClickArmed: false,
  };

  let settings = { ...DEFAULT_SETTINGS };
  let panelPosition = null;

  let progressIndicator;
  let panel;
  let quickActionsRow;
  let handleElement;

  const panelDragState = {
    pointerId: null,
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  };

  const readyPromise = new Promise((resolve) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    } else {
      resolve();
    }
  });

  readyPromise
    .then(initialize)
    .catch((error) => console.error("Dwell Control Assistant 初始化失败", error));

  async function initialize() {
    await hydrateSettings();
    progressIndicator = createProgressIndicator();
    panel = createControlPanel();
    quickActionsRow = panel?.querySelector(".quick-actions") ?? null;
    handleElement = panel?.querySelector(".panel-handle") ?? null;
    setupPanelInteractions(panel);
    applyPanelPosition();
    applySettingsState();
    updatePanelOrientation();

    initPointerTracking();
    observeStorageChanges();
    window.addEventListener("resize", handleViewportResize, { passive: true });
  }

  async function hydrateSettings() {
    try {
      const stored = await storageGet([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.PANEL_POSITION]);
      settings = sanitizeSettings(stored?.[STORAGE_KEYS.SETTINGS]);
      panelPosition = sanitizePanelPosition(stored?.[STORAGE_KEYS.PANEL_POSITION]);
    } catch (error) {
      console.warn("Dwell Control: 读取设置失败，使用默认值", error);
      settings = { ...DEFAULT_SETTINGS };
      panelPosition = null;
    }
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

  function sanitizePanelPosition(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }
    const x = Number(candidate.x);
    const y = Number(candidate.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    return { x, y };
  }

  function clampDelay(value) {
    const min = 2000;
    const max = 10000;
    if (!Number.isFinite(value)) {
      return DEFAULT_SETTINGS.dwellDelay;
    }
    return Math.min(max, Math.max(min, value));
  }

  function initPointerTracking() {
    document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: true });
    document.addEventListener(
      "pointerdown",
      () => {
        cancelPendingAutoClick(true);
      },
      true
    );
    document.addEventListener(
      "wheel",
      () => {
        cancelPendingAutoClick(true);
      },
      { passive: true, capture: true }
    );
    document.addEventListener(
      "touchstart",
      () => {
        cancelPendingAutoClick(true);
      },
      { passive: true, capture: true }
    );
    window.addEventListener("blur", () => cancelPendingAutoClick(true));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelPendingAutoClick(true);
      }
    });
    document.documentElement.addEventListener(
      "mouseleave",
      (event) => {
        if (!event.relatedTarget) {
          cancelPendingAutoClick(true);
        }
      },
      { capture: true }
    );
  }

  function handlePointerMove(event) {
    if (event.pointerType && !ALLOWED_POINTER_TYPES.has(event.pointerType)) {
      return;
    }

    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;

    if (!settings.enabled) {
      cancelPendingAutoClick(true);
      pointerState.anchorX = null;
      pointerState.anchorY = null;
      return;
    }

    const target = event.target;
    const isOnProgressIndicator = target === progressIndicator || target?.id === "dwell-progress-indicator";
    if (isOnProgressIndicator) {
      cancelPendingAutoClick(true);
      pointerState.anchorX = null;
      pointerState.anchorY = null;
      return;
    }

    const quickAction = target?.closest?.(".quick-action");
    const isOnControlPanel = target?.closest?.("#dwell-control-panel");
    if (isOnControlPanel && !quickAction) {
      cancelPendingAutoClick(true);
      pointerState.anchorX = null;
      pointerState.anchorY = null;
      return;
    }

    if (pointerState.autoClickArmed) {
      positionProgressIndicator(event.clientX, event.clientY);
    }

    if (pointerState.anchorX === null || pointerState.anchorY === null) {
      pointerState.anchorX = event.clientX;
      pointerState.anchorY = event.clientY;
      rearmAutoClick();
      return;
    }

    const distanceFromAnchor = Math.hypot(
      event.clientX - pointerState.anchorX,
      event.clientY - pointerState.anchorY
    );

    if (distanceFromAnchor > MOVE_RESET_THRESHOLD_PX) {
      pointerState.anchorX = event.clientX;
      pointerState.anchorY = event.clientY;
      rearmAutoClick();
    }
  }

  function rearmAutoClick() {
    if (!settings.enabled) {
      cancelPendingAutoClick(true);
      return;
    }

    if (typeof pointerState.lastX !== "number" || typeof pointerState.lastY !== "number") {
      return;
    }

    pointerState.autoClickArmed = true;
    clearTimeout(pointerState.timerId);
    pointerState.timerId = window.setTimeout(triggerAutoClick, getDwellDelay());
    showProgressIndicator(pointerState.lastX, pointerState.lastY);
  }

  function cancelPendingAutoClick(hideIndicator) {
    pointerState.autoClickArmed = false;
    clearTimeout(pointerState.timerId);
    pointerState.timerId = null;
    if (hideIndicator) {
      hideProgressIndicator();
    }
  }

  function triggerAutoClick() {
    if (!pointerState.autoClickArmed || !settings.enabled) {
      return;
    }

    pointerState.autoClickArmed = false;
    hideProgressIndicator();

    const x = pointerState.lastX ?? 0;
    const y = pointerState.lastY ?? 0;

    const wasVisible = progressIndicator?.classList.contains("visible");
    if (progressIndicator) {
      progressIndicator.style.display = "none";
    }

    const target = document.elementFromPoint(x, y);

    if (progressIndicator) {
      progressIndicator.style.display = "";
      if (wasVisible) {
        progressIndicator.classList.add("visible");
      }
    }

    if (!target || target === progressIndicator) {
      return;
    }

    const isQuickAction = target.closest?.(".quick-action");
    const isOnControlPanel = target.closest?.("#dwell-control-panel");
    if (isOnControlPanel && !isQuickAction) {
      return;
    }

    showClickPulse(x, y);
    dispatchSyntheticClick(target, x, y);
  }

  function dispatchSyntheticClick(target, clientX, clientY) {
    const commonOptions = {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 0,
      buttons: 1,
      view: window,
    };

    try {
      const pointerDown = new PointerEvent("pointerdown", {
        ...commonOptions,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      });
      target.dispatchEvent(pointerDown);
    } catch (error) {
      /* ���� PointerEvent ��֧�� */
    }

    target.dispatchEvent(new MouseEvent("mousedown", { ...commonOptions, detail: 1 }));

    try {
      const pointerUp = new PointerEvent("pointerup", {
        ...commonOptions,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      });
      target.dispatchEvent(pointerUp);
    } catch (error) {
      /* ���� PointerEvent ��֧�� */
    }

    target.dispatchEvent(new MouseEvent("mouseup", { ...commonOptions, detail: 1 }));
    target.dispatchEvent(new MouseEvent("click", { ...commonOptions, detail: 1 }));
  }

  function createProgressIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "dwell-progress-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.style.setProperty("--dwell-duration", `${getDwellDelay()}ms`);
    (document.body || document.documentElement)?.appendChild(indicator);
    return indicator;
  }

  function positionProgressIndicator(x, y) {
    if (!progressIndicator) return;
    progressIndicator.style.left = `${x}px`;
    progressIndicator.style.top = `${y}px`;
  }

  function showProgressIndicator(x = pointerState.lastX, y = pointerState.lastY) {
    if (!progressIndicator || !settings.enabled) return;
    progressIndicator.style.setProperty("--dwell-duration", `${getDwellDelay()}ms`);
    if (typeof x === "number" && typeof y === "number") {
      positionProgressIndicator(x, y);
    }
    progressIndicator.classList.remove("counting");
    void progressIndicator.offsetWidth;
    progressIndicator.classList.add("visible", "counting");
  }

  function hideProgressIndicator() {
    progressIndicator?.classList.remove("visible", "counting");
  }

  function showClickPulse(x, y) {
    const pulse = document.createElement("span");
    pulse.className = "dwell-click-pulse";
    pulse.style.left = `${x}px`;
    pulse.style.top = `${y}px`;
    (document.body || document.documentElement)?.appendChild(pulse);
    window.setTimeout(() => pulse.remove(), 480);
  }

  function createControlPanel() {
    const container = document.createElement("div");
    container.id = "dwell-control-panel";
    container.className = "collapsed drawer-left";
    container.innerHTML = `
      <div class="panel-shell">
        <div class="panel-handle" role="button" aria-label="快捷控制">
          <span class="handle-dot"></span>
          <span class="handle-label">快捷操作</span>
        </div>
        <div class="quick-actions" aria-hidden="true">
          ${createButtonMarkup("back", "&#x21a9;", "返回")}
          ${createButtonMarkup("closeTab", "&#x2715;", "关闭")}
          ${createButtonMarkup("prevTab", "&#x2190;", "上一页签")}
          ${createButtonMarkup("nextTab", "&#x2192;", "下一页签")}
        </div>
      </div>
    `;
    (document.body || document.documentElement)?.appendChild(container);
    return container;
  }

  function createButtonMarkup(action, icon, label) {
    return `
      <button class="quick-action" type="button" data-dwell-action="${action}">
        <span class="icon" aria-hidden="true">${icon}</span>
        <span class="label">${label}</span>
      </button>
    `;
  }

  function setupPanelInteractions(container) {
    if (!container) return;
    const shell = container.querySelector(".panel-shell");
    quickActionsRow = container.querySelector(".quick-actions");
    handleElement = container.querySelector(".panel-handle");
    let collapseTimer;

    const openPanel = () => {
      clearTimeout(collapseTimer);
      container.classList.add("expanded");
      container.classList.remove("collapsed");
      quickActionsRow?.setAttribute("aria-hidden", "false");
    };

    const closePanel = () => {
      clearTimeout(collapseTimer);
      container.classList.add("collapsed");
      container.classList.remove("expanded");
      quickActionsRow?.setAttribute("aria-hidden", "true");
    };

    shell?.addEventListener(
      "pointerenter",
      () => {
        if (!settings.showPanel) return;
        openPanel();
      },
      { passive: true }
    );

    shell?.addEventListener(
      "pointerleave",
      () => {
        clearTimeout(collapseTimer);
        collapseTimer = window.setTimeout(closePanel, 420);
      },
      { passive: true }
    );

    container.addEventListener(
      "pointerdown",
      (event) => {
        if (!event.isTrusted) {
          return;
        }
        if (!event.target.closest(".quick-action")) {
          cancelPendingAutoClick(true);
        }
      },
      true
    );

    container.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-dwell-action]");
      if (!button) {
        return;
      }
      event.preventDefault();
      triggerPanelAction(button.getAttribute("data-dwell-action"), button);
    });

    handleElement?.addEventListener("pointerdown", onHandlePointerDown);
    handleElement?.addEventListener("pointermove", onHandlePointerMove);
    handleElement?.addEventListener("pointerup", onHandlePointerUp);
    handleElement?.addEventListener("pointercancel", onHandlePointerCancel);
  }

  function onHandlePointerDown(event) {
    if (event.button !== 0 && event.pointerType !== "touch") {
      return;
    }
    event.preventDefault();
    panelDragState.active = true;
    panelDragState.moved = false;
    panelDragState.pointerId = event.pointerId;
    panelDragState.startX = event.clientX;
    panelDragState.startY = event.clientY;
    const rect = panel?.getBoundingClientRect();
    panelDragState.offsetX = event.clientX - (rect?.left ?? 0);
    panelDragState.offsetY = event.clientY - (rect?.top ?? 0);
    handleElement?.setPointerCapture?.(event.pointerId);
    panel?.classList.add("dragging");
  }

  function onHandlePointerMove(event) {
    if (!panelDragState.active || event.pointerId !== panelDragState.pointerId) {
      return;
    }
    const moveDistance = Math.hypot(event.clientX - panelDragState.startX, event.clientY - panelDragState.startY);
    if (moveDistance > 3) {
      panelDragState.moved = true;
    }
    if (!panelDragState.moved) {
      return;
    }
    movePanelTo(event.clientX - panelDragState.offsetX, event.clientY - panelDragState.offsetY);
  }

  function onHandlePointerUp(event) {
    if (!panelDragState.active || event.pointerId !== panelDragState.pointerId) {
      return;
    }
    handleElement?.releasePointerCapture?.(event.pointerId);
    panelDragState.active = false;
    panel?.classList.remove("dragging");
    if (panelDragState.moved) {
      savePanelPosition(panelPosition);
    } else {
      toggleEnabledFromHandle();
    }
  }

  function onHandlePointerCancel(event) {
    if (!panelDragState.active || event.pointerId !== panelDragState.pointerId) {
      return;
    }
    handleElement?.releasePointerCapture?.(event.pointerId);
    panelDragState.active = false;
    panel?.classList.remove("dragging");
  }

  function movePanelTo(x, y) {
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const width = rect.width;
    const height = rect.height;

    // 确保面板不会超出视口边界
    const maxX = viewportWidth - width - PANEL_MARGIN;
    const maxY = viewportHeight - height - PANEL_MARGIN;
    const clampedX = Math.min(Math.max(PANEL_MARGIN, x), Math.max(PANEL_MARGIN, maxX));
    const clampedY = Math.min(Math.max(PANEL_MARGIN, y), Math.max(PANEL_MARGIN, maxY));

    panelPosition = { x: Math.round(clampedX), y: Math.round(clampedY) };
    applyPanelPosition();
    updatePanelOrientation();
  }

  function applyPanelPosition() {
    if (!panel) return;
    if (panelPosition) {
      panel.style.left = `${panelPosition.x}px`;
      panel.style.top = `${panelPosition.y}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    } else {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "";
      panel.style.bottom = "";
    }
  }

  function clampPanelPositionToViewport() {
    if (!panel || !panelPosition) {
      return;
    }
    movePanelTo(panelPosition.x, panelPosition.y);
    savePanelPosition(panelPosition);
  }

  function savePanelPosition(position) {
    storageSet({ [STORAGE_KEYS.PANEL_POSITION]: position || null });
  }

  function toggleEnabledFromHandle() {
    updateSettings({ enabled: !settings.enabled });
  }

  function updateSettings(partial, options = {}) {
    const next = sanitizeSettings({ ...settings, ...partial });
    const changed = JSON.stringify(next) !== JSON.stringify(settings);
    settings = next;
    applySettingsState();
    if (options.persist === false || !changed) {
      return;
    }
    storageSet({ [STORAGE_KEYS.SETTINGS]: next });
  }

  function applySettingsState() {
    if (!settings.enabled) {
      cancelPendingAutoClick(true);
      pointerState.anchorX = null;
      pointerState.anchorY = null;
    } else if (pointerState.autoClickArmed) {
      rearmAutoClick();
    }
    updatePanelVisibility();
    updatePanelPauseVisuals();
    progressIndicator?.style.setProperty("--dwell-duration", `${getDwellDelay()}ms`);
  }

  function updatePanelVisibility() {
    if (!panel) return;
    const shouldHide = !settings.showPanel;
    panel.classList.toggle("panel-hidden", shouldHide);
    if (shouldHide) {
      panel.classList.remove("expanded");
      panel.classList.add("collapsed");
      quickActionsRow?.setAttribute("aria-hidden", "true");
    }
    panel.setAttribute("aria-hidden", shouldHide ? "true" : "false");
  }

  function updatePanelPauseVisuals() {
    if (!panel) return;
    panel.classList.toggle("paused", !settings.enabled);
    const label = panel.querySelector(".handle-label");
    if (label) {
      label.textContent = settings.enabled ? "快捷操作" : "已暂停";
    }
  }

  function updatePanelOrientation() {
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    if (spaceRight >= spaceLeft) {
      panel.classList.add("drawer-right");
      panel.classList.remove("drawer-left");
    } else {
      panel.classList.add("drawer-left");
      panel.classList.remove("drawer-right");
    }
  }

  function handleViewportResize() {
    clampPanelPositionToViewport();
    updatePanelOrientation();
  }

  function triggerPanelAction(action, button) {
    if (!action) {
      return;
    }

    button?.classList.add("triggered");
    window.setTimeout(() => button?.classList.remove("triggered"), 420);

    if (action === "back") {
      safeGoBack();
      return;
    }

    if (!chrome?.runtime?.sendMessage) {
      console.warn("Chrome runtime API 不可用，无法执行标签页操作");
      return;
    }

    chrome.runtime.sendMessage({ type: MESSAGE_TYPE, action }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.warn("快捷操作失败", err.message);
        return;
      }
      if (response && response.ok === false) {
        console.warn("快捷操作失败", response.error);
      }
    });
  }

  function observeStorageChanges() {
    if (!chrome?.storage?.onChanged) {
      return;
    }
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (changes[STORAGE_KEYS.SETTINGS]) {
        settings = sanitizeSettings(changes[STORAGE_KEYS.SETTINGS].newValue);
        applySettingsState();
      }
      if (changes[STORAGE_KEYS.PANEL_POSITION]) {
        panelPosition = sanitizePanelPosition(changes[STORAGE_KEYS.PANEL_POSITION].newValue);
        applyPanelPosition();
        updatePanelOrientation();
      }
    });
  }

  function getDwellDelay() {
    return clampDelay(settings.dwellDelay);
  }

  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      if (!chrome?.storage?.local?.get) {
        resolve({});
        return;
      }
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime?.lastError) {
          reject(chrome.runtime.lastError);
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

  function safeGoBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else if (document.referrer) {
      window.location.href = document.referrer;
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
})();
