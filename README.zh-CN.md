# Verva Translate

[English](README.md) · **简体中文**

> 译出含义，也保留语气。

Verva Translate 是一款面向 Windows 的“自带 AI 接口”翻译工具。它直接连接兼容 OpenAI 或兼容 Claude 的端点，让用户自行决定模型、成本、目标语言和表达风格，而不是再购买一个捆绑 AI 服务的月费订阅。

我开发 Verva，是因为我对机器翻译极其不满。很多译文在字面上没有错，却生硬、忽略上下文，也不像真实的人会说的话。更好的 AI 翻译工具往往需要昂贵的月费，却仍然不允许用户自行选择 API 和模型。Verva 希望把这些选择权交还给用户。

## 界面预览

工作区：语气与风格独立成块置于上方，源语言与目标语言分别位于各自的编辑区。

![Verva 翻译工作区](docs/Pictures/preview-zh-workspace.png)

设置：配置以列表呈现，展开后可编辑全部字段，并可测试连接。

![Verva 翻译设置](docs/Pictures/preview-zh-settings.png)

## 主要功能

- 支持兼容 OpenAI 与兼容 Claude 的流式接口；翻译使用自行选择的端点与模型。
- 可保存并快速切换多套配置；API 密钥加密保存；每套配置可独立设置思考等级并开启长会话。
- 本地模型页通过 Ollama 下载明确标注量化格式的模型，显示进度和大致显存/内存需求，支持可留空的 HTTP 下载代理地址及取消下载，并可将已安装模型设为翻译配置。默认推荐 Qwen3.5 4B（通用）和 TranslateGemma 4B（翻译专用）。
- 图片转文字页使用 PP-OCRv6 Small 在本机 CPU 识别中文和英文，首次使用下载轻量模型文件。长图按预览区宽度显示，可独立滚动和缩放；识别结果可编辑，也可选择翻译。
- 提供普通、自然、日常对话、商务、命令下达、专业和用户自定义风格。
- 每次启动软件时，源语言设为“自动检测”；切换应用内页面时保留当前选择。中间的交换按钮会同时交换语言、原文和译文，方便反向翻译。
- 内置主要目标语言，列表末尾提供“自定义”，可输入模型支持的其他语言。
- 译文支持流式显示和直接编辑；停止与复制位于译文区，清空位于原文区；快捷键可配置。
- 设置与历史记录均为应用内页面，不再额外开窗；可在应用内切换英语或简体中文界面。
- 每套配置都可测试连接，翻译前即可确认基础 URL、模型与密钥是否可用。
- 关闭窗口时可最小化到通知区域、直接退出，或每次询问。
- Stronghold 加密的本地历史最多保留 100 条；支持单实例；支持稳定版与测试版签名更新。
- 提供带语言选择、安装位置和进度界面的标准 NSIS 安装程序，也提供带版本号的便携版。

## 下载

请前往 [GitHub Releases](https://github.com/Trilives/verva-translator/releases)：

- `Verva-Translate-<版本>-windows-x64-setup.exe`：推荐使用。安装程序提供语言选择、可选安装位置、进度显示、快捷方式和卸载支持。
- `Verva-Translate-<版本>-windows-x64-portable.exe`：便携版。它只提示更新，不会自动替换自身。

翻译需要可用的 AI 兼容端点，本地模型可通过 Ollama 提供。自定义语言、思考模式、译文质量及服务商收费均取决于所选模型。

## 配置模型

若希望在本机翻译，请先安装并启动 [Ollama for Windows](https://ollama.com/download/windows)；应用内的下载链接会使用系统默认浏览器打开。随后到**本地模型**页下载推荐的 Q4_K_M 4B 模型，点击“运行模型”和“用于翻译”。遇到 `198.18.x.x` 假 IP 时，可在“下载代理地址”填写本机 HTTP 代理；留空则使用 Ollama 原有连接。各模型的资源估算和代理行为见[模型和 OCR 选型](docs/local-models-and-ocr.md)。OCR 无需 Ollama。

1. 从左侧栏打开**设置**。
2. 新增一套配置，或点击列表中的配置将其展开。
3. 选择**兼容 OpenAI**或**兼容 Claude**。
4. 填写基础 URL，并选择或输入模型名。公网端点必须使用 HTTPS；本机和私有局域网地址可使用 HTTP，且无需 API 密钥。
5. 按需设置思考等级或开启长会话。
6. 所有更改都会自动保存；点击**测试连接**可确认接口是否可用。
7. 返回工作区，在顶部选择该配置。

长会话会在内存中保留此前的原文与译文，并在每次请求中重复必要要求。它能改善多轮翻译的一致性，但会消耗更多 Token。主界面会显示会话开始时间，提供刷新按钮，并在达到设定上下文的 50% 时提醒。

## 从源代码构建

Windows 开发环境需要：

- Node.js 20 或更高版本
- Rust stable
- Microsoft C++ Build Tools，并安装“使用 C++ 的桌面开发”工作负载
- Microsoft Edge WebView2 Runtime

```powershell
npm install
npm run tauri dev
```

验证命令：

```powershell
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

## 安全与本地数据

- 非敏感偏好使用官方 Tauri Store 插件。
- API 密钥和有限历史记录使用官方 Stronghold 引擎；随机主密钥再由 Windows DPAPI 绑定到当前账户。
- 只有 Rust 后端可以读取服务商密钥；密钥不会写入普通设置或日志。
- 数据目录由 Tauri 解析到 Windows 应用数据位置，不依赖开发仓库，也不包含硬编码用户名。
- 公网模型必须使用 HTTPS；本机回环和私有局域网端点允许 HTTP。
- 官方 Tauri Updater 会验证签名更新；稳定版与测试版使用独立清单。

原文会发送到用户自行配置的端点。翻译敏感内容前，请确认该服务商的数据政策。

## 项目结构与发布

前端位于 `src/`，包含工作区、本地模型、图片转文字、历史和设置页面；Rust/Tauri 核心位于 `src-tauri/`；架构与文件拆分规则位于 `docs/`。

结构性修改前请阅读 [architecture.md](docs/architecture.md) 和 [modularization.md](docs/modularization.md)。GitHub Actions 需要配置 `TAURI_SIGNING_PRIVATE_KEY` 与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 仓库密钥，之后可选择 stable 或 beta 流水线生成便携版、安装程序、校验文件和签名更新清单。
