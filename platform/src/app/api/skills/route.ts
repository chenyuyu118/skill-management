import { NextRequest, NextResponse } from "next/server";
import { searchSkills, upsertSkill, getSkillById } from "@/lib/db";
import { Skill } from "@/types";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const skills = await searchSkills(searchParams.get("q") || undefined, searchParams.get("tag") || undefined);
  return NextResponse.json(skills);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const skill: Skill = {
    id: crypto.randomUUID(),
    name: body.name as string,
    description: (body.description as string) || "",
    version: (body.version as string) || "1.0.0",
    author: (body.author as string) || "anonymous",
    tags: (body.tags as string[]) || [],
    platforms: (body.platforms as string[]) || ["kiro", "claude", "codex", "cursor", "claude-desktop"],
    files: (body.files as Skill["files"]) || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existing = await getSkillById(body.name as string);
  const result = await upsertSkill(skill);
  const status = existing ? 200 : 201;
  return NextResponse.json(result, { status });
}
