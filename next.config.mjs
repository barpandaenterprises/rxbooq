/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Allow Supabase Storage public buckets
      { protocol: 'https', hostname: '**.supabase.co' },
      // Add clinic-uploaded image hosts here if needed
    ],
  },
  experimental: {
    // Server Actions are stable in Next.js 14, kept here for future flags
  },
};

export default nextConfig;
