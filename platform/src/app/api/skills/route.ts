import { NextRequest, NextResponse } from "next/server";
import { searchSkills, upsertSkill, getSkillById } from "@/lib/db";
import { Skill, SkillFile } from "@/types";
import crypto from "crypto";

// 校验 skill 名称与文件路径，拒绝路径穿越/绝对路径/非法字符（分发安全）
function validate(name: string, files: SkillFile[]): string | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(name) || name.startsWith(".")) return `非法的 skill 名称: ${name}`;
  for (const f of files) {
    const p = f.path ?? "";
    if (!p || p.startsWith("/") || p.includes("..") || /[\\:]/.test(p) || /^[a-zA-Z]:/.test(p)) {
      return `非法的文件路径: ${p}`;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const skills = await searchSkills(searchParams.get("q") || undefined, searchParams.get("tag") || undefined);
  return NextResponse.json(skills);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const files = (body.files as SkillFile[]) || [];
  const invalid = validate(body.name as string, files);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const skill: Skill = {
    id: crypto.randomUUID(),
    name: body.name as string,
    description: (body.description as string) || "",
    version: (body.version as string) || "1.0.0",
    author: (body.author as string) || "anonymous",
    tags: (body.tags as string[]) || [],
    platforms: (body.platforms as string[]) || ["kiro", "claude", "codex", "cursor", "claude-desktop"],
    files,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existing = await getSkillById(body.name as string);
  const result = await upsertSkill(skill);
  const status = existing ? 200 : 201;
  return NextResponse.json(result, { status });
}
