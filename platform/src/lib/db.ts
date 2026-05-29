import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Skill, CliRelease } from "@/types";

function getDb() {
  return getCloudflareContext().env.DB;
}

function rowToSkill(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    version: row.version as string,
    author: row.author as string,
    tags: JSON.parse(row.tags as string),
    platforms: JSON.parse(row.platforms as string),
    files: JSON.parse(row.files as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getSkills(): Promise<Skill[]> {
  const { results } = await getDb().prepare("SELECT * FROM skills ORDER BY created_at DESC").all();
  return results.map(rowToSkill);
}

export async function getSkillById(id: string): Promise<Skill | undefined> {
  const row = await getDb().prepare("SELECT * FROM skills WHERE id = ?1 OR name = ?1").bind(id).first();
  return row ? rowToSkill(row) : undefined;
}

export async function searchSkills(q?: string, tag?: string): Promise<Skill[]> {
  let sql = "SELECT * FROM skills WHERE 1=1";
  const params: string[] = [];
  if (q) {
    sql += " AND (name LIKE ?1 OR description LIKE ?1)";
    params.push(`%${q}%`);
  }
  if (tag) {
    sql += ` AND tags LIKE ?${params.length + 1}`;
    params.push(`%"${tag}"%`);
  }
  sql += " ORDER BY created_at DESC";
  const { results } = await getDb().prepare(sql).bind(...params).all();
  return results.map(rowToSkill);
}

export async function createSkill(skill: Skill): Promise<Skill> {
  await getDb()
    .prepare(
      "INSERT INTO skills (id, name, description, version, author, tags, platforms, files, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
    )
    .bind(
      skill.id, skill.name, skill.description, skill.version, skill.author,
      JSON.stringify(skill.tags), JSON.stringify(skill.platforms), JSON.stringify(skill.files),
      skill.createdAt, skill.updatedAt
    )
    .run();
  return skill;
}

export async function upsertSkill(skill: Skill): Promise<Skill> {
  const existing = await getSkillById(skill.name);
  if (existing) {
    await getDb()
      .prepare(
        "UPDATE skills SET description=?1, version=?2, author=?3, tags=?4, platforms=?5, files=?6, updated_at=?7 WHERE id=?8"
      )
      .bind(
        skill.description, skill.version, skill.author,
        JSON.stringify(skill.tags), JSON.stringify(skill.platforms), JSON.stringify(skill.files),
        skill.updatedAt, existing.id
      )
      .run();
    return { ...existing, ...skill, id: existing.id };
  }
  return createSkill(skill);
}

export async function deleteSkill(id: string): Promise<boolean> {
  const result = await getDb().prepare("DELETE FROM skills WHERE id = ?1 OR name = ?1").bind(id).run();
  return result.meta.changes > 0;
}

export async function getReleases(): Promise<CliRelease[]> {
  const { results } = await getDb().prepare("SELECT * FROM cli_releases ORDER BY version DESC").all();
  return results.map((r: Record<string, unknown>) => ({
    version: r.version as string,
    platform: r.platform as CliRelease["platform"],
    arch: r.arch as CliRelease["arch"],
    downloadUrl: r.download_url as string,
    sha256: r.sha256 as string,
  }));
}

export async function getLatestRelease(platform?: string, arch?: string): Promise<CliRelease | null> {
  let sql = "SELECT * FROM cli_releases WHERE 1=1";
  const params: string[] = [];
  if (platform) {
    sql += ` AND platform = ?${params.length + 1}`;
    params.push(platform);
  }
  if (arch) {
    sql += ` AND arch = ?${params.length + 1}`;
    params.push(arch);
  }
  sql += " ORDER BY version DESC LIMIT 1";
  const r = await getDb().prepare(sql).bind(...params).first();
  if (!r) return null;
  return {
    version: r.version as string,
    platform: r.platform as CliRelease["platform"],
    arch: r.arch as CliRelease["arch"],
    downloadUrl: r.download_url as string,
    sha256: r.sha256 as string,
  };
}
