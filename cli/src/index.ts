#!/usr/bin/env node
import { listSkills, getSkill, getSkillVersions, publishSkill, deleteRemoteSkill } from "./api";
import { installSkill, uninstallSkill, PLATFORMS } from "./installer";
import { getConfig, saveConfig } from "./config";
import { checkUpgrade } from "./upgrade";
import { readSkillDir } from "./publish";
import { pullToDir } from "./pull";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const [cmd, ...args] = process.argv.slice(2);

// 解析 name@version；无 @ 时 version 为 undefined（取最新）
function parseRef(ref: string): { name: string; version?: string } {
  const at = ref.lastIndexOf("@");
  return at > 0 ? { name: ref.slice(0, at), version: ref.slice(at + 1) } : { name: ref };
}

function getInstalledSkills(): { platform: string; name: string; dir: string }[] {
  const home = homedir();
  const dirs: Record<string, string> = {
    kiro: join(home, ".kiro", "skills"),
    claude: join(home, ".claude", "skills"),
    codex: join(home, ".codex", "skills"),
    cursor: join(home, ".cursor", "skills"),
  };
  const results: { platform: string; name: string; dir: string }[] = [];
  for (const [p, d] of Object.entries(dirs)) {
    if (!existsSync(d)) continue;
    for (const name of readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)) {
      results.push({ platform: p, name, dir: join(d, name) });
    }
  }
  return results;
}

async function main() {
  switch (cmd) {
    case "list": {
      const skills = await listSkills(args[0]);
      if (!skills.length) { console.log("暂无技能。"); break; }
      for (const s of skills) console.log(`  ${s.name} - ${s.description}`);
      break;
    }
    case "install": {
      const [ref, ...rest] = args;
      if (!ref) { console.error("用法: skill install <name[@version]> [--platform kiro,claude,...] [--scope global|project]"); process.exit(1); }
      const { name, version } = parseRef(ref);
      const skill = await getSkill(name, version);
      const pf = rest.indexOf("--platform");
      const targets = pf >= 0 ? rest[pf + 1].split(",") as typeof PLATFORMS : PLATFORMS;
      const sf = rest.indexOf("--scope");
      const scope = (sf >= 0 ? rest[sf + 1] : "project") as "global" | "project";
      for (const t of targets) {
        const dir = installSkill(t, skill.name, skill.files, scope);
        console.log(`  ✓ [${scope}] 已安装 ${skill.name}@${skill.version} 到 ${t}: ${dir}`);
      }
      break;
    }
    case "uninstall": {
      const [name, ...rest] = args;
      if (!name) { console.error("用法: skill uninstall <name> [--platform kiro,claude,...]"); process.exit(1); }
      const pf = rest.indexOf("--platform");
      const targets = pf >= 0 ? rest[pf + 1].split(",") as typeof PLATFORMS : PLATFORMS;
      const sf = rest.indexOf("--scope");
      const scope = (sf >= 0 ? rest[sf + 1] : "project") as "global" | "project";
      for (const t of targets) {
        const dir = uninstallSkill(t, name, scope);
        if (dir) console.log(`  ✓ 已从 ${t} 移除: ${dir}`);
      }
      break;
    }
    case "info": {
      if (!args[0]) { console.error("用法: skill info <name[@version]>"); process.exit(1); }
      const { name, version } = parseRef(args[0]);
      const skill = await getSkill(name, version);
      console.log(`名称: ${skill.name}\n版本: ${skill.version}\n作者: ${skill.author}\n描述: ${skill.description}\n平台: ${skill.platforms.join(", ")}\n文件: ${skill.files.map((f: any) => f.path).join(", ")}`);
      break;
    }
    case "versions": {
      if (!args[0]) { console.error("用法: skill versions <name>"); process.exit(1); }
      const { name } = parseRef(args[0]);
      const versions = await getSkillVersions(name);
      if (!versions.length) { console.log("暂无版本。"); break; }
      console.log(`${name} 的版本（最新在前）：`);
      for (const v of versions) console.log(`  ${v.version}  ${new Date(v.createdAt).toLocaleDateString()}`);
      break;
    }
    case "publish":
    case "push": {
      const dir = args[0] || ".";
      const data = readSkillDir(dir);
      const skill = await publishSkill(data);
      console.log(`  ✓ 已发布: ${skill.name}@${skill.version} (${skill.id})`);
      break;
    }
    case "pull": {
      const ref = args[0];
      if (!ref) { console.error("用法: skill pull <name[@version]> [--dir ./target]"); process.exit(1); }
      const { name, version } = parseRef(ref);
      const df = args.indexOf("--dir");
      const targetDir = df >= 0 ? args[df + 1] : `./${name}`;
      const skill = await getSkill(name, version);
      pullToDir(skill.files, targetDir);
      console.log(`  ✓ 已拉取 ${skill.name}@${skill.version} 到 ${targetDir}`);
      break;
    }
    case "update": {
      const name = args[0];
      if (!name) { console.error("用法: skill update <name> [--platform kiro,claude,...]"); process.exit(1); }
      const skill = await getSkill(name);
      const pf = args.indexOf("--platform");
      const targets = pf >= 0 ? args[pf + 1].split(",") as typeof PLATFORMS : PLATFORMS;
      const sf = args.indexOf("--scope");
      const scope = (sf >= 0 ? args[sf + 1] : "project") as "global" | "project";
      for (const t of targets) {
        const dir = installSkill(t, skill.name, skill.files, scope);
        console.log(`  ✓ 已更新 ${t}: ${dir}`);
      }
      break;
    }
    case "installed": {
      const installed = getInstalledSkills();
      if (!installed.length) { console.log("暂无已安装的技能。"); break; }
      const grouped = new Map<string, string[]>();
      for (const i of installed) {
        if (!grouped.has(i.name)) grouped.set(i.name, []);
        grouped.get(i.name)!.push(i.platform);
      }
      for (const [name, platforms] of grouped) {
        console.log(`  ${name}  [${platforms.join(", ")}]`);
      }
      break;
    }
    case "remove": {
      const name = args[0];
      if (!name) { console.error("用法: skill remove <name>"); process.exit(1); }
      await deleteRemoteSkill(name);
      console.log(`  ✓ 已从平台删除: ${name}`);
      break;
    }
    case "config": {
      if (args[0] === "set" && args[1]) {
        const [key, val] = args[1].split("=");
        saveConfig({ [key]: val });
        console.log(`已设置 ${key} = ${val}`);
      } else {
        console.log(JSON.stringify(getConfig(), null, 2));
      }
      break;
    }
    case "upgrade":
      await checkUpgrade();
      break;
    case "self-uninstall": {
      const { unlinkSync, rmSync, existsSync: ex } = await import("fs");
      const configDir = join(homedir(), ".skill-cli");
      if (ex(configDir)) rmSync(configDir, { recursive: true });
      console.log("  ✓ 已移除配置: ~/.skill-cli");
      const bin = process.argv[0];
      if (!bin.includes("node")) {
        try { unlinkSync(bin); console.log(`  ✓ 已移除: ${bin}`); } catch { console.log(`  ⚠ 无法移除，请手动执行: sudo rm ${bin}`); }
      } else {
        console.log("  ℹ 通过 node 运行，请手动移除 dist/");
      }
      break;
    }
    default:
      console.log(`skill v0.1.0

用法:
  skill list [query]              搜索/列出可用技能
  skill info <name[@version]>     查看技能详情（可指定版本）
  skill versions <name>           查看技能的版本历史
  skill install <name[@version]>  安装技能到 AI 平台（可指定版本）
  skill uninstall <name> [opts]   从 AI 平台移除技能
  skill publish [dir]             发布本地目录的技能（版本不可覆盖）
  skill push [dir]                推送本地目录到平台（同 publish）
  skill pull <name[@version]>     拉取远端技能到本地目录（可指定版本）
  skill update <name>             更新已安装的技能到最新版
  skill installed                 列出本地已安装的技能
  skill remove <name>             从平台删除技能
  skill config                    查看配置
  skill config set key=value      设置配置
  skill upgrade                   检查 CLI 更新
  skill self-uninstall            卸载 skill-cli

选项:
  --platform kiro,claude,codex,cursor,claude-desktop
  --scope    project（默认，当前项目）或 global（用户主目录）
`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
