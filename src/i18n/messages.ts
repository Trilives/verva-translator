import type { UiLocale } from "../domain/types";

const en = {
  appName: "Verva Translate", translate: "Translate", stop: "Stop", clear: "Clear input",
  copy: "Copy result", copied: "Copied", history: "History", settings: "Settings",
  source: "Source language", target: "Target language", autoDetect: "Auto Detect",
  detected: "Detected", swap: "Swap languages", customLanguage: "Preferred language",
  sourcePlaceholder: "Enter the content to be translated here.",
  resultPlaceholder: "Your translation will appear here.", style: "Tone & style",
  natural: "Natural", conversation: "Daily conversation", business: "Business",
  command: "Command issuance", custom: "Custom", editCustom: "Edit custom requirements",
  customTitle: "Custom style", customHint: "Describe the desired style and requirements.",
  save: "Save", cancel: "Cancel", noHistory: "No translations yet.", restore: "Restore",
  clearHistory: "Clear history", sessionStarted: "Session started", refreshSession: "Refresh session",
  contextWarning: "This session has used over 50% of its configured context.",
  aiRequired: "An AI-compatible API is required. Custom languages depend on model support.",
  profile: "Configuration", addProfile: "Add configuration", deleteProfile: "Delete",
  provider: "Provider interface", baseUrl: "Base URL", model: "Model", apiKey: "API key",
  apiKeySaved: "A key is stored securely", apiKeyMissing: "No API key stored",
  openAi: "OpenAI compatible", claude: "Claude compatible", thinking: "Thinking mode",
  longConversation: "Long conversation", longConversationHint: "Uses more tokens, but keeps context for more accurate multi-round translation.",
  interfaceLanguage: "Interface language", english: "English", chinese: "简体中文",
  appearance: "Appearance", system: "System", light: "Light", dark: "Dark",
  updates: "Updates", automatic: "Automatic", manual: "Manual", stable: "Stable", beta: "Beta",
  checkUpdates: "Check for updates", shortcuts: "Shortcuts", closeSettings: "Close settings",
  invalidUrl: "Use HTTPS for remote endpoints; HTTP is allowed only for localhost.",
  keyRequired: "Save an API key for the active configuration before translating.",
  translationFailed: "Translation failed", portableNotice: "Portable builds notify only and do not install updates automatically."
};

const zh: typeof en = {
  appName: "Verva 翻译", translate: "翻译", stop: "停止", clear: "清空输入",
  copy: "复制结果", copied: "已复制", history: "历史记录", settings: "设置",
  source: "源语言", target: "目标语言", autoDetect: "自动检测",
  detected: "检测到", swap: "交换语言", customLanguage: "自定义语言",
  sourcePlaceholder: "Enter the content to be translated here.",
  resultPlaceholder: "Your translation will appear here.", style: "语气与风格",
  natural: "自然", conversation: "日常对话", business: "商务", command: "命令下达",
  custom: "自定义", editCustom: "编辑自定义要求", customTitle: "自定义风格",
  customHint: "描述需要的风格与具体要求。", save: "保存", cancel: "取消",
  noHistory: "暂无翻译记录。", restore: "恢复", clearHistory: "清空历史",
  sessionStarted: "会话开始于", refreshSession: "刷新会话",
  contextWarning: "本会话已使用超过设定上下文的 50%。",
  aiRequired: "需要可用的 AI 兼容接口；自定义语言取决于模型支持。",
  profile: "配置", addProfile: "新增配置", deleteProfile: "删除", provider: "接口类型",
  baseUrl: "基础 URL", model: "模型", apiKey: "API 密钥", apiKeySaved: "密钥已安全保存",
  apiKeyMissing: "尚未保存 API 密钥", openAi: "OpenAI 兼容", claude: "Claude 兼容",
  thinking: "思考模式", longConversation: "长会话",
  longConversationHint: "会消耗更多 Token，但可保留上下文，使多轮翻译更准确。",
  interfaceLanguage: "界面语言", english: "English", chinese: "简体中文",
  appearance: "外观", system: "跟随系统", light: "浅色", dark: "深色",
  updates: "更新", automatic: "自动", manual: "手动", stable: "稳定版", beta: "测试版",
  checkUpdates: "检查更新", shortcuts: "快捷键", closeSettings: "关闭设置",
  invalidUrl: "远程地址必须使用 HTTPS；HTTP 仅允许 localhost。",
  keyRequired: "翻译前请先为当前配置保存 API 密钥。", translationFailed: "翻译失败",
  portableNotice: "便携版只提示新版本，不会自动安装更新。"
};

export type MessageKey = keyof typeof en;
export const messages: Record<UiLocale, typeof en> = { en, "zh-CN": zh };
