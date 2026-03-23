# @bhxch/aicommit CLI 设计文档

> 将 ai-commit VSCode 扩展的核心能力改写为独立的 CLI 工具，通过 npx 运行，不再依赖 IDE。

## 背景

ai-commit-ext 是一个 VSCode 扩展，通过 AI 分析 Git 暂存区变更并生成 Conventional Commits 规范的提交消息。其功能受限于 VSCode IDE 环境。本设计将其核心能力提取为独立 CLI 工具，可在任意终端环境使用。

## 架构决策

**采用方案 A：自建独立 CLI 项目**，不复用 VSCode 扩展代码，仅复用提示词模板设计思路。不引入 monorepo，不改造现有扩展（子模块为独立仓库，改造协调成本高）。

项目位于 `packages/cli/`，与 `ai-commit-ext/` 子模块并列。

## CLI 接口

**用法：** `npx @bhxch/aicommit [options]`

### 参数

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--yes` | `-y` | 跳过交互确认，直接生成并 commit | false |
| `--prefix <text>` | | 附加到 commit message 最前面（空格分隔） | 无 |
| `--all` | `-a` | 提交所有工作区变更（git add -A） | false |
| `--staged-only` | | 仅提交 staged，无 staged 时报错退出 | false |
| `--context <text>` | `-c` | 附加上下文 | 无 |
| `--prompt <file>` | `-p` | 自定义提示词文件路径 | 无 |
| `--no-gitmoji` | | 禁用 Gitmoji，生成纯文本 Conventional Commits | false（即默认启用） |
| `--lang <language>` | `-l` | commit message 语言 | English |
| `--provider` | | AI 提供商 (openai/gemini/anthropic) | openai |
| `--model` | | 模型名称 | 按提供商默认值 |
| `--temperature` | | 温度参数 (0-2) | 0.7 |
| `--dry-run` | | 仅生成并输出 commit message，不执行 git commit | false |

### 参数互斥规则

- `--all` 与 `--staged-only` 互斥，同时传入时报错退出

### 默认行为

1. 优先使用 staged 变更生成 commit message
2. 无 staged 变更时，交互式询问是否 `git add -A`
3. `--yes` 模式下无 staged 变更直接报错退出（不自动 add -A）
4. `--prefix` 值拼接到 commit message 最前面，用空格与后续内容分隔
5. 默认启用 Gitmoji，`--no-gitmoji` 可禁用

## 配置管理

**优先级（高 → 低）：** CLI 参数 > 环境变量 > 项目配置文件 > 全局配置文件 > 内置默认值

### 配置文件

- 项目级：`.aicommitrc.json`（当前 git 仓库根目录），应加入 `.gitignore`
- 全局级：`~/.aicommitrc.json`

> **安全注意**：配置文件中可能包含 API Key 明文，切勿将项目级 `.aicommitrc.json` 提交到版本控制。推荐优先使用环境变量存储敏感信息。

格式：
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.7,
  "language": "English",
  "prefix": "",
  "promptFile": "",
  "stagedOnly": false,
  "suppressFallbackWarning": false,
  "openai": {
    "apiKey": "",
    "baseUrl": "",
    "apiVersion": ""
  },
  "gemini": {
    "apiKey": "",
    "baseUrl": ""
  },
  "anthropic": {
    "apiKey": "",
    "baseUrl": ""
  }
}
```

### 环境变量

**所有环境变量统一使用 `AICOMMIT_` 前缀。** 同时支持无前缀的通用 SDK 变量名作为 fallback，使用 fallback 时打印 warning。

| 主变量（推荐） | Fallback 变量 | 对应配置 |
|----------------|---------------|----------|
| `AICOMMIT_PROVIDER` | — | provider |
| `AICOMMIT_MODEL` | — | model |
| `AICOMMIT_LANGUAGE` | — | language |
| `AICOMMIT_TEMPERATURE` | — | temperature |
| `AICOMMIT_OPENAI_API_KEY` | `OPENAI_API_KEY` | openai.apiKey |
| `AICOMMIT_OPENAI_BASE_URL` | `OPENAI_BASE_URL` | openai.baseUrl |
| `AICOMMIT_AZURE_API_VERSION` | `AZURE_API_VERSION` | openai.apiVersion |
| `AICOMMIT_GEMINI_API_KEY` | `GEMINI_API_KEY` | gemini.apiKey |
| `AICOMMIT_GEMINI_BASE_URL` | `GEMINI_BASE_URL` | gemini.baseUrl |
| `AICOMMIT_ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | anthropic.apiKey |
| `AICOMMIT_ANTHROPIC_BASE_URL` | `ANTHROPIC_BASE_URL` | anthropic.baseUrl |

### Fallback Warning 控制

当使用无前缀的 fallback 变量时，默认输出 warning 到 stderr：
```
[warning] Using deprecated env var "OPENAI_API_KEY", please use "AICOMMIT_OPENAI_API_KEY" instead.
```

关闭此 warning 的方式（任选其一）：
- 配置文件：`"suppressFallbackWarning": true`
- 环境变量：`AICOMMIT_SUPPRESS_FALLBACK_WARNING=true`

## AI Provider 架构

### 统一接口

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIProvider {
  generate(messages: Message[], options: GenerateOptions): Promise<string>;
}

interface GenerateOptions {
  model: string;
  temperature: number;
}
```

### 三个实现

| Provider | SDK | baseUrl |
|----------|-----|---------|
| OpenAI | `openai` (v4) | 兼容 Azure/DeepSeek/Ollama 等。Azure 需配置 `baseUrl` + `apiVersion` |
| Gemini | `@google/generative-ai` | 兼容 Gemini 代理/网关 |
| Anthropic | `@anthropic-ai/sdk` | 兼容 Claude 代理/网关 |

各 Provider 内部将统一的 `Message[]` 转换为各自 SDK 格式，通过工厂函数根据 provider 配置选择实现。

### 错误处理

按 HTTP 状态码分类：
- 401：认证失败
- 429：速率限制
- 500：服务端错误
- 503：服务不可用

CLI 中输出友好错误信息到 stderr。同时处理网络超时和连接失败，输出可操作的建议。

### Diff 大小限制

当 diff 内容超过一定阈值时（如 10000 行），截断并警告用户：
- 输出警告到 stderr，提示 diff 过大可能导致生成质量下降
- 建议用户分批提交或使用 `--prompt` 自定义提示词

## 提示词

复用 ai-commit-ext 的提示词设计：
- 默认模板包含 Gitmoji（emoji + type + scope + subject + body）
- `--no-gitmoji` 切换为不带 emoji 的纯文本格式
- 支持通过 `--prompt` 指定自定义提示词文件替换默认模板
- 语言参数注入到提示词模板中
- 11 种 Conventional Commits 类型：feat/fix/docs/style/refactor/perf/test/build/ci/chore/i18n

## 主流程

```
解析 CLI 参数
    ↓
加载配置（合并 4 层优先级）
    ↓
验证 API Key 存在
    ↓
获取 git diff
    ├─ --all: git add -A → git diff --cached
    ├─ --staged-only: git diff --cached，无内容则报错
    └─ 默认: git diff --cached
         ├─ 有内容 → 继续
         └─ 无内容 → 询问是否 git add -A
    ↓
构建 prompt（系统提示词 + 可选上下文 + diff）
    ↓
调用 AI Provider 生成 commit message
    ↓
--prefix 有值？→ 拼接到 message 最前面
    ↓
--yes 模式？
    ├─ 是 → git commit → 输出结果
    └─ 否 → 交互确认
         ├─ Accept → git commit
         ├─ Edit → 打开 $EDITOR 编辑 commit message 后 commit
         ├─ Regenerate → 重新调用 AI
         └─ Abort → 退出
```

## 技术选型

| 类别 | 选择 | 说明 |
|------|------|------|
| CLI 框架 | `commander` | 成熟稳定，参数解析 |
| 交互提示 | `@inquirer/prompts` | select/confirm/input |
| Git 操作 | `simple-git` | 与 VSCode 扩展一致 |
| AI SDK | `openai` / `@google/generative-ai` / `@anthropic-ai/sdk` | 三个提供商各自 SDK |
| 编译构建 | `tsup` | 基于 esbuild，输出 ESM/CJS |
| 开发运行 | `tsx` | TypeScript 直接执行 |
| 包管理 | npm | 与项目一致 |
| Node.js | >= 18 | 最低版本要求 |

## 项目结构

```
packages/cli/
├── src/
│   ├── index.ts            # 入口，注册 CLI 命令
│   ├── cli.ts              # 主流程编排
│   ├── git.ts              # Git 操作（diff, staged, commit）
│   ├── config.ts           # 配置加载与合并
│   ├── prompts.ts          # 提示词模板
│   ├── providers/
│   │   ├── index.ts        # Provider 接口 + 工厂函数
│   │   ├── openai.ts       # OpenAI 兼容
│   │   ├── gemini.ts       # Gemini
│   │   └── anthropic.ts    # Anthropic
│   └── types.ts            # 类型定义
├── package.json            # name: @bhxch/aicommit, bin: aicommit
├── tsconfig.json
└── tsup.config.ts
```

## 使用示例

```bash
# 基本用法（交互确认）
npx @bhxch/aicommit

# 跳过确认直接提交
npx @bhxch/aicommit -y

# 带 issue 前缀
npx @bhxch/aicommit --prefix "PROJ-123"

# 使用 Gemini + 中文
npx @bhxch/aicommit --provider gemini --lang "Simplified Chinese"

# 提交所有变更
npx @bhxch/aicommit -a -y

# 自定义提示词
npx @bhxch/aicommit --prompt ./my-prompt.md

# 附加上下文
npx @bhxch/aicommit --context "feat: 用户认证模块重构"

# 仅生成不提交（dry-run）
npx @bhxch/aicommit --dry-run

# 禁用 Gitmoji
npx @bhxch/aicommit --no-gitmoji

# 使用 Anthropic
npx @bhxch/aicommit --provider anthropic --model claude-sonnet-4-20250514
```

## 验证方式

1. `cd packages/cli && npm install && npm run build` 构建成功
2. `npx . --help` 显示帮助信息
3. 在有 staged 变更的 git 仓库中运行 `npx .` 验证交互流程
4. `npx . -y --prefix "TEST-1"` 验证跳过确认 + 前缀拼接
5. `npx . --dry-run` 验证仅输出不提交
6. 分别测试三个 provider 的 commit message 生成
7. 测试无 staged 变更时的询问行为
8. 测试自定义提示词文件加载
9. 测试 `--all` 与 `--staged-only` 互斥报错
10. 测试 `--no-gitmoji` 输出格式
