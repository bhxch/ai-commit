# aicommit

终端中的 AI 约定式提交消息生成器。

通过 OpenAI、Gemini 或 Anthropic 分析暂存区的 git diff，自动生成符合 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 规范的提交消息。

**[English](https://github.com/bhxch/ai-commit/blob/main/packages/cli/README_EN.md)**

## 特性

- 三种 AI 提供商：OpenAI（含 Azure/DeepSeek）、Gemini、Anthropic
- 开箱即用的约定式提交格式
- Gitmoji 支持（可选）
- 多语言提交消息
- 交互式工作流：接受、编辑、重新生成或取消
- 4 层配置优先级：CLI 参数 > 环境变量 > 项目配置 > 全局配置
- 自定义提示词文件
- Dry-run 模式
- 零配置默认值——只需设置 API Key 即可使用

## 快速开始

```bash
# 无需安装，直接运行
npx @bhxch/aicommit
```

前提条件：Node.js >= 18、一个有暂存变更的 git 仓库、一个 API Key。

## 安装

```bash
# 直接使用 npx
npx @bhxch/aicommit

# 或全局安装
npm install -g @bhxch/aicommit
aicommit
```

## 使用

### 基本用法

```bash
# 先暂存你的变更
git add .

# 生成提交消息并交互确认
aicommit
```

工具会读取暂存区的 diff，发送给 AI 模型，然后展示生成的提交消息。你可以：

- **Accept（接受）** — 直接提交
- **Edit（编辑）** — 在 `$EDITOR` 中修改
- **Regenerate（重新生成）** — 生成新的消息
- **Abort（取消）** — 放弃提交

### 命令行选项

| 选项 | 说明 |
|------|------|
| `-y, --yes` | 跳过确认，直接提交 |
| `-a, --all` | 生成前暂存所有变更（`git add -A`） |
| `--staged-only` | 仅使用已暂存的变更；无暂存时报错 |
| `--dry-run` | 仅生成消息，不提交 |
| `-c, --context <text>` | 为 AI 提供额外上下文 |
| `-p, --prompt <file>` | 使用自定义提示词文件 |
| `--prefix <text>` | 在提交消息前添加前缀 |
| `--no-gitmoji` | 禁用 gitmoji 表情前缀 |
| `-l, --lang <language>` | 提交消息语言（默认：`English`） |
| `--provider <provider>` | AI 提供商：`openai`、`gemini`、`anthropic` |
| `--model <model>` | 模型名称（如 `gpt-4o`、`gemini-2.0-flash`） |
| `--temperature <number>` | 采样温度，0–2（默认：`0.7`） |

### 示例

```bash
# 自动提交，无需确认
aicommit -y

# 预览消息但不提交
aicommit --dry-run

# 暂存所有变更并提交
aicommit -a -y

# 使用 Anthropic 并指定模型
aicommit --provider anthropic --model claude-sonnet-4-20250514

# 生成中文提交消息
aicommit -l "简体中文"

# 添加关于你所做变更的上下文
aicommit -c "重构了认证模块以使用 JWT"

# 在消息前添加工单编号
aicommit --prefix "PROJ-123"
```

## 配置

配置按优先级从高到低解析（高优先级覆盖低优先级）：

1. **CLI 参数**
2. **环境变量**（`AICOMMIT_*` 前缀）
3. **项目配置**（git 根目录下的 `.aicommitrc.json`）
4. **全局配置**（`~/.aicommitrc.json`）
5. **默认值**

### 配置文件

在项目根目录或用户主目录下创建 `.aicommitrc.json`：

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.7,
  "language": "English",
  "gitmoji": true,
  "prefix": "",
  "promptFile": "",
  "openai": {
    "apiKey": "sk-xxx",
    "baseUrl": "https://api.openai.com/v1",
    "apiVersion": ""
  },
  "gemini": {
    "apiKey": "xxx",
    "baseUrl": ""
  },
  "anthropic": {
    "apiKey": "sk-ant-xxx",
    "baseUrl": ""
  }
}
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `AICOMMIT_OPENAI_API_KEY` | OpenAI API Key |
| `AICOMMIT_OPENAI_BASE_URL` | OpenAI 基础 URL（用于 Azure/DeepSeek） |
| `AICOMMIT_AZURE_API_VERSION` | Azure OpenAI API 版本 |
| `AICOMMIT_GEMINI_API_KEY` | Gemini API Key |
| `AICOMMIT_GEMINI_BASE_URL` | Gemini 基础 URL |
| `AICOMMIT_ANTHROPIC_API_KEY` | Anthropic API Key |
| `AICOMMIT_ANTHROPIC_BASE_URL` | Anthropic 基础 URL |
| `AICOMMIT_PROVIDER` | 默认提供商 |
| `AICOMMIT_MODEL` | 默认模型 |
| `AICOMMIT_LANGUAGE` | 默认语言 |
| `AICOMMIT_TEMPERATURE` | 默认温度 |
| `AICOMMIT_PREFIX` | 默认前缀 |
| `AICOMMIT_PROMPT_FILE` | 自定义提示词文件路径 |
| `AICOMMIT_GITMOJI` | 是否启用 gitmoji（`true`/`false`） |
| `AICOMMIT_STAGED_ONLY` | 仅使用已暂存的变更（`true`/`false`） |

> **注意：** 工具也会读取 `OPENAI_API_KEY`、`GEMINI_API_KEY`、`ANTHROPIC_API_KEY` 等标准环境变量作为回退（会输出警告）。建议优先使用 `AICOMMIT_*` 前缀的版本。

### 自定义提示词

使用 `-p` 指定你自己的系统提示词文件：

```bash
aicommit -p ./my-prompt.md
```

文件内容会完全替换内置的提示词模板。

## 提供商配置

### OpenAI

```bash
export AICOMMIT_OPENAI_API_KEY="sk-xxx"
aicommit --provider openai --model gpt-4o
```

使用 Azure OpenAI 或 DeepSeek 时，设置 `baseUrl` 和可选的 `apiVersion`：

```bash
export AICOMMIT_OPENAI_BASE_URL="https://your-resource.openai.azure.com/"
export AICOMMIT_AZURE_API_VERSION="2024-02-15-preview"
```

### Gemini

```bash
export AICOMMIT_GEMINI_API_KEY="xxx"
aicommit --provider gemini --model gemini-2.0-flash
```

### Anthropic

```bash
export AICOMMIT_ANTHROPIC_API_KEY="sk-ant-xxx"
aicommit --provider anthropic --model claude-sonnet-4-20250514
```

## 开发

```bash
cd packages/cli
npm install
npm run build    # 使用 tsup 构建
npm run dev      # 使用 tsx 运行（开发模式）
npm test         # 使用 vitest 运行测试
npm run lint     # 类型检查
```

## 致谢

本项目 CLI 工具源自 [ai-commit-ext](https://github.com/bhxch/ai-commit/tree/main/ai-commit-ext)（AI Commit VSCode 扩展），将其核心 AI 提交生成能力提取为独立的命令行工具。

## 许可证

MIT
