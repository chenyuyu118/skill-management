"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PublishPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        version: fd.get("version") || "1.0.0",
        author: fd.get("author"),
        tags: (fd.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [],
        files: [{ path: "SKILL.md", content: fd.get("content") || "" }],
      }),
    });
    if (res.ok) {
      const skill = (await res.json()) as { id: string };
      router.push(`/skills/${skill.id}`);
    } else {
      setLoading(false);
      alert("发布失败");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>发布技能</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">名称 *</label>
              <Input name="name" required placeholder="my-awesome-skill" />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Input name="description" placeholder="这个技能的作用是什么？" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">版本</label>
                <Input name="version" defaultValue="1.0.0" />
              </div>
              <div>
                <label className="text-sm font-medium">作者</label>
                <Input name="author" placeholder="你的名字" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">标签（用逗号分隔）</label>
              <Input name="tags" placeholder="productivity, automation" />
            </div>
            <div>
              <label className="text-sm font-medium">SKILL.md 内容</label>
              <Textarea name="content" rows={10} placeholder="---\nname: my-skill\ndescription: ...\n---\n\n# My Skill\n..." />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "发布中..." : "发布"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
