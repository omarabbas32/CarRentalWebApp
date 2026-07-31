import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Car photos and verification documents are absolute Cloudinary URLs —
    // the API stores and returns nothing else. `images.domains` is deprecated
    // in Next 16; remotePatterns is the supported form.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
