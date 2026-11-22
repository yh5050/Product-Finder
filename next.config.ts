import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static copy for GitHub Pages (agents run as a scripted replay there).
// Without it, this is a normal Next.js app with live API routes (deploy to Vercel or any Node host).
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? process.env.NEXT_PUBLIC_BASE_PATH ?? "" : "";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const, trailingSlash: true } : {}),
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
