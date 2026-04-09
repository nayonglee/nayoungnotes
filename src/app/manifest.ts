import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nayoung Notes",
    short_name: "Nayoung Notes",
    description: "한 사람을 위한 개인용 스크랩 다이어리",
    start_url: "/archive",
    display: "standalone",
    background_color: "#fffafc",
    theme_color: "#fffafc",
    icons: [
      { src: "/icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/icon?size=512", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" }
    ]
  };
}
