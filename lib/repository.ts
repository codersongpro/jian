// Node-only repository content loader. No database or credentials are required.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import manifest from "../content/works.json";
import links from "../content/videos.json";
import settings from "../content/settings.json";
import type { Category, SiteSettings, Work } from "./model";

export const repositoryEntries = manifest.works;

export async function readRepositoryCatalog() {
  const works: Work[] = await Promise.all(
    repositoryEntries
      .filter((entry) => entry.is_public)
      .map(async (entry) => {
        if (!/^[a-z0-9-]+\.md$/.test(entry.content_file))
          throw new Error(`Invalid content filename: ${entry.id}`);
        return {
          id: entry.id,
          title: entry.title,
          title_en: (entry as { title_en?: string }).title_en,
          description_en: (entry as { description_en?: string }).description_en,
          category: entry.category as Category,
          year: entry.year,
          description: entry.description,
          content_text: await readFile(
            resolve(process.cwd(), "content", entry.content_file),
            "utf8",
          ),
          poem: "",
          is_public: true,
          featured_order: entry.featured_order,
          motion_enabled: entry.motion_enabled,
          youtube_id: entry.youtube_id,
          media: [],
          thumbnail_url: entry.thumbnail_url,
          pages: entry.pages,
          provenance: entry.provenance,
        };
      }),
  );
  return {
    works,
    videos: links.videos,
    settings: settings as SiteSettings,
  };
}
