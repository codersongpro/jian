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
