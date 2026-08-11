import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NFR9/D5: portable build — runs on Vercel and as a plain Node/Docker
  // workload on a VM without code changes.
  output: "standalone",
};

export default nextConfig;
