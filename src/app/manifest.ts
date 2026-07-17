import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#12110f",
    description:
      "A focused drum and rhythm practice companion with real-time synthesized sounds.",
    display: "standalone",
    icons: [
      {
        src: "/icons/web-band-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        purpose: "maskable",
        src: "/icons/web-band-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/web-band-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    name: "Web Band Rhythm Practice",
    orientation: "any",
    scope: "/",
    short_name: "Web Band",
    start_url: "/practice",
    theme_color: "#12110f",
  };
}
