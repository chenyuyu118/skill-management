import { NextRequest, NextResponse } from "next/server";
import { getSkillById, getSkillVersion, deleteSkill } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const version = req.nextUrl.searchParams.get("version");
  const skill = version ? await getSkillVersion(id, version) : await getSkillById(id);
  if (!skill) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(skill);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteSkill(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
