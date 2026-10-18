// Node-only module: imported by server components/routes and domain tests, never by client components.
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { Work, Category, VideoCandidate } from "./model";
import { splitProvenance } from "./provenance";
type CandidateSource = NonNullable<Work["provenance"]> &
  NonNullable<Work["review"]> & {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    content_files: string[];
  };
const root = resolve(process.cwd(), "content-bundle");
export function reviewEnabled(
  runtime = process.env.NODE_ENV,
  flag = process.env.CONTENT_REVIEW_MODE,
) {
  return runtime === "development" && flag === "1";
}
async function sourceWorks(): Promise<CandidateSource[]> {
  try {
    const data = JSON.parse(
      await readFile(resolve(root, "data/works.json"), "utf8"),
    );
    return data.works;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
export function reviewAssetUrl(path: string) {
  return (
    "/api/review-assets/" + path.split("/").map(encodeURIComponent).join("/")
  );
}
const categoryMap: Record<string, Category> = {
  문학: "문학",
  "영어·문학": "문학",
  "사회·기획": "사회·기획",
  그림책: "그림책",
  "그림책·미술": "미술",
  "입체·공예": "공예·디자인",
  "공예·디자인": "공예·디자인",
  "과학·정보 표현": "과학",
  "앱 기획": "앱 기획",
};
export async function readCandidates(): Promise<Work[]> {
  return Promise.all(
    (await sourceWorks()).map(async (source, i) => {
      const {
        id,
        title,
        description,
        thumbnail,
        content_files,
        ...sourceMetadata
      } = source;
      const contents = await Promise.all(
        content_files
          .filter((f) => f.startsWith("content/") && f.endsWith(".md"))
          .map((f) => readFile(resolve(root, f), "utf8")),
      );
      return {
        id,
        source_id: id,
        title,
        description,
        category: categoryMap[source.category] || "미술",
        year: source.date ? Number(source.date.slice(0, 4)) : null,
        poem: "",
        content_text: contents.join("\n\n"),
        is_public: false,
        featured_order: i,
        motion_enabled: true,
        youtube_id: null,
        media: [],
        ...splitProvenance(sourceMetadata),
        thumbnail_url: reviewAssetUrl(thumbnail),
        pages: content_files
          .filter((f) => /^assets\/.+\.(jpg|webp|png)$/.test(f))
          .map((f, index) => ({
            url: reviewAssetUrl(f),
            caption: `제공 자료 ${index + 1} · ${f.split("/").pop()}`,
          })),
      };
    }),
  );
}
export async function readVideoCandidates(): Promise<VideoCandidate[]> {
  try {
    return JSON.parse(
      await readFile(resolve(root, "links/youtube-links.json"), "utf8"),
    ).videos;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
export async function resolveCandidateAsset(
  path: string,
): Promise<string | null> {
  if (path.includes("..") || path.includes("\\") || path.startsWith("/"))
    return null;
  const allowed = new Set(
    (await sourceWorks()).flatMap((w) => [
      w.thumbnail,
      ...w.content_files.filter((f) => f.startsWith("assets/")),
    ]),
  );
  if (!allowed.has(path)) return null;
  try {
    const actual = await realpath(resolve(root, path));
    const actualRoot = await realpath(root);
    return actual.startsWith(actualRoot + sep) ? actual : null;
  } catch {
    return null;
  }
}
export async function candidateFiles(id: string) {
  const source = (await sourceWorks()).find((w) => w.id === id);
  if (!source) return [];
  // Rendered pages/photos are imported as the supplied derivatives. Text cards are not uploaded as original artwork.
  return Promise.all(
    source.content_files
      .filter((f) => /^assets\/.+\.(jpg|webp|png)$/.test(f))
      .map(async (path) => ({
        path,
        absolute: await resolveCandidateAsset(path),
      })),
  );
}
