import { siteUrl } from "@/lib/utils";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/groups", "/notifications", "/auth/confirm", "/auth/callback"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
