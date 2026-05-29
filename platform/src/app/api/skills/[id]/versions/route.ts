import { NextRequest, NextResponse } from "next/server";
import { getSkillVersions } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versions = await getSkillVersions(id);
  return NextResponse.json(versions);
}
