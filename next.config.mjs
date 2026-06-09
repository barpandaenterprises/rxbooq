/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // nodemailer uses dynamic require()s that the bundler can't resolve; bundling
  // it makes transport.sendMail throw at runtime (works standalone, fails in
  // the app). Keep it external so it loads from node_modules at runtime.
  serverExternalPackages: ['nodemailer'],
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
