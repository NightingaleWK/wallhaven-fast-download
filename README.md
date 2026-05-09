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

## 元信息

- Author: `NightingaleWK`
- Name: `wallhaven-fast-download`
- Namespace: `https://github.com/NightingaleWK`
- Homepage: `https://github.com/NightingaleWK/wallhaven-fast-download`
- Support: `https://github.com/NightingaleWK/wallhaven-fast-download/issues`
- License: `MIT`
- Version: `1.1.0`

## 实现说明

本项目代码全部由 ChatGPT 5.5 编写。脚本使用原生 DOM API、`MutationObserver`、`GM_xmlhttpRequest`、Wallhaven API 解析、`GM_download`，并实现悬停工具按钮组、卡片内快速预览层和 toast 提示 UI。

## Greasy Fork 发布检查

- 脚本代码可读，未压缩、未混淆。
- 主要功能在发布脚本内实现，没有隐藏加载外部脚本。
- 名称和描述按语言标注，并描述实际行为。
- `@author`、`@namespace`、`@homepageURL`、`@supportURL` 已指向 `NightingaleWK` 的项目资源。
- `@grant` 仅包含实现实际使用的 `GM_download` 和 `GM_xmlhttpRequest`。
- `@connect` 仅包含 API 和图片下载所需的 `wallhaven.cc`、`w.wallhaven.cc`。
- 脚本名称和说明只描述本项目自身行为。
- README 只保留本项目的安装、使用、元信息和许可说明。

## 许可证

MIT
