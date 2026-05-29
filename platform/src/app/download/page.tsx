"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Platform = "macos" | "linux" | "win";
type Arch = "arm64" | "x64";

function detect(): { platform: Platform; arch: Arch } {
  const ua = navigator.userAgent.toLowerCase();
  const platform: Platform = ua.includes("win") ? "win" : ua.includes("mac") ? "macos" : "linux";
  const arch: Arch = ua.includes("arm64") || ua.includes("aarch64") ? "arm64" : "x64";
  return { platform, arch };
}

const installScripts: Record<Platform, (origin: string) => string> = {
  macos: (o) => `curl -fsSL ${o}/api/cli/install?platform=macos\\&arch=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/') | sh`,
  linux: (o) => `curl -fsSL ${o}/api/cli/install?platform=linux\\&arch=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/') | sh`,
  win: (o) => `irm "${o}/api/cli/install?platform=win&arch=x64" | iex`,
};

const downloads: Record<Platform, { label: string; key: string }[]> = {
  macos: [
    { label: "Apple Silicon (arm64)", key: "skill-darwin-arm64" },
    { label: "Intel (x64)", key: "skill-darwin-x64" },
  ],
  linux: [
    { label: "x64", key: "skill-linux-x64" },
    { label: "arm64", key: "skill-linux-arm64" },
  ],
  win: [{ label: "x64", key: "skill-windows-x64.exe" }],
};

const manualSteps: Record<Platform, string[]> = {
  macos: [
    "1. 下载对应架构的可执行文件（Apple Silicon 选 arm64，Intel 选 x64）",
    "2. 移动到 PATH 目录：mv skill-darwin-arm64 /usr/local/bin/skill",
    "3. 添加执行权限：chmod +x /usr/local/bin/skill",
    "4. 首次运行如遇安全提示：xattr -d com.apple.quarantine /usr/local/bin/skill",
  ],
  linux: [
    "1. 下载对应架构的可执行文件",
    "2. 移动到 PATH 目录：sudo mv skill-linux-x64 /usr/local/bin/skill",
    "3. 添加执行权限：chmod +x /usr/local/bin/skill",
  ],
  win: [
    "1. 下载 skill-windows-x64.exe",
    "2. 重命名为 skill.exe 并放入 PATH 目录（如 C:\\Users\\你的用户名\\AppData\\Local）",
    "3. 或添加所在目录到系统 PATH 环境变量",
  ],
};

export default function DownloadPage() {
  const [detected, setDetected] = useState<{ platform: Platform; arch: Arch } | null>(null);
  const [selected, setSelected] = useState<Platform>("macos");
  const [origin, setOrigin] = useState("");
  const [version, setVersion] = useState("");

  useEffect(() => {
    const d = detect();
    setDetected(d);
    setSelected(d.platform);
    setOrigin(window.location.origin);
    fetch("/api/cli/latest")
      .then((r) => r.json() as Promise<{ version?: string } | null>)
      .then((rel) => rel?.version && setVersion(rel.version))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Install skill-cli</h1>
        <p className="text-muted-foreground mt-1">一键安装命令行工具，管理和分发 AI Skills</p>
      </header>

      {detected && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">检测到系统：</span>
          <Badge>{detected.platform} / {detected.arch}</Badge>
        </div>
      )}

      <div className="flex gap-2">
        {(["macos", "linux", "win"] as Platform[]).map((p) => (
          <Button key={p} variant={selected === p ? "default" : "outline"} size="sm" onClick={() => setSelected(p)}>
            {p === "macos" ? "macOS" : p === "linux" ? "Linux" : "Windows"}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>快速安装</CardTitle>
          <CardDescription>在终端中执行以下命令</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">{origin ? installScripts[selected](origin) : "..."}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>手动安装</CardTitle>
          <CardDescription>下载可执行文件后按步骤安装</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {downloads[selected].map((d) => (
              <a key={d.key} href={version ? `/api/cli/download/v${version}/${d.key}` : undefined} download>
                <Button variant="outline" size="sm" disabled={!version}>↓ {d.label}</Button>
              </a>
            ))}
          </div>
          {manualSteps[selected].map((step, i) => (
            <p key={i} className="text-sm text-muted-foreground">{step}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配置</CardTitle>
          <CardDescription>安装后配置 API 地址指向本平台</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-sm">skill config set apiBase={origin || "https://your-platform.com"}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>常用命令</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-sm">{`skill list                    # 搜索/列出可用 Skills
skill info <name>             # 查看 Skill 详情
skill publish .               # 发布当前目录的 Skill
skill install <name> --platform kiro,claude
skill upgrade                 # 检查并更新 CLI`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
