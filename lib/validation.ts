import { defaultPreferences, type Preferences } from "./model";

export function filterWorks<
  T extends { category: string; year: number | null },
>(works: T[], category: string, year: string): T[] {
  return works.filter(
    (w) =>
      (category === "전체" || w.category === category) &&
      (year === "전체" ||
        (year === "미상" ? w.year === null : String(w.year) === year)),
  );
}
// 최신 작품이 먼저 보이도록 정렬합니다.
// 기준: 만든 날짜(provenance.date) → 연도만 있으면 그해의 맨 뒤 → 날짜·연도 모두 없으면 맨 뒤.
// 같은 날짜끼리는 원래 순서를 지킵니다(안정 정렬). 원본 배열은 바꾸지 않습니다.
export function sortNewestFirst<
  T extends { year: number | null; provenance?: { date: string | null } | null },
>(works: T[]): T[] {
  const key = (w: T) =>
    w.provenance?.date ?? (w.year ? `${w.year}-00-00` : "");
  return [...works].sort((a, b) => key(b).localeCompare(key(a)));
}
export function parsePreferences(value: string | null): Preferences {
  try {
    const p = JSON.parse(value || "{}");
    if (!p || typeof p !== "object") return { ...defaultPreferences };
    return {
      sound: typeof p.sound === "boolean" ? p.sound : true,
      music: typeof p.music === "boolean" ? p.music : true,
      effects: typeof p.effects === "boolean" ? p.effects : true,
      volume:
        typeof p.volume === "number" && Number.isFinite(p.volume)
          ? Math.min(1, Math.max(0, p.volume))
          : 0.35,
      reduced: p.reduced === true,
    };
  } catch {
    return { ...defaultPreferences };
  }
}
export function youtubeId(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)
    ) {
      id =
        u.pathname === "/watch"
          ? u.searchParams.get("v")
          : /^\/(embed|shorts)\//.test(u.pathname)
            ? u.pathname.split("/")[2]
            : null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
const types: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "audio/mpeg": ["mp3"],
  "audio/wav": ["wav"],
  "audio/x-wav": ["wav"],
  "audio/ogg": ["ogg"],
  "audio/mp4": ["m4a"],
};
export function validateUpload(
  name: string,
  type: string,
  size: number,
): string | null {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  if (!types[type]?.includes(extension))
    return "JPG, PNG, WebP 이미지 또는 MP3, WAV, OGG, M4A 오디오를 선택해 주세요.";
  if (size <= 0 || size > 50 * 1024 * 1024)
    return "파일 크기는 0보다 크고 50MB 이하여야 합니다.";
  return null;
}
