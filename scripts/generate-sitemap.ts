// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes public/sitemap.xml from the static route list below.
// Dynamic routes (Branchen-Pages, Magazin-Artikel) werden hier ergänzt,
// sobald sie gebaut sind.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://pallanx.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const entries: SitemapEntry[] = [
  { path: "/",                  changefreq: "weekly",  priority: "1.0", lastmod: today },
  { path: "/preise",            changefreq: "weekly",  priority: "0.9", lastmod: today },
  { path: "/register",          changefreq: "monthly", priority: "0.6", lastmod: today },
  { path: "/login",             changefreq: "monthly", priority: "0.4", lastmod: today },
  { path: "/datenschutz",       changefreq: "yearly",  priority: "0.3", lastmod: today },
  { path: "/retail",            changefreq: "weekly",  priority: "0.9", lastmod: today },
  { path: "/retail/register",   changefreq: "monthly", priority: "0.6", lastmod: today },
  { path: "/retail/login",      changefreq: "monthly", priority: "0.4", lastmod: today },
  { path: "/retail/moebelhandel", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/retail/kfz-werkstatt", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/retail/elektronikhandel", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/magazin", changefreq: "weekly", priority: "0.7", lastmod: today },
];

// Magazin-Artikel dynamisch nachladen (best effort — Sitemap-Build darf nicht hart fallen).
async function loadMagazinArticles(): Promise<SitemapEntry[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const client = createClient(url, key);
    const { data, error } = await client
      .from("magazin_articles")
      .select("slug,updated_at")
      .eq("status", "published");
    if (error || !data) return [];
    return data.map((row: { slug: string; updated_at: string }) => ({
      path: `/magazin/${row.slug}`,
      changefreq: "monthly" as const,
      priority: "0.7",
      lastmod: row.updated_at?.slice(0, 10) ?? today,
    }));
  } catch {
    return [];
  }
}

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

(async () => {
  const dynamic = await loadMagazinArticles();
  const all = [...entries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
  console.log(`sitemap.xml written (${all.length} entries, ${dynamic.length} magazin)`);
})();