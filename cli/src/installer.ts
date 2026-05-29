import { homedir, platform } from "os";
import { join, resolve, relative, isAbsolute } from "path";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";

interface SkillFile {
  path: string;
  content: string;
}

// 确保目标路径不会逃逸出 skill 安装目录（防路径穿越）
function safeResolve(dir: string, filePath: string): string {
  if (isAbsolute(filePath)) throw new Error(`不安全的文件路径（绝对路径）: ${filePath}`);
  const target = resolve(dir, filePath);
  const rel = relative(dir, target);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`不安全的文件路径（越界）: ${filePath}`);
  return target;
}

type Platform = "kiro" | "claude" | "codex" | "cursor" | "claude-desktop";
type Scope = "global" | "project";

function getGlobalDir(target: Platform): string {
  const home = homedir();
  switch (target) {
    case "kiro": return join(home, ".kiro", "skills");
    case "claude": return join(home, ".claude", "skills");
    case "codex": return join(home, ".codex", "skills");
    case "cursor": return join(home, ".cursor", "skills");
    case "claude-desktop":
      if (platform() === "win32") return join(home, "AppData", "Roaming", "Claude", "skills");
      if (platform() === "darwin") return join(home, "Library", "Application Support", "Claude", "skills");
      return join(home, ".config", "claude-desktop", "skills");
  }
}

function getProjectDir(target: Platform): string {
  const cwd = process.cwd();
  switch (target) {
    case "kiro": return join(cwd, ".kiro", "skills");
    case "claude": return join(cwd, ".claude", "skills");
    case "codex": return join(cwd, ".codex", "skills");
    case "cursor": return join(cwd, ".cursor", "skills");
    case "claude-desktop": return join(cwd, ".claude", "skills");
  }
}

export function installSkill(target: Platform, skillName: string, files: SkillFile[], scope: Scope = "global") {
  const baseDir = scope === "project" ? getProjectDir(target) : getGlobalDir(target);
  const dir = join(baseDir, skillName);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const filePath = safeResolve(dir, f.path);
    const fileDir = join(filePath, "..");
    if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
    writeFileSync(filePath, f.content);
  }
  return dir;
}

export function uninstallSkill(target: Platform, skillName: string, scope: Scope = "global"): string | null {
  const baseDir = scope === "project" ? getProjectDir(target) : getGlobalDir(target);
  const dir = join(baseDir, skillName);
  if (!existsSync(dir)) return null;
  rmSync(dir, { recursive: true });
  return dir;
}

export const PLATFORMS: Platform[] = ["kiro", "claude", "codex", "cursor", "claude-desktop"];
