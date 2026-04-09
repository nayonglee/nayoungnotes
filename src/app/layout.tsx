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
    "개인용 스크랩 다이어리 PWA. 계정 연동, 사진, 손글씨, 오프라인 초안, 기기별 PIN 잠금을 지원합니다.",
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
    <html lang="ko">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
