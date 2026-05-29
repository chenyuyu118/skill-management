import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

export function pullToDir(files: { path: string; content: string }[], targetDir: string) {
  mkdirSync(targetDir, { recursive: true });
  for (const f of files) {
    const fp = join(targetDir, f.path);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, f.content);
  }
}
