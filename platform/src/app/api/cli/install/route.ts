import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const platform = searchParams.get("platform") || "macos";
  const arch = searchParams.get("arch") || "arm64";
  // 透传访问密码（中间件已校验过，能到这里说明密码正确）
  const pw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

  const script = platform === "win"
    ? `# Windows (PowerShell)
$headers = @{ Authorization = "Bearer ${pw}" }
$release = Invoke-RestMethod "${origin}/api/cli/latest?platform=win&arch=${arch}" -Headers $headers
$url = $release.downloadUrl
if ($url -notmatch '^https?://') { $url = "${origin}$url" }
Invoke-WebRequest -Uri $url -Headers $headers -OutFile "$env:LOCALAPPDATA\\skill.exe"
skill config set apiBase=${origin}
skill config set password=${pw}
skill list`
    : `#!/bin/sh
# Install skill-cli (${platform}/${arch})
set -e
AUTH="Authorization: Bearer ${pw}"
RELEASE=$(curl -s -H "$AUTH" "${origin}/api/cli/latest?platform=${platform}&arch=${arch}")
URL=$(echo "$RELEASE" | grep -o '"downloadUrl":"[^"]*"' | cut -d'"' -f4)
if [ -z "$URL" ]; then echo "No release found for ${platform}/${arch}"; exit 1; fi
case "$URL" in http*) ;; *) URL="${origin}$URL" ;; esac
DEST="$HOME/.local/bin"
mkdir -p "$DEST"
curl -fsSL -H "$AUTH" "$URL" -o "$DEST/skill"
chmod +x "$DEST/skill"
"$DEST/skill" config set apiBase=${origin}
"$DEST/skill" config set password=${pw}
echo "✓ skill-cli 已安装到 $DEST/skill"
case ":$PATH:" in
  *":$DEST:"*) echo "  运行: skill list" ;;
  *) echo "  请将其加入 PATH（追加到 ~/.zshrc 或 ~/.bashrc）："; echo "    export PATH=\\"$DEST:\\$PATH\\""; echo "  然后重开终端，运行: skill list" ;;
esac`;

  return new NextResponse(script, { headers: { "Content-Type": "text/plain" } });
}
