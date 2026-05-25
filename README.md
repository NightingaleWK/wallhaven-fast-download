# wallhaven-fast-download

Wallhaven 快速下载脚本：在列表页悬停壁纸卡片时快速预览，一键下载原图，并在下载后尝试自动标记为已看。

## 功能

- **悬停快速预览**：鼠标移到壁纸卡片上，先立即显示当前卡片缩略图，再在后台加载原图并自动替换。
- **加载状态提示**：缩略图阶段会显示轻量角标，提示正在加载原图，避免误以为已经是最终清晰度。
- **一键下载**：点击 ↓ 按钮通过 `GM_download` 下载原图。
- **下载标记已看**：下载成功后后台模拟访问详情页，Wallhaven 自动标记为已看，避免重复下载。
- **API 优先，回退规则**：优先通过 Wallpaper API 获取原图地址，失败时回退到公开 CDN 路径规则。
- **请求结果缓存**：同一张壁纸的原图地址解析结果会在当前页面内复用，减少重复 API 请求。
- **无外部依赖**：纯原生 JS，不依赖 jQuery 或其他库。

## 安装

使用 Tampermonkey、Violentmonkey 等用户脚本管理器安装 `main.js`。

脚本匹配范围：

```text
https://wallhaven.cc/*
```

## 使用方式

1. 打开 Wallhaven 列表页，例如首页、搜索页或标签页。
2. 将鼠标移到壁纸卡片上，脚本会显示快速预览。
3. 预览刚出现时可能先显示缩略图；左上角角标存在时，表示原图仍在加载。
4. 点击卡片左上角的 ↓ 按钮下载原图。

## 实现说明

脚本使用原生 DOM API、`MutationObserver`、`GM_xmlhttpRequest`、Wallpaper API 和 `GM_download`。主要流程如下：

- 通过 `MutationObserver` 监听列表页卡片变化，并为壁纸卡片注入工具按钮。
- 悬停卡片时立即用页面已有缩略图创建预览层，避免等待原图网络请求。
- 后台解析原图地址并加载原图；加载完成后替换缩略图预览。
- 下载成功后创建隐藏 iframe 访问详情页，借助 Wallhaven 页面行为尝试触发已看标记。

## 本地检查

本项目没有构建步骤。修改脚本后至少运行：

```sh
node --check main.js
node tests/preview-behavior.test.js
```

`node --check` 只检查 JavaScript 语法，不会验证浏览器环境、用户脚本 API 或 Wallhaven 页面行为。涉及交互变化时，还需要在 Tampermonkey 或 Violentmonkey 中手动验证。

## 许可证

MIT
