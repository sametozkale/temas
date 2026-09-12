import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Havn",
    short_name: "Havn",
    description: "AI-native property management for real estate agents",
    start_url: "/home",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#fafaf7",
    lang: "en",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
