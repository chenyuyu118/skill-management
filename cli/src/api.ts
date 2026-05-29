import { getConfig } from "./config";

async function api(path: string, options?: RequestInit) {
  const { apiBase } = getConfig();
  const res = await fetch(`${apiBase}${path}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function publishSkill(data: { name: string; description: string; version?: string; author?: string; tags?: string[]; files: { path: string; content: string }[] }) {
  return api("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function listSkills(query?: string) {
  const q = query ? `?q=${encodeURIComponent(query)}` : "";
  return api(`/api/skills${q}`);
}

export async function getSkill(id: string) {
  return api(`/api/skills/${encodeURIComponent(id)}`);
}

export async function deleteRemoteSkill(id: string) {
  return api(`/api/skills/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getLatestCli() {
  const p = process.platform === "win32" ? "win" : process.platform === "darwin" ? "macos" : "linux";
  const a = process.arch === "arm64" ? "arm64" : "x64";
  return api(`/api/cli/latest?platform=${p}&arch=${a}`);
}
