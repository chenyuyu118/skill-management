export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  platforms: string[]; // kiro, claude, codex, cursor, claude-desktop
  files: SkillFile[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillFile {
  path: string; // relative path within skill dir
  content: string;
}

export interface CliRelease {
  version: string;
  platform: "win" | "macos" | "linux";
  arch: "x64" | "arm64";
  downloadUrl: string;
  sha256: string;
}
