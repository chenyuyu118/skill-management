# skill-cli

SKILL 管理命令行工具 — 安装、发布、拉取、推送 AI 技能到多个 AI 平台。

## 安装

### 方式 1：npx 直接使用（推荐，跨平台）

先配置 registry（一次性）：

```bash
npm config set @suxin:registry http://192.168.1.244:8081/repository/npm-hosted/
```

然后直接运行：

```bash
npx @suxin/cli-management list
```

或全局安装：

```bash
npm install -g @suxin/cli-management
skill list
```

### 方式 2：原生二进制

从 [Releases](https://github.com/your-org/skill-management/releases) 下载对应平台的可执行文件：

| 平台 | 文件 |
|------|------|
| macOS Apple Silicon | `skill-darwin-arm64` |
| macOS Intel | `skill-darwin-x64` |
| Linux x64 | `skill-linux-x64` |
| Linux ARM64 | `skill-linux-arm64` |
| Windows x64 | `skill-windows-x64.exe` |

```bash
# macOS / Linux
chmod +x skill-darwin-arm64
sudo mv skill-darwin-arm64 /usr/local/bin/skill
```

### 方式 3：一键安装脚本

```bash
# macOS / Linux
curl -fsSL https://your-platform.com/api/cli/install?platform=macos&arch=arm64 | sh

# Windows (PowerShell)
irm "https://your-platform.com/api/cli/install?platform=win&arch=x64" | iex
```

## 配置

首次使用需指向你的 SKILL 平台：

```bash
skill config set apiBase=https://your-platform.com
```

查看当前配置：

```bash
skill config
```

## 命令

### 搜索和浏览

```bash
skill list                  # 列出所有可用技能
skill list "lark"           # 按关键词搜索
skill info <name>           # 查看技能详情（版本、作者、文件列表）
```

### 安装和卸载

```bash
skill install <name>                          # 安装到所有 AI 平台
skill install <name> --platform kiro,claude   # 只安装到指定平台
skill install <name> --scope project          # 安装到当前项目（而非全局）
skill uninstall <name>                        # 从所有平台移除
skill installed                               # 列出本地已安装的技能
```

支持的目标平台：`kiro`、`claude`、`codex`、`cursor`、`claude-desktop`

### 发布和推送

```bash
skill publish [dir]         # 发布本地目录的技能（首次发布）
skill push [dir]            # 推送到平台（存在则更新，不存在则创建）
```

目录中需包含 `SKILL.md`，frontmatter 格式：

```markdown
---
name: my-skill
description: 这个技能的作用
version: 1.0.0
author: your-name
tags: productivity, automation
---

# My Skill

技能正文内容...
```

### 拉取和更新

```bash
skill pull <name>               # 拉取远端技能到 ./<name>/ 目录
skill pull <name> --dir ./src   # 拉取到指定目录
skill update <name>             # 重新拉取最新版并覆盖已安装的技能
```

### 管理

```bash
skill remove <name>         # 从平台删除技能（远端）
skill upgrade               # 检查 CLI 自身更新
skill self-uninstall        # 卸载 CLI 及配置
```

## 开发

需要 [Bun](https://bun.sh) >= 1.0：

```bash
# 安装依赖
bun install

# 构建 JS（用于 npm 发布 / npx）
bun run build

# 编译当前平台原生二进制
bun run compile

# 编译全平台二进制（CI 用）
bun run compile:all
```

### 关于二进制体积

`bun build --compile` 生成的二进制约 61MB，其中 ~60MB 是 Bun 运行时。这是 Bun 单文件可执行方案的固有开销。如需更小体积：

- 使用 `npx` 方式（JS bundle 仅 14KB）
- 分发后用 UPX 压缩：`upx --best dist/skill`（可压缩至 ~20MB）
- 等待 Bun 官方的 [minimal runtime](https://github.com/oven-sh/bun/issues/14546) 支持

## 发布到 Nexus

```bash
# 1. 登录 Nexus npm registry
npm login --registry=http://192.168.1.244:8081/repository/npm-hosted/

# 2. 构建并发布
bun run build
npm publish

# 3. 用户侧配置 registry 后即可使用
npm config set @suxin:registry http://192.168.1.244:8081/repository/npm-hosted/
npx @suxin/cli-management list
```

## 工作流示例

```bash
# 1. 从平台拉取一个技能到本地编辑
skill pull my-skill

# 2. 修改文件...
vim my-skill/SKILL.md

# 3. 推送回平台
skill push ./my-skill

# 4. 更新所有已安装的本地副本
skill update my-skill
```
