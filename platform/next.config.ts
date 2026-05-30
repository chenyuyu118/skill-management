import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: (process.env.DEV_ORIGINS || "192.168.1.34,192.168.31.96")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
