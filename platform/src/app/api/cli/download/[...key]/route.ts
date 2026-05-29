import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");
  const obj = await getCloudflareContext().env.CLI_BUCKET.get(objectKey);
  if (!obj) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(obj.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${key[key.length - 1]}"`,
      "Content-Length": obj.size.toString(),
    },
  });
}
