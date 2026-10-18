import "server-only";
import { defaultSettings, type Work, type SiteSettings } from "./model";
import { readCandidates, readVideoCandidates, reviewEnabled } from "./bundle";
import { readRepositoryCatalog } from "./repository";
import type { VideoLink } from "./model";
export type Catalog = {
  works: Work[];
  settings: SiteSettings;
  mode: "review" | "repository" | "unavailable";
  videos: VideoLink[];
};
export async function getCatalog(): Promise<Catalog> {
  if (reviewEnabled())
    return {
      works: await readCandidates(),
      videos: await readVideoCandidates(),
      settings: defaultSettings,
      mode: "review",
    };
  try {
    return {
      ...(await readRepositoryCatalog()),
      mode: "repository",
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
