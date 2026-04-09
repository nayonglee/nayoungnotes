import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/700.css";
import "@fontsource/newsreader/600.css";
import "@fontsource/caveat/700.css";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "Nayoung Notes",
  description:
    "A single-user scrapbook diary PWA with synced entries, photos, handwriting, and local PIN privacy.",
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
