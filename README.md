# wallhaven-fast-download

Wallhaven 快速下载脚本 —— 悬停自动预览原图，一键下载，自动标记已看。

## 功能

- **悬停自动预览**：鼠标移到壁纸卡片上，自动弹出原图预览窗口，逐行渐进渲染，移出即关。
- **一键下载**：点击 ↓ 按钮通过 `GM_download` 下载原图。
- **下载标记已看**：下载成功后后台模拟访问详情页，Wallhaven 自动标记为已看，避免重复下载。
- **预览渐进渲染**：图片边传输边显示，不等完整下载。
- **API 优先，回退规则**：优先通过 Wallpaper API 获取原图地址，失败时回退到公开 CDN 规则。
- **无外部依赖**：纯原生 JS，不依赖 jQuery 或其他库。

## 安装

使用 Tampermonkey、Violentmonkey 等用户脚本管理器安装 `main.js`。

脚本匹配范围：

```text
https://wallhaven.cc/*
```

## 实现说明

本项目代码全部由 AI 辅助编写（ChatGPT 5.5 + Claude），人工调整优化。脚本使用原生 DOM API、`MutationObserver`、`GM_xmlhttpRequest`、Wallpaper API、`GM_download`，并实现悬停工具按钮、卡片内渐进预览层、防抖 hover 触发和 iframe 后台 seen 标记机制。

## 许可证

MIT
