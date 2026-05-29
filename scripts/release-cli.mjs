#!/usr/bin/env node
// 一站式发布 skill-cli 到 Cloudflare R2 + 写入 D1 release 记录
// 用法: node scripts/release-cli.mjs [version]
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI_DIR = join(ROOT, "cli");
const PLATFORM_DIR = join(ROOT, "platform");
const BUCKET = "skill-cli-releases";
const VERSION = process.argv[2] || JSON.parse(readFileSync(join(CLI_DIR, "package.json"))).version;
const TAG = `v${VERSION}`; // 路径前缀，与 download/page.tsx 一致

// key 必须与 download/page.tsx 中一致
const TARGETS = {
  "skill-darwin-arm64": ["macos", "arm64"],
  "skill-darwin-x64": ["macos", "x64"],
  "skill-linux-x64": ["linux", "x64"],
  "skill-linux-arm64": ["linux", "arm64"],
  "skill-windows-x64.exe": ["win", "x64"],
};

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const runQuiet = (cmd, cwd) => execSync(cmd, { cwd, stdio: ["ignore", "ignore", "inherit"] });

console.log(`▶ 发布 skill-cli v${VERSION}`);

console.log("▶ [1/4] 编译全平台二进制...");
run("bun run compile:all", CLI_DIR);

console.log("▶ [2/4] 确保 R2 桶存在...");
try { runQuiet(`npx wrangler r2 bucket create ${BUCKET}`, PLATFORM_DIR); }
catch { console.log("  桶已存在，跳过"); }

console.log("▶ [3/4] 上传二进制到 R2...");
for (const key of Object.keys(TARGETS)) {
  const file = join(CLI_DIR, "dist", key);
  if (!existsSync(file)) { console.error(`  ✘ 缺少文件 ${file}`); process.exit(1); }
  console.log(`  ↑ ${key}`);
  runQuiet(`npx wrangler r2 object put ${BUCKET}/${TAG}/${key} --file ${file} --remote`, PLATFORM_DIR);
}

console.log("▶ [4/4] 写入 D1 release 记录...");
for (const [key, [platform, arch]] of Object.entries(TARGETS)) {
  const url = `/api/cli/download/${TAG}/${key}`;
  const sha256 = createHash("sha256").update(readFileSync(join(CLI_DIR, "dist", key))).digest("hex");
  const sql = `INSERT INTO cli_releases (version, platform, arch, download_url, sha256) VALUES ('${VERSION}','${platform}','${arch}','${url}','${sha256}') ON CONFLICT(version,platform,arch) DO UPDATE SET download_url=excluded.download_url, sha256=excluded.sha256;`;
  runQuiet(`npx wrangler d1 execute DB --remote --command "${sql}"`, PLATFORM_DIR);
  console.log(`  ✓ ${platform}/${arch} -> ${url}`);
}

console.log(`✅ 发布完成：v${VERSION}（5 个平台已上传并入库）`);
