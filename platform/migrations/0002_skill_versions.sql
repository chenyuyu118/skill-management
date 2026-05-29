-- 不可变版本快照表：每个 (skill_id, version) 一条，永不覆盖
CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT DEFAULT '',
  author TEXT DEFAULT 'anonymous',
  tags TEXT DEFAULT '[]',
  platforms TEXT DEFAULT '[]',
  files TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  UNIQUE(skill_id, version)
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);

-- 回填：把现有 skills 的当前状态作为各自的首个版本快照
INSERT OR IGNORE INTO skill_versions (id, skill_id, name, version, description, author, tags, platforms, files, created_at)
SELECT id || ':' || version, id, name, version, description, author, tags, platforms, files, created_at
FROM skills;
