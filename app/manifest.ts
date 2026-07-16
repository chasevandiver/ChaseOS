import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CHASE OS",
    short_name: "CHASE OS",
    description: "Personal command center",
    start_url: "/",
    display: "standalone",
    // Landscape is the primary orientation on iPad. iOS ignores this field
    // and follows device rotation, so portrait keeps working there.
    orientation: "landscape",
    background_color: "#05080d",
    theme_color: "#05080d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
