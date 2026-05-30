"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

interface FileEntry {
  path: string;
  content: string;
}

// 1.2.3 -> 1.2.4；非法则原样
function bumpPatch(v: string): string {
  const p = v.split(".").map((n) => parseInt(n, 10));
  if (p.length !== 3 || p.some(Number.isNaN)) return v;
  return `${p[0]}.${p[1]}.${p[2] + 1}`;
}

function PublishForm() {
  const router = useRouter();
  const from = useSearchParams().get("from");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([{ path: "SKILL.md", content: "" }]);

  // 基于现有 SKILL 预填（发布新版本）
  useEffect(() => {
    if (!from) return;
    fetch(`/api/skills/${encodeURIComponent(from)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: any) => {
        if (!s) return;
        setName(s.name);
        setDescription(s.description || "");
        setVersion(bumpPatch(s.version));
        setAuthor(s.author || "");
        setTags((s.tags || []).join(", "));
        if (s.files?.length) setFiles(s.files.map((f: FileEntry) => ({ path: f.path, content: f.content })));
      })
      .catch(() => {});
  }, [from]);

  function updateFile(i: number, patch: Partial<FileEntry>) {
    setFiles((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const cleaned = files.filter((f) => f.path.trim());
    if (!cleaned.some((f) => f.path === "SKILL.md")) {
      setError("必须包含 SKILL.md 文件");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        version: version || "1.0.0",
        author,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        files: cleaned,
      }),
    });
    if (res.ok) {
      const skill = (await res.json()) as { id: string };
      router.push(`/skills/${skill.id}`);
    } else {
      const { error } = (await res.json().catch(() => ({ error: "发布失败" }))) as { error?: string };
      setError(error || "发布失败");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">名称 *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="my-awesome-skill" readOnly={!!from} />
        {from && <p className="text-xs text-muted-foreground mt-1">基于现有技能发布新版本，名称不可更改</p>}
      </div>
      <div>
        <label className="text-sm font-medium">描述</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="这个技能的作用是什么？" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">版本</label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">作者</label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="你的名字" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">标签（用逗号分隔）</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="productivity, automation" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">文件（路径可含 / 表示目录，须含 SKILL.md）</label>
          <Button type="button" variant="outline" size="sm" onClick={() => setFiles((fs) => [...fs, { path: "", content: "" }])}>
            <Plus className="size-3.5 mr-1" /> 添加文件
          </Button>
        </div>
        {files.map((f, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={f.path} onChange={(e) => updateFile(i, { path: e.target.value })} placeholder="例如 SKILL.md 或 references/guide.md" className="font-mono text-sm" />
              {files.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFiles((fs) => fs.filter((_, idx) => idx !== i))}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
            <Textarea value={f.content} onChange={(e) => updateFile(i, { content: e.target.value })} rows={f.path === "SKILL.md" ? 10 : 6} placeholder={f.path === "SKILL.md" ? "---\nname: my-skill\ndescription: ...\n---\n\n# My Skill" : "文件内容"} className="font-mono text-sm" />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "发布中..." : "发布"}
      </Button>
    </form>
  );
}

export default function PublishPage() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>发布技能</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <PublishForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
