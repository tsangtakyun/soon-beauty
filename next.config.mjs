/** @type {import('next').NextConfig} */
const nextConfig = {
  // For MVP — allow build to succeed even if there are type errors.
  // Remove this once we've fixed all strict typing issues.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
