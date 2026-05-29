# SKILL Management

Monorepo 包含两个子项目：

## 架构

```
┌─────────────────────────────────────────────────────┐
│                  SKILL Platform (Next.js)            │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ SKILL API │  │ Search/   │  │ CLI Release    │  │
│  │ CRUD      │  │ Filter    │  │ Management     │  │
│  └───────────┘  └───────────┘  └────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP API
┌──────────────────────▼──────────────────────────────┐
│                  skill-cli (TypeScript → Binary)     │
│  ┌──────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐  │
│  │ list │ │ install  │ │ upgrade  │ │  config   │  │
│  └──────┘ └────┬────┘ └──────────┘ └───────────┘  │
│                 │                                    │
│  ┌──────────────▼────────────────────────────────┐  │
│  │           Multi-Platform Installer            │  │
│  │  Kiro │ Claude │ Codex │ Cursor │ Desktop    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## platform/ — SKILL 管理平台

Next.js 15 App Router，提供：

- `GET /api/skills` — 列表/搜索 SKILL（?q=&tag=）
- `GET /api/skills/:id` — 获取 SKILL 详情（含文件内容）
- `POST /api/skills` — 发布新 SKILL
- `GET /api/cli/latest?platform=&arch=` — 获取最新 CLI 版本信息

```bash
cd platform && npm install && npm run dev
```

## cli/ — 命令行工具

TypeScript 实现，esbuild 打包，Node.js SEA 生成多平台可执行文件。

### 命令

```bash
skill list [query]                # 搜索/列出可用 SKILL
skill info <name>                 # 查看 SKILL 详情
skill install <name> [--platform kiro,claude,...]  # 安装到 AI 平台
skill config                      # 查看配置
skill config set apiBase=https://your-server.com   # 设置 API 地址
skill upgrade                     # 检查 CLI 更新
```

### 支持的目标平台

| 平台 | 安装路径 |
|------|----------|
| Kiro | `~/.kiro/skills/<name>/` |
| Claude | `~/.claude/skills/<name>/` |
| Codex | `~/.codex/skills/<name>/` |
| Cursor | `~/.cursor/skills/<name>/` |
| Claude Desktop | macOS: `~/Library/Application Support/Claude/skills/`<br>Win: `%APPDATA%/Claude/skills/`<br>Linux: `~/.config/claude-desktop/skills/` |

### 构建可执行文件

```bash
cd cli && npm install && npm run build    # 打包 JS
npm run compile                           # 生成当前平台可执行文件 (Node SEA)
```

多平台交叉编译需在 CI 中各平台分别执行 `npm run compile`。

## 开发

```bash
# 启动平台
cd platform && npm run dev

# 配置 CLI 指向本地
cd cli && node dist/index.cjs config set apiBase=http://localhost:3000

# 测试 CLI
node dist/index.cjs list
```
