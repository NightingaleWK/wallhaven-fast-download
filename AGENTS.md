# 仓库指南

## 最重要约定

本项目全程 AI 沟通、分析说明、文档编写、提交信息建议，以及生成的面向维护者内容，均以简体中文为主。只有代码标识符、命令、协议字段、用户脚本元数据或第三方平台要求必须使用英文时，才保留英文。

## 项目结构与模块组织

本仓库是一个用于 Wallhaven 的 Tampermonkey/Violentmonkey 用户脚本。

- `main.js` 是完整用户脚本，包含元信息、DOM 行为、API 请求、注入样式和 UI 辅助逻辑。
- `README.md` 记录安装方式、功能说明、使用方式和本地检查命令。
- `tests/preview-behavior.test.js` 是轻量 Node 回归检查，主要覆盖关键交互实现结构。
- `LICENSE` 是 MIT 许可证。

当前没有独立的 `src/` 或资源目录。除非项目明确演进为多文件构建流程，否则新增功能优先保持在 `main.js` 内；测试可继续放在 `tests/` 下。

## 构建、测试与本地开发命令

本项目没有构建步骤，也没有包管理器配置。直接编辑 `main.js`，并通过用户脚本管理器加载验证。

常用检查：

```sh
node --check main.js
node tests/preview-behavior.test.js
```

`node --check` 只校验 JavaScript 语法，不会执行浏览器或用户脚本专属 API。`tests/preview-behavior.test.js` 是源码结构级回归检查，不能替代真实浏览器手动验证。

手动开发流程：

1. 在 Tampermonkey 或 Violentmonkey 中安装或更新 `main.js`。
2. 打开 `https://wallhaven.cc/` 或 Wallhaven 列表页。
3. 悬停壁纸卡片，验证下载按钮、自动预览、缩略图加载提示和原图替换。
4. 点击下载按钮，验证请求中 `…`、成功 `✓`、反馈阶段保持可见和反馈结束后恢复 hover 显示逻辑。

## 代码风格与命名约定

使用原生 JavaScript 和浏览器 API。除非仓库新增明确的构建流程，否则不要引入外部运行时依赖。

- 使用 4 空格缩进，保持与 `main.js` 一致。
- 使用 `const` 和 `let`，避免使用 `var`。
- 函数和变量使用 camelCase，例如 `showToast()`、`getWallpaperId()`。
- 共享选择器、类名和 ID 优先放入 `CONFIG` 对象。
- 注入到页面的 DOM 类名和 ID 使用 `whfd-` 前缀，避免与 Wallhaven 页面样式冲突。

## 测试指南

当前没有完整自动化测试框架。每次行为变更后，至少运行 `node --check main.js` 和 `node tests/preview-behavior.test.js`，并在 Wallhaven 网格或列表页进行手动验证。

最低检查范围：

- 按钮只出现在壁纸卡片上。
- 下载通过用户脚本管理器的 `GM_download` 触发。
- 预览可以打开、关闭，缩略图阶段有轻量加载提示，并能清晰提示失败。
- 下载请求中和成功反馈阶段按钮保持可见，反馈结束后可重复下载。
- Wallhaven 壁纸详情页不会被意外修改。

## 提交与 Pull Request 指南

提交信息使用简短祈使句，例如 `修复预览关闭行为`、`更新用户脚本元信息`。

Pull Request 应说明用户可见变化、列出手动测试过的页面；涉及 UI 变化时，附上截图或简短录屏。

## 安全与配置提示

保持用户脚本权限最小化。只有代码实际需要时，才新增 `@grant`、`@connect` 或 `@match`。不要加载远程脚本，也不要加入隐藏的外部运行时代码。
