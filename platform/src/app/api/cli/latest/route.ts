import { NextRequest, NextResponse } from "next/server";
import { getLatestRelease } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const release = await getLatestRelease(searchParams.get("platform") || undefined, searchParams.get("arch") || undefined);
  return NextResponse.json(release);
}
