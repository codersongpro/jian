export const categories = [
  "전체",
  "문학",
  "과학",
  "수학",
  "음악",
  "미술",
  "발레",
  "그림책",
  "공예·디자인",
  "사회·기획",
  "앱 기획",
  "공부 기록",
  "체험·활동",
] as const;
export type Category = Exclude<(typeof categories)[number], "전체">;
export type Media = {
  id: string;
  work_id: string | null;
  kind: "image" | "audio";
  path: string;
  original_name: string;
  mime_type: string;
  approved: boolean;
  rights_confirmed: boolean;
  sort_order?: number;
};
export type Work = {
  id: string;
  title: string;
  /** 영어 페이지용 제목·소개 (없으면 한국어를 그대로 표시) */
  title_en?: string;
  description_en?: string;
  category: Category;
  year: number | null;
  description: string;
  poem: string;
  is_public: boolean;
  featured_order: number | null;
  motion_enabled: boolean;
  youtube_id: string | null;
  media: Media[];
  sample?: boolean;
  source_id?: string | null;
  content_text?: string;
  thumbnail_url?: string;
  pages?: { url: string; caption: string }[];
  provenance?: {
    category: string;
    date: string | null;
    date_basis: string;
    creator_display: string;
    evidence_level: string;
    authorship_note: string;
    /** 사진 촬영 날짜·시간 (예: 2026-06-13 15:20) */
    photo_taken?: string;
    /** 사진 촬영 위치, 시·군 단위까지만 (예: 경기도 성남시) */
    photo_place?: string;
    photo_place_en?: string;
  } | null;
  review?: {
    publish_ready: boolean;
    review_status: string;
    review_notes: string[];
  } | null;
};
export type VideoLink = {
  id: string;
  url: string;
  title: string | null;
  /** 영상이 있는 곳 (없으면 YouTube) */
  source?: "youtube" | "drive";
};
export type VideoCandidate = VideoLink & {
  publish_ready: boolean;
  embed_verified: boolean;
  playback_verified: boolean;
  work_match_verified: boolean;
  note: string;
};
export type SiteSettings = {
  id: number;
  background_id: string | null;
  theme_id: string | null;
  effects_enabled: boolean;
  motion_intensity: "off" | "gentle" | "full";
};
export type Preferences = {
  /** 방문할 때마다 배경 음악을 들을지(끄면 다음 방문에도 꺼진 채로 유지) */
  sound: boolean;
  music: boolean;
  effects: boolean;
  volume: number;
  reduced: boolean;
};
export const defaultSettings: SiteSettings = {
  id: 1,
  background_id: null,
  theme_id: null,
  effects_enabled: true,
  motion_intensity: "gentle",
};
export const defaultPreferences: Preferences = {
  sound: true,
  music: true,
  effects: true,
  volume: 0.35,
  reduced: false,
};
export const mediaUrl = (id: string) => `/api/media/${encodeURIComponent(id)}`;
