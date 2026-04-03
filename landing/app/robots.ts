import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/onboarding", "/credits"],
      },
    ],
    sitemap: "https://fleetsight.vercel.app/sitemap.xml",
  };
}
