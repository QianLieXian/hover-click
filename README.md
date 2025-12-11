# Hover Click

[English](#english) | [中文](#中文)

---

## 中文

一个浏览器插件，鼠标悬停5秒自动点击。适合全屏游戏时操作副屏浏览器，不会让游戏跳出。

### 为什么做这个

玩CS全屏时，想点副屏浏览器的东西，一点就跳回桌面。所以做了这个插件：鼠标移过去停5秒，自动帮你点，游戏不会跳出。

### 功能

- **悬停自动点击**：鼠标不动5秒，自动点击当前位置
- **可拖动悬浮球**：右下角有个小按钮，可以拖到任意位置
- **快捷操作**：鼠标移到悬浮球上展开菜单，有返回、关闭、切换标签页等功能
- **可调节延迟**：点击浏览器工具栏的插件图标，可以调整延迟时间（2-10秒）
- **暂停功能**：单击悬浮球可以暂停/恢复自动点击

### 安装

1. 打开 Chrome 浏览器，输入 `chrome://extensions/`
2. 打开右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"，选择 `extension` 文件夹
4. 完成

### 使用

1. 打开任意网页，右下角会出现一个白色小方块（悬浮球）
2. 把鼠标移到想点击的地方，停住不动
3. 会出现一个圆形进度条，5秒后自动点击
4. 鼠标移到悬浮球上可以展开快捷菜单

### 设置

点击浏览器工具栏的插件图标，可以：
- 开关插件
- 显示/隐藏悬浮球
- 调整点击延迟（2-10秒）
- 恢复默认设置

### 文件结构

```
extension/
├── manifest.json    # 插件配置
├── background.js    # 后台脚本（处理标签页操作）
├── content.js       # 内容脚本（自动点击逻辑）
├── content.css      # 样式
├── popup.html       # 设置界面
├── popup.css        # 设置界面样式
└── popup.js         # 设置界面逻辑
```

### 注意事项

- 只在网页内生效，不会影响浏览器UI或其他程序
- 鼠标移动超过6像素会重置计时
- 在 `chrome://` 开头的页面不生效（浏览器限制）

---

## English

A browser extension that auto-clicks after hovering for 5 seconds. Perfect for operating a second monitor's browser while gaming in fullscreen.

### Why I Made This

When playing CS in fullscreen, clicking anything on the second monitor makes the game minimize. So I made this: hover your mouse for 5 seconds, it clicks automatically, and the game stays fullscreen.

### Features

- **Hover Auto-Click**: Automatically clicks after 5 seconds of hovering
- **Draggable Float Button**: A small button in the bottom-right corner, draggable anywhere
- **Quick Actions**: Hover over the button to expand menu with back, close, and tab switching
- **Adjustable Delay**: Click the extension icon to adjust delay (2-10 seconds)
- **Pause Function**: Click the float button to pause/resume auto-clicking

### Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `extension` folder
4. Done

### Usage

1. Open any webpage, a white square button appears in the bottom-right
2. Move your mouse to where you want to click and hold still
3. A circular progress indicator appears, clicks after 5 seconds
4. Hover over the float button to expand the quick menu

### Settings

Click the extension icon in the toolbar to:
- Toggle extension on/off
- Show/hide float button
- Adjust click delay (2-10 seconds)
- Reset to defaults

### File Structure

```
extension/
├── manifest.json    # Extension config
├── background.js    # Background script (tab operations)
├── content.js       # Content script (auto-click logic)
├── content.css      # Styles
├── popup.html       # Settings UI
├── popup.css        # Settings UI styles
└── popup.js         # Settings UI logic
```

### Notes

- Only works within webpages, won't affect browser UI or other programs
- Moving mouse more than 6 pixels resets the timer
- Doesn't work on `chrome://` pages (browser restriction)

