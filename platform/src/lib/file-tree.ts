import { SkillFile } from "@/types";

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
  content?: string;
}

// 把扁平 files[]（path 形如 "a/b/c.md"）构建为嵌套目录树，目录在前、同级按名排序
export function buildFileTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let cur = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let next = cur.children!.find((c) => c.name === part);
      if (!next) {
        next = isLast
          ? { name: part, path, isDir: false, content: file.content }
          : { name: part, path, isDir: true, children: [] };
        cur.children!.push(next);
      }
      cur = next;
    });
  }

  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n));

  return sort(root.children!);
}

// 从语言映射：按扩展名推断 syntax-highlighter 语言
export function langFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    sh: "bash", bash: "bash", zsh: "bash", yml: "yaml", yaml: "yaml",
    json: "json", toml: "toml", md: "markdown", html: "html", css: "css",
    sql: "sql", xml: "xml",
  };
  return map[ext] || "text";
}
