"use client";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { SkillFile } from "@/types";
import { buildFileTree, langFromPath, TreeNode } from "@/lib/file-tree";

function TreeView({ nodes, selected, onSelect, depth = 0 }: {
  nodes: TreeNode[]; selected: string; onSelect: (n: TreeNode) => void; depth?: number;
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} selected={selected} onSelect={onSelect} depth={depth} />
      ))}
    </ul>
  );
}

function TreeItem({ node, selected, onSelect, depth }: {
  node: TreeNode; selected: string; onSelect: (n: TreeNode) => void; depth: number;
}) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.isDir) {
    return (
      <li>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 w-full text-left py-1 px-2 text-sm hover:bg-accent rounded" style={pad}>
          {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
          {open ? <FolderOpen className="size-4 shrink-0 text-muted-foreground" /> : <Folder className="size-4 shrink-0 text-muted-foreground" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && <TreeView nodes={node.children} selected={selected} onSelect={onSelect} depth={depth + 1} />}
      </li>
    );
  }
  return (
    <li>
      <button onClick={() => onSelect(node)} className={`flex items-center gap-1 w-full text-left py-1 px-2 text-sm rounded ${selected === node.path ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`} style={pad}>
        <File className="size-4 shrink-0 text-muted-foreground ml-[14px]" />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
}

function FileViewer({ path, content }: { path: string; content: string }) {
  const lang = langFromPath(path);
  if (lang === "markdown") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none p-4">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }
  return (
    <SyntaxHighlighter language={lang} style={oneDark} customStyle={{ margin: 0, fontSize: "0.8rem", background: "transparent" }} showLineNumbers>
      {content}
    </SyntaxHighlighter>
  );
}

export function SkillFileBrowser({ name, files, versions, currentVersion }: {
  name: string; files: SkillFile[]; versions: string[]; currentVersion: string;
}) {
  const [version, setVersion] = useState(currentVersion);
  const [activeFiles, setActiveFiles] = useState(files);
  const [loading, setLoading] = useState(false);
  const tree = useMemo(() => buildFileTree(activeFiles), [activeFiles]);
  const [selected, setSelected] = useState<TreeNode | null>(() => {
    const t = buildFileTree(files);
    const findFirst = (nodes: TreeNode[]): TreeNode | null => {
      for (const n of nodes) {
        if (!n.isDir) return n;
        if (n.children) { const f = findFirst(n.children); if (f) return f; }
      }
      return null;
    };
    return findFirst(t);
  });

  async function switchVersion(v: string) {
    if (v === version) return;
    setLoading(true);
    const res = await fetch(`/api/skills/${encodeURIComponent(name)}?version=${encodeURIComponent(v)}`);
    if (res.ok) {
      const skill = (await res.json()) as { files: SkillFile[] };
      setActiveFiles(skill.files);
      setVersion(v);
      const t = buildFileTree(skill.files);
      const findFirst = (nodes: TreeNode[]): TreeNode | null => {
        for (const n of nodes) {
          if (!n.isDir) return n;
          if (n.children) { const f = findFirst(n.children); if (f) return f; }
        }
        return null;
      };
      setSelected(findFirst(t));
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {versions.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">版本：</span>
          <select value={version} onChange={(e) => switchVersion(e.target.value)} disabled={loading}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            {versions.map((v) => <option key={v} value={v}>v{v}{v === currentVersion ? " (latest)" : ""}</option>)}
          </select>
          {loading && <span className="text-xs text-muted-foreground">加载中...</span>}
        </div>
      )}
      <div className="grid grid-cols-[220px_1fr] border rounded-lg overflow-hidden" style={{ minHeight: "400px" }}>
        <div className="border-r bg-muted/30 py-2 overflow-auto max-h-[600px]">
          <TreeView nodes={tree} selected={selected?.path || ""} onSelect={setSelected} />
        </div>
        <div className="overflow-auto max-h-[600px]">
          {selected ? (
            <>
              <div className="px-4 py-2 border-b text-xs font-mono text-muted-foreground sticky top-0 bg-background">{selected.path}</div>
              <FileViewer path={selected.path} content={selected.content || ""} />
            </>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">无文件</p>
          )}
        </div>
      </div>
    </div>
  );
}
