/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@heroui/react"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hsktiaoktfwnkjfsrlgg.supabase.co",
      },
    ],
  },
};

export default nextConfig;
