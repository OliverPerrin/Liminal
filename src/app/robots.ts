import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liminalml.com";

const PRIVATE_PATHS = [
  "/api/",
  "/auth",
  "/onboarding",
  "/profile",
  "/practice",
  "/home",
  "/pro/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // Explicitly allow major AI crawlers. They follow the same robots.txt
      // spec as Google, but listing them communicates intent — some setups
      // block them by default, and we want LiminalML to be summarizable.
      { userAgent: "GPTBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "ChatGPT-User", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "ClaudeBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "Claude-Web", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "anthropic-ai", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "PerplexityBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "Google-Extended", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "Applebot-Extended", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "CCBot", allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
