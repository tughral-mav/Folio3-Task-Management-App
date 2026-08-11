import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NFR9/D5: portable build — standalone output for Docker/VM hosting.
  // Skipped on Vercel (its serverless packaging breaks on standalone —
  // missing .nft.json) and under E2E, where `next start` needs the normal
  // build (`next start` is incompatible with standalone output).
  output:
    process.env.VERCEL || process.env.E2E === "1" ? undefined : "standalone",
};

export default nextConfig;
