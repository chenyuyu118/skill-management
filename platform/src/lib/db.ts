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

export async function deleteSkill(id: string): Promise<boolean> {
  const skill = await getSkillById(id);
  if (!skill) return false;
  await getDb().prepare("DELETE FROM skill_versions WHERE skill_id = ?1").bind(skill.id).run();
  const result = await getDb().prepare("DELETE FROM skills WHERE id = ?1").bind(skill.id).run();
  return result.meta.changes > 0;
}

// ---- 版本管理 ----

// 比较两个 semver：a>b 返回正，a<b 返回负，相等返回 0；非法版本按字符串兜底
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b);
    if (x !== y) return x - y;
  }
  return 0;
}

function rowToVersion(row: Record<string, unknown>): Skill {
  return {
    id: row.skill_id as string,
    name: row.name as string,
    description: row.description as string,
    version: row.version as string,
    author: row.author as string,
    tags: JSON.parse(row.tags as string),
    platforms: JSON.parse(row.platforms as string),
    files: JSON.parse(row.files as string),
    createdAt: row.created_at as string,
    updatedAt: row.created_at as string,
  };
}

// 列出某 skill 的全部版本（按 semver 降序）
export async function getSkillVersions(id: string): Promise<Skill[]> {
  const skill = await getSkillById(id);
  if (!skill) return [];
  const { results } = await getDb()
    .prepare("SELECT * FROM skill_versions WHERE skill_id = ?1")
    .bind(skill.id)
    .all();
  return results.map(rowToVersion).sort((a, b) => compareSemver(b.version, a.version));
}

// 取某 skill 的指定版本快照
export async function getSkillVersion(id: string, version: string): Promise<Skill | undefined> {
  const skill = await getSkillById(id);
  if (!skill) return undefined;
  const row = await getDb()
    .prepare("SELECT * FROM skill_versions WHERE skill_id = ?1 AND version = ?2")
    .bind(skill.id, version)
    .first();
  return row ? rowToVersion(row) : undefined;
}

// 版本化发布：插入不可变快照，拒绝重复版本，按最高 semver 更新 latest 指针
// 返回 { skill, created }；created=false 表示该版本号已存在（重复发布）
export async function publishVersion(skill: Skill): Promise<{ skill: Skill; created: boolean } | { error: string }> {
  const existing = await getSkillById(skill.name);
  const skillId = existing?.id ?? skill.id;

  // 拒绝重复版本（不可变）
  if (existing) {
    const dup = await getDb()
      .prepare("SELECT 1 FROM skill_versions WHERE skill_id = ?1 AND version = ?2")
      .bind(skillId, skill.version)
      .first();
    if (dup) return { error: `版本 ${skill.version} 已存在，不可覆盖` };
  }

  const db = getDb();
  // 写入不可变快照
  await db
    .prepare(
      "INSERT INTO skill_versions (id, skill_id, name, version, description, author, tags, platforms, files, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)"
    )
    .bind(
      `${skillId}:${skill.version}`, skillId, skill.name, skill.version, skill.description, skill.author,
      JSON.stringify(skill.tags), JSON.stringify(skill.platforms), JSON.stringify(skill.files), skill.createdAt
    )
    .run();

  // 计算 latest（最高 semver）并更新 skills 指针
  const versions = await db.prepare("SELECT version FROM skill_versions WHERE skill_id = ?1").bind(skillId).all();
  const latest = (versions.results as { version: string }[])
    .map((v) => v.version)
    .sort(compareSemver)
    .pop()!;
  const latestSkill = { ...skill, id: skillId, version: latest };

  if (existing) {
    // 仅当 latest 指向本次发布时才整体刷新指针内容
    const snap = latest === skill.version ? skill : await getSkillVersion(skill.name, latest);
    await db
      .prepare("UPDATE skills SET description=?1, version=?2, author=?3, tags=?4, platforms=?5, files=?6, updated_at=?7 WHERE id=?8")
      .bind(
        snap!.description, latest, snap!.author,
        JSON.stringify(snap!.tags), JSON.stringify(snap!.platforms), JSON.stringify(snap!.files),
        skill.updatedAt, skillId
      )
      .run();
    return { skill: latestSkill, created: false };
  }

  await createSkill({ ...skill, id: skillId });
  return { skill: latestSkill, created: true };
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
