import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/auth" }); },
  head: () => ({ meta: [
    { title: "SentinelLab — Analyst Access" },
    { name: "description", content: "Sign in to SentinelLab for cyber attack detection and incident response training." },
    { property: "og:title", content: "SentinelLab — Analyst Access" },
    { property: "og:description", content: "Access your approved SentinelLab analyst account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});
