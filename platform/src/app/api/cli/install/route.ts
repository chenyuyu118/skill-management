import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const platform = searchParams.get("platform") || "macos";
  const arch = searchParams.get("arch") || "arm64";

  const script = platform === "win"
    ? `# Windows (PowerShell)
$release = Invoke-RestMethod "${origin}/api/cli/latest?platform=win&arch=${arch}"
$url = $release.downloadUrl
if ($url -notmatch '^https?://') { $url = "${origin}$url" }
Invoke-WebRequest -Uri $url -OutFile "$env:LOCALAPPDATA\\skill.exe"
skill config set apiBase=${origin}
skill list`
    : `#!/bin/sh
# Install skill-cli (${platform}/${arch})
set -e
RELEASE=$(curl -s "${origin}/api/cli/latest?platform=${platform}&arch=${arch}")
URL=$(echo "$RELEASE" | grep -o '"downloadUrl":"[^"]*"' | cut -d'"' -f4)
if [ -z "$URL" ]; then echo "No release found for ${platform}/${arch}"; exit 1; fi
case "$URL" in http*) ;; *) URL="${origin}$URL" ;; esac
curl -fsSL "$URL" -o /usr/local/bin/skill
chmod +x /usr/local/bin/skill
skill config set apiBase=${origin}
echo "✓ skill-cli installed. Run: skill list"`;

  return new NextResponse(script, { headers: { "Content-Type": "text/plain" } });
}
