import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "jobin",
    project: "jobin-web",
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },
  },
  {
    widenClientSandbox: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
  }
);
