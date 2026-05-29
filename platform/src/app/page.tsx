import { searchSkills } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

export default function Home({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  return <HomeContent searchParams={searchParams} />;
}

async function HomeContent({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const { q, tag } = await searchParams;
  const skills = await searchSkills(q, tag);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">SKILL 平台</h1>
          <p className="text-muted-foreground mt-1">发现并安装适用于你的工具的 AI 技能</p>
        </div>
        <div className="flex gap-2">
          <Link href="/publish">
            <Button>发布技能</Button>
          </Link>
          <Link href="/download">
            <Button variant="outline">下载 CLI</Button>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <form className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索技能..."
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" variant="secondary">搜索</Button>
      </form>

      {skills.length === 0 ? (
        <p className="text-muted-foreground">未找到技能，发布一个开始吧！</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Link key={skill.id} href={`/skills/${skill.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <CardDescription>{skill.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {skill.tags.map((t) => (
                      <Badge key={t} className="bg-secondary text-secondary-foreground">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">v{skill.version} · {skill.author}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
