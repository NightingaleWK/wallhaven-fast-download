# wallhaven-fast-download

wallhaven-fast-download 是一个用于 Wallhaven 网格浏览页的用户脚本。它会在鼠标悬停到壁纸卡片时显示下载和快速预览按钮，解析原图地址，并通过用户脚本管理器下载文件。

## 功能

- 在 Wallhaven 列表/网格页为壁纸卡片添加悬停下载按钮。
- 在下载按钮右侧添加轻量快速预览按钮，原地查看按缩略图宽度 120% 显示的原图预览。
- 优先通过 Wallhaven wallpaper API 获取原图地址。
- API 请求失败时，回退到 Wallhaven 公开原图 URL 规则。
- 使用 `GM_download` 下载文件，不手动创建 Blob URL。
- 不依赖 jQuery，不加载外部运行时代码。
- 下载或预览失败时显示简短错误提示。

## 安装

使用 Tampermonkey、Violentmonkey 等用户脚本管理器安装 `main.js`。

脚本匹配范围：

```text
https://wallhaven.cc/*
```

## 实现说明

本项目代码全部由 ChatGPT 5.5 编写。脚本使用原生 DOM API、`MutationObserver`、`GM_xmlhttpRequest`、Wallhaven API 解析、`GM_download`，并实现悬停工具按钮组、卡片内快速预览层和 toast 提示 UI。

## 许可证

MIT
