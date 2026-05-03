import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next.js doesn't pick up
  // unrelated files (e.g. ~/middleware.ts) from a parent lockfile dir.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
