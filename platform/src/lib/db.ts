import Database from "better-sqlite3";
import path from "path";
import { Skill, SkillFile, CliRelease } from "@/types";

const DB_PATH = path.join(process.cwd(), "data", "skills.db");

function getDb() {
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      version TEXT DEFAULT '1.0.0',
      author TEXT DEFAULT 'anonymous',
      tags TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      files TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cli_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      platform TEXT NOT NULL,
      arch TEXT NOT NULL,
      download_url TEXT NOT NULL,
      sha256 TEXT DEFAULT '',
      UNIQUE(version, platform, arch)
    );
  `);
  return db;
}

function rowToSkill(row: any): Skill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    author: row.author,
    tags: JSON.parse(row.tags),
    platforms: JSON.parse(row.platforms),
    files: JSON.parse(row.files),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getSkills(): Skill[] {
  return getDb().prepare("SELECT * FROM skills ORDER BY created_at DESC").all().map(rowToSkill);
}

export function getSkillById(id: string): Skill | undefined {
  const row = getDb().prepare("SELECT * FROM skills WHERE id = ? OR name = ?").get(id, id);
  return row ? rowToSkill(row) : undefined;
}

export function searchSkills(q?: string, tag?: string): Skill[] {
  let sql = "SELECT * FROM skills WHERE 1=1";
  const params: any[] = [];
  if (q) { sql += " AND (name LIKE ? OR description LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  if (tag) { sql += " AND tags LIKE ?"; params.push(`%"${tag}"%`); }
  sql += " ORDER BY created_at DESC";
  return getDb().prepare(sql).all(...params).map(rowToSkill);
}

export function createSkill(skill: Skill): Skill {
  getDb().prepare(
    "INSERT INTO skills (id, name, description, version, author, tags, platforms, files, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(skill.id, skill.name, skill.description, skill.version, skill.author, JSON.stringify(skill.tags), JSON.stringify(skill.platforms), JSON.stringify(skill.files), skill.createdAt, skill.updatedAt);
  return skill;
}

export function upsertSkill(skill: Skill): Skill {
  const existing = getSkillById(skill.name);
  if (existing) {
    getDb().prepare(
      "UPDATE skills SET description=?, version=?, author=?, tags=?, platforms=?, files=?, updated_at=? WHERE id=?"
    ).run(skill.description, skill.version, skill.author, JSON.stringify(skill.tags), JSON.stringify(skill.platforms), JSON.stringify(skill.files), skill.updatedAt, existing.id);
    return { ...existing, ...skill, id: existing.id };
  }
  return createSkill(skill);
}

export function deleteSkill(id: string): boolean {
  const result = getDb().prepare("DELETE FROM skills WHERE id = ? OR name = ?").run(id, id);
  return result.changes > 0;
}

export function getReleases(): CliRelease[] {
  return getDb().prepare("SELECT * FROM cli_releases ORDER BY version DESC").all().map((r: any) => ({
    version: r.version, platform: r.platform, arch: r.arch, downloadUrl: r.download_url, sha256: r.sha256,
  }));
}

export function getLatestRelease(platform?: string, arch?: string): CliRelease | null {
  let sql = "SELECT * FROM cli_releases WHERE 1=1";
  const params: any[] = [];
  if (platform) { sql += " AND platform = ?"; params.push(platform); }
  if (arch) { sql += " AND arch = ?"; params.push(arch); }
  sql += " ORDER BY version DESC LIMIT 1";
  const r: any = getDb().prepare(sql).get(...params);
  return r ? { version: r.version, platform: r.platform, arch: r.arch, downloadUrl: r.download_url, sha256: r.sha256 } : null;
}
