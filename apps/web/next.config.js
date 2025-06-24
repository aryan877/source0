/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@heroui/react", "@modelcontextprotocol/sdk"],
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
