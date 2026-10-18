import "server-only";
import { publicDb } from "./supabase";
import { defaultSettings, type Work, type SiteSettings } from "./model";
import { readCandidates, readVideoCandidates, reviewEnabled } from "./bundle";
import type { VideoCandidate } from "./model";
export type Catalog = {
  works: Work[];
  settings: SiteSettings;
  mode: "review" | "setup" | "live" | "unavailable";
  videos: VideoCandidate[];
};
export async function getCatalog(): Promise<Catalog> {
  if (reviewEnabled())
    return {
      works: await readCandidates(),
      videos: await readVideoCandidates(),
      settings: defaultSettings,
      mode: "review",
    };
  const db = publicDb();
  if (!db)
    return { works: [], settings: defaultSettings, mode: "setup", videos: [] };
  try {
    const [works, settings] = await Promise.all([
      db
        .from("works")
        .select(
          "id,title,category,year,description,poem,content_text,provenance,is_public,featured_order,motion_enabled,youtube_id,media(*)",
        )
        .eq("is_public", true)
        .order("year", { ascending: false })
        .order("created_at", { ascending: false }),
      db.from("site_settings").select("*").eq("id", 1).single(),
    ]);
    if (works.error || settings.error) throw new Error("Catalog unavailable");
    return {
      works: (works.data as Work[]).map((w) => ({
        ...w,
        media: [...w.media].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        ),
      })),
      settings: settings.data as SiteSettings,
      mode: "live",
      videos: [],
    };
  } catch {
    return {
      works: [],
      settings: defaultSettings,
      mode: "unavailable",
      videos: [],
    };
  }
}
