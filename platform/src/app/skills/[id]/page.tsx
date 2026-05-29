import { getSkillById, getSkillVersions } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteSkillButton } from "@/components/delete-skill-button";
import Link from "next/link";

export default async function SkillDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = await getSkillById(id);
  if (!skill) notFound();
  const versions = await getSkillVersions(id);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Link href="/" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">← 返回</Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{skill.name}</CardTitle>
              <p className="text-muted-foreground mt-1">{skill.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">v{skill.version}</Badge>
              <DeleteSkillButton id={skill.id} name={skill.name} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Author:</span> {skill.author}</div>
            <div><span className="text-muted-foreground">Created:</span> {new Date(skill.createdAt).toLocaleDateString()}</div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Platforms</h3>
            <div className="flex flex-wrap gap-1">
              {skill.platforms.map((p) => <Badge key={p}>{p}</Badge>)}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {skill.tags.map((t) => <Badge key={t} className="bg-secondary text-secondary-foreground">{t}</Badge>)}
            </div>
          </div>

          {skill.files.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Files</h3>
              {skill.files.map((f) => (
                <div key={f.path} className="mb-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">{f.path}</p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">{f.content}</pre>
                </div>
              ))}
            </div>
          )}

          {versions.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">版本历史</h3>
              <div className="space-y-1">
                {versions.map((v) => (
                  <div key={v.version} className="flex items-center gap-2 text-sm">
                    <Badge className={v.version === skill.version ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
                      v{v.version}{v.version === skill.version ? " (latest)" : ""}
                    </Badge>
                    <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Install via CLI:</p>
            <code className="bg-muted px-3 py-2 rounded-md text-sm block">skill install {skill.name}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
