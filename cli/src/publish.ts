import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

interface SkillData {
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags?: string[];
  files: { path: string; content: string }[];
}

function collectFiles(dir: string, base: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push({ path: rel, content: readFileSync(full, "utf-8") });
    }
  }
  return files;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return meta;
}

export function readSkillDir(dir: string): SkillData {
  const files = collectFiles(dir, dir);
  const skillMd = files.find((f) => f.path === "SKILL.md");
  if (!skillMd) throw new Error(`No SKILL.md found in ${dir}`);

  const meta = parseFrontmatter(skillMd.content);
  if (!meta.name) throw new Error("SKILL.md missing 'name' in frontmatter");

  return {
    name: meta.name,
    description: meta.description || "",
    version: meta.version,
    author: meta.author,
    tags: meta.tags?.split(",").map((t) => t.trim()),
    files,
  };
}
