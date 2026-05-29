import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "SKILL 平台", description: "管理和分发 AI 技能" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
