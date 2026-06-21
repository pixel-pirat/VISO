import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these — they use native binaries
  // that must be loaded from node_modules at runtime.
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "bcryptjs",
    "livekit-server-sdk",
  ],

  experimental: {
    // Turbopack-compatible optimisation: only bundle what's imported
    optimizePackageImports: ["lucide-react", "@livekit/components-react"],
  },
};

export default nextConfig;
