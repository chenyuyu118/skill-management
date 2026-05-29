import { getLatestCli, authHeaders } from "./api";
import { getConfig } from "./config";
import { execSync } from "child_process";
import { writeFileSync, chmodSync, renameSync, unlinkSync } from "fs";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const VERSION = "0.1.0";

export { VERSION };

export async function checkUpgrade() {
  console.log(`Current version: v${VERSION}`);
  console.log("Checking for updates...");

  const latest = await getLatestCli();
  if (!latest) { console.log("No release info available from server."); return; }
  if (latest.version === VERSION) { console.log("✓ Already up to date."); return; }

  // downloadUrl 可能是相对路径（/api/cli/download/...），需拼接 apiBase
  const url = /^https?:\/\//.test(latest.downloadUrl)
    ? latest.downloadUrl
    : `${getConfig().apiBase}${latest.downloadUrl}`;

  console.log(`New version available: v${latest.version}`);
  console.log(`Downloading from: ${url}`);

  const tmpFile = join(tmpdir(), `skill-update-${Date.now()}`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());

  // 完整性校验：服务端提供 sha256 时必须匹配，防止下载被篡改
  if (latest.sha256) {
    const actual = createHash("sha256").update(buf).digest("hex");
    if (actual !== latest.sha256) {
      throw new Error(`完整性校验失败：sha256 不匹配\n  期望: ${latest.sha256}\n  实际: ${actual}`);
    }
    console.log("✓ 完整性校验通过 (sha256)");
  } else {
    console.warn("⚠ 服务端未提供 sha256，跳过完整性校验");
  }

  writeFileSync(tmpFile, buf);
  chmodSync(tmpFile, 0o755);

  // Replace current binary
  const currentBin = process.argv[0];
  // If running via node (dev mode), can't self-replace
  if (currentBin.includes("node")) {
    console.log(`✓ Downloaded to: ${tmpFile}`);
    console.log(`  Move manually: mv ${tmpFile} /usr/local/bin/skill`);
    return;
  }

  const backupFile = `${currentBin}.bak`;
  try {
    renameSync(currentBin, backupFile);
    renameSync(tmpFile, currentBin);
    chmodSync(currentBin, 0o755);
    unlinkSync(backupFile);
    console.log(`✓ Upgraded to v${latest.version}`);
  } catch (e: any) {
    // Rollback
    try { renameSync(backupFile, currentBin); } catch {}
    try { unlinkSync(tmpFile); } catch {}
    throw new Error(`Upgrade failed: ${e.message}. Try: sudo skill upgrade`);
  }
}
