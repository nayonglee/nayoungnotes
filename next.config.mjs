import path from "node:path";
import { fileURLToPath } from "node:url";
import withPWAInit from "@ducanh2912/next-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/~offline"
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*supabase\.co\/storage\/v1\/object\/sign\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "nayoungnotes-signed-images",
          expiration: {
            maxEntries: 40,
            maxAgeSeconds: 21600
          }
        }
      }
    ]
  }
});

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname
};

export default withPWA(nextConfig);
