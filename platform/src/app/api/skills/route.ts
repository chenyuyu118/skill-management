import { NextRequest, NextResponse } from "next/server";
import { searchSkills, upsertSkill, getSkillById } from "@/lib/db";
import { Skill } from "@/types";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const skills = searchSkills(searchParams.get("q") || undefined, searchParams.get("tag") || undefined);
  return NextResponse.json(skills);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const skill: Skill = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description || "",
    version: body.version || "1.0.0",
    author: body.author || "anonymous",
    tags: body.tags || [],
    platforms: body.platforms || ["kiro", "claude", "codex", "cursor", "claude-desktop"],
    files: body.files || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const result = upsertSkill(skill);
  const existing = getSkillById(body.name);
  const status = existing && existing.id !== skill.id ? 200 : 201;
  return NextResponse.json(result, { status });
}
