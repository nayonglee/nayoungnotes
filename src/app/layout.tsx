import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "@fontsource/newsreader/600.css";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "Nayoung Notes",
  description:
    "A private scrapbook diary PWA with account sync, photos, handwriting, offline drafts, and a device-only PIN lock.",
  applicationName: "Nayoung Notes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nayoung Notes"
  }
};

export const viewport: Viewport = {
  themeColor: "#fffafc",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
