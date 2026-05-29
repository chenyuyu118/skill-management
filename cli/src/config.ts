import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const CONFIG_DIR = join(homedir(), ".skill-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  apiBase: string;
  password?: string; // 平台访问密码（公司内部共享）
}

const DEFAULT_CONFIG: Config = { apiBase: "http://localhost:3000" };

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
}

export function saveConfig(cfg: Partial<Config>) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...getConfig(), ...cfg }, null, 2));
}
