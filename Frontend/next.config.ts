import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // CV uploads go through a Server Action, whose default limit is 1 MB.
    // FastAPI accepts CVs up to 5 MB; the extra room is the multipart overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
