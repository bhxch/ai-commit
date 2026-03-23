# AI Commit Extension 功能说明

基于 [Sitoi/ai-commit](https://github.com/Sitoi/ai-commit) 的 VSCode 扩展，利用 AI 自动分析 Git 暂存区变更并生成符合 Conventional Commits 规范的提交消息。

## 目录

- [功能概览](#功能概览)
- [功能详解](#功能详解)
  - [1. AI 自动生成 Commit Message](#1-ai-自动生成-commit-message)
  - [2. 多 AI 提供商支持](#2-多-ai-提供商支持)
  - [3. 多语言 Commit Message](#3-多语言-commit-message)
  - [4. Gitmoji 支持](#4-gitmoji-支持)
  - [5. 自定义系统提示词](#5-自定义系统提示词)
  - [6. OpenAI 模型选择](#6-openai-模型选择)
  - [7. 附加上下文支持](#7-附加上下文支持)
  - [8. API Key 缺失提醒](#8-api-key-缺失提醒)
  - [9. 错误处理与重试](#9-错误处理与重试)
  - [10. 配置缓存与热更新](#10-配置缓存与热更新)

---

## 功能概览

| 功能 | 默认值 | 说明 |
|------|--------|------|
| AI 提供商 | openai | 支持 OpenAI / Gemini |
| AI 模型 | gpt-4o / gemini-2.0-flash-001 | 可自定义模型 |
| 提交语言 | English | 支持 19 种语言 |
| Temperature | 0.7 | 控制生成随机性 |
| Gitmoji | 启用 | 可通过自定义提示词关闭 |

---

## 功能详解

### 1. AI 自动生成 Commit Message

**功能描述：** 点击 Source Control 面板中的 AI Commit 图标按钮，自动分析 Git 暂存区的 diff 并生成规范化的提交消息，填充到 SCM 输入框中。

**实现方式：**

- 入口函数：`generateCommitMsg()`（`src/generate-commit-msg.ts`）
- 通过 `vscode.extensions.getExtension('vscode.git').exports.getAPI(1)` 获取 Git API
- 调用 `getRepo(arg)` 解析当前仓库，优先匹配传入参数中的 `rootUri`，否则使用第一个仓库
- 使用 `simple-git` 库执行 `git diff --staged` 获取暂存区变更内容（`src/git-utils.ts`）
- 将 diff 内容组装为 Chat Completion 消息（`generateCommitMessageChatCompletionPrompt()`），包含：
  - System Prompt（定义角色、输出格式、类型参考、写作规则）
  - 可选的附加上下文（来自 SCM 输入框已有内容）
  - 用户消息（diff 内容）
- 调用 AI API 获取生成的 commit message
- 将结果写入 `repo.inputBox.value`

**依赖：** `simple-git`、`openai` / `@google/generative-ai`

---

### 2. 多 AI 提供商支持

**功能描述：** 支持 OpenAI（含 Azure OpenAI、DeepSeek 等兼容接口）和 Google Gemini 两种 AI 提供商。

**实现方式：**

- 配置项 `ai-commit.AI_PROVIDER`（枚举值：`openai` / `gemini`），默认 `openai`
- 在 `generateCommitMsg()` 中根据 `aiProvider` 选择调用路径：
  - **OpenAI 路径**（`src/openai-utils.ts`）：
    - `createOpenAIApi()` 读取 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`AZURE_API_VERSION` 构建配置
    - 若配置了 `baseURL`，则同时添加 `defaultQuery`（api-version）和 `defaultHeaders`（api-key），兼容 Azure OpenAI 端点格式
    - 通过 `openai.chat.completions.create()` 发起请求
    - 支持 `OPENAI_TEMPERATURE`（默认 0.7）和 `OPENAI_MODEL`（默认 gpt-4o）
  - **Gemini 路径**（`src/gemini-utils.ts`）：
    - `createGeminiAPIClient()` 读取 `GEMINI_API_KEY` 创建 `GoogleGenerativeAI` 实例
    - 通过 `model.startChat()` 建立会话，调用 `chat.sendMessage()` 发送消息
    - 消息内容从 OpenAI 格式的 messages 数组中提取 `msg.content` 进行转换
    - 支持 `GEMINI_TEMPERATURE`（默认 0.7）和 `GEMINI_MODEL`（默认 gemini-2.0-flash-001）

---

### 3. 多语言 Commit Message

**功能描述：** 生成的提交消息支持 19 种语言，包括简体中文、繁体中文、日语、韩语、英语、法语、德语等。

**实现方式：**

- 配置项 `ai-commit.AI_COMMIT_LANGUAGE`，提供 19 个枚举选项
- 在 `prompts.ts` 的 `INIT_MAIN_PROMPT()` 函数中，将语言参数注入到系统提示词模板中：
  - Subject 规则：`Must be in ${language}`
  - Body 规则：`Must be in ${language}`
  - 底部约束：`All output MUST be in ${language} language`
- 提示词同时规定了 scope 必须使用英文（避免语言混用）

**支持的语言列表：** Simplified Chinese, Traditional Chinese, Japanese, Korean, Czech, German, French, Italian, Dutch, Portuguese, Vietnamese, English, Spanish, Swedish, Russian, Bahasa, Polish, Turkish, Thai

---

### 4. Gitmoji 支持

**功能描述：** 默认启用 Gitmoji，在 commit message 的 subject 行前添加对应的 emoji 前缀。

**实现方式：**

- 默认系统提示词（`src/prompts.ts` 内联模板）中定义了带 emoji 的输出格式：
  ```
  <emoji> <type>(<scope>): <subject>
  ```
- Type Reference 表格包含 Emoji 列，如：feat → ✨、fix → 🐛、docs → 📝 等 11 种类型
- 提示词中的示例也展示了 emoji 用法：`♻️ refactor(server): ...`
- 若不需要 Gitmoji，用户可通过 `ai-commit.AI_COMMIT_SYSTEM_PROMPT` 配置项设置自定义提示词，项目提供了 `prompt/without_gitmoji.md` 作为无 emoji 的提示词模板

---

### 5. 自定义系统提示词

**功能描述：** 允许用户替换默认的系统提示词，自定义 commit message 的生成规则、格式和风格。

**实现方式：**

- 配置项 `ai-commit.AI_COMMIT_SYSTEM_PROMPT`（string，默认为空）
- 在 `prompts.ts` 的 `INIT_MAIN_PROMPT()` 中，优先读取自定义提示词：
  ```typescript
  ConfigurationManager.getInstance().getConfig<string>(ConfigKeys.SYSTEM_PROMPT) ||
  `# Git Commit Message Guide\n...`  // 内联默认提示词
  ```
- 当用户设置了自定义提示词，将完全替换内置的提示词模板，包括角色定义、输出格式、类型参考、写作规则等全部内容

---

### 6. OpenAI 模型选择

**功能描述：** 支持从可用模型列表中选择 OpenAI 模型，并提供 VSCode 命令查看可用模型。

**实现方式：**

- 配置项 `ai-commit.OPENAI_MODEL`，默认 `gpt-4o`
- VSCode 命令 `ai-commit.showAvailableModels`（注册在 `src/commands.ts`）：
  - 调用 `ConfigurationManager.getAvailableOpenAIModels()` 获取模型列表
  - 使用 `vscode.window.showQuickPick(models)` 弹出选择器
  - 用户选择后通过 `config.update('OPENAI_MODEL', selected)` 写入全局配置
- 模型列表获取与缓存（`src/config.ts`）：
  - `updateOpenAIModelList()` 调用 `openai.models.list()` 拉取可用模型
  - 将模型 ID 列表缓存到 `context.globalState`（key: `availableOpenAIModels`）
  - 若当前选中模型不在可用列表中，自动回退到 `gpt-4`
  - 当 `OPENAI_BASE_URL` 或 `OPENAI_API_KEY` 配置变更时，自动触发模型列表更新
- Gemini 模型列表功能因 Gemini API 暂不支持通过 API 列举模型，当前已注释掉（标记为 `@deprecated`）

---

### 7. 附加上下文支持

**功能描述：** 用户可以在点击 AI Commit 按钮之前，在 SCM 输入框中输入附加说明，AI 会将这些上下文纳入 commit message 生成的考量。

**实现方式：**

- 在 `generateCommitMsg()` 中读取 `scmInputBox.value.trim()` 作为 `additionalContext`
- 若存在附加上下文，在消息数组中插入一条 user 消息：
  ```typescript
  chatContextAsCompletionRequest.push({
    role: 'user',
    content: `Additional context for the changes:\n${additionalContext}`
  });
  ```
- 系统提示词中也包含 "Additional Context" 段落，指导 AI 如何使用这些上下文信息
- 进度提示也会区分是否有附加上下文（`Analyzing changes...` vs `Analyzing changes with additional context...`）

---

### 8. API Key 缺失提醒

**功能描述：** 扩展激活时检测 API Key 是否已配置，若未配置则弹出提醒引导用户前往设置页面。

**实现方式：**

- 在 `activate()` 函数（`src/extension.ts`）中：
  ```typescript
  const apiKey = configManager.getConfig<string>('OPENAI_API_KEY');
  if (!apiKey) {
    const result = await vscode.window.showWarningMessage(
      'OpenAI API Key not configured. Would you like to configure it now?',
      'Yes', 'No'
    );
    if (result === 'Yes') {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings', 'ai-commit.OPENAI_API_KEY'
      );
    }
  }
  ```
- 使用 `showWarningMessage` + 两个按钮实现非侵入式提醒
- 点击 "Yes" 直接跳转到对应配置项的设置页面

---

### 9. 错误处理与重试

**功能描述：** 全面的错误处理机制，支持常见 API 错误的友好提示和重试操作。

**实现方式：**

- 命令级别的错误处理（`src/commands.ts` 的 `registerCommand()`）：
  - 所有命令执行包裹在 try/catch 中
  - 出错时弹出 `showErrorMessage`，提供 "Retry" 和 "Configure" 两个按钮
  - "Retry" 重新执行当前命令，"Configure" 打开设置页面
- API 级别的错误处理（`src/generate-commit-msg.ts`）：
  - OpenAI 路径按 HTTP 状态码分类处理：
    - 401：Invalid API key or unauthorized access
    - 429：Rate limit exceeded
    - 500：OpenAI server error
    - 503：OpenAI service temporarily unavailable
  - Gemini 路径：透传 Gemini API 错误消息
- Git 操作错误处理（`src/git-utils.ts`）：
  - `getDiffStaged()` 捕获 simple-git 异常，返回 `{ diff: '', error: message }` 结构
  - 无暂存区变更时返回特定提示 `'No changes staged.'`

---

### 10. 配置缓存与热更新

**功能描述：** 配置项读取带有缓存机制，配置变更时自动清理缓存并触发相关更新。

**实现方式：**

- `ConfigurationManager` 采用单例模式（`src/config.ts`）
- 配置缓存：使用 `Map<string, any>` 缓存已读取的配置项，`getConfig()` 优先从缓存读取
- 热更新监听：通过 `vscode.workspace.onDidChangeConfiguration` 监听配置变更：
  - 当 `ai-commit` 命名空间下任意配置变更时，清空整个缓存
  - 当 `OPENAI_BASE_URL` 或 `OPENAI_API_KEY` 变更时，自动调用 `updateOpenAIModelList()` 刷新可用模型列表
- 资源清理：`dispose()` 方法释放配置变更监听器

---

## 架构概览

```
src/
├── extension.ts          # 扩展入口，激活/停用生命周期
├── commands.ts           # 命令注册与错误处理
├── config.ts             # 配置管理（单例、缓存、模型列表）
├── generate-commit-msg.ts # 核心流程：获取 diff → 构建 prompt → 调用 AI → 填充结果
├── git-utils.ts          # Git 操作（获取暂存区 diff）
├── prompts.ts            # 提示词模板构建（含语言注入）
├── openai-utils.ts       # OpenAI API 客户端与调用
├── gemini-utils.ts       # Gemini API 客户端与调用
└── utils.ts              # 工具类（进度条封装）
```

## 配置项一览

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `AI_PROVIDER` | enum | `openai` | AI 提供商（openai / gemini） |
| `OPENAI_API_KEY` | string | 空 | OpenAI API Key |
| `OPENAI_BASE_URL` | string | 空 | OpenAI/Azure 端点 URL |
| `OPENAI_MODEL` | string | `gpt-4o` | OpenAI 模型名称 |
| `AZURE_API_VERSION` | string | 空 | Azure API 版本 |
| `OPENAI_TEMPERATURE` | number | `0.7` | OpenAI 温度参数（0-2） |
| `GEMINI_API_KEY` | string | 空 | Gemini API Key |
| `GEMINI_MODEL` | string | `gemini-2.0-flash-001` | Gemini 模型名称 |
| `GEMINI_TEMPERATURE` | number | `0.7` | Gemini 温度参数（0-2） |
| `AI_COMMIT_LANGUAGE` | enum | `English` | 提交消息语言（19 种） |
| `AI_COMMIT_SYSTEM_PROMPT` | string | 空 | 自定义系统提示词 |

## VSCode 命令

| 命令 ID | 说明 |
|---------|------|
| `extension.ai-commit` | 生成 AI Commit Message |
| `ai-commit.showAvailableModels` | 查看并选择可用 OpenAI 模型 |
