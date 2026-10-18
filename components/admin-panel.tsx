"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { browserDb, configured } from "@/lib/supabase";
import { confirmMutation } from "@/lib/mutations";
import {
  categories,
  defaultSettings,
  type Work,
  type Media,
  type SiteSettings,
} from "@/lib/model";
import { validateUpload, youtubeId } from "@/lib/validation";
import { SoundProvider, useSound } from "./sound-provider";
import { CandidateLibrary } from "./candidate-library";

const blank = (): Work => ({
  id: "",
  title: "",
  category: "문학",
  year: null,
  description: "",
  poem: "",
  is_public: false,
  featured_order: null,
  motion_enabled: true,
  youtube_id: null,
  media: [],
});
export function AdminPanel() {
  return (
    <SoundProvider settings={defaultSettings}>
      <Admin />
    </SoundProvider>
  );
}
function Admin() {
  const db = browserDb();
  const [user, setUser] = useState<User | null>(null),
    [authorized, setAuthorized] = useState(false),
    [loading, setLoading] = useState(configured()),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState("");
  const [works, setWorks] = useState<Work[]>([]),
    [media, setMedia] = useState<Media[]>([]),
    [settings, setSettings] = useState(defaultSettings),
    [work, setWork] = useState<Work>(blank),
    [tab, setTab] = useState("works"),
    [video, setVideo] = useState("");
  const { enabled, toggle, effect } = useSound();
  const [previewLink, setPreviewLink] = useState<{
    id: string;
    url: string;
  } | null>(null);
  useEffect(() => {
    if (!previewLink) return;
    const timer = setTimeout(() => setPreviewLink(null), 60000);
    return () => clearTimeout(timer);
  }, [previewLink]);
  useEffect(() => {
    if (!db) return;
    void db.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setLoading(false);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setAuthorized(false);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [db]);
  useEffect(() => {
    if (!user || !db) return;
    let active = true;
    setLoading(true);
    setFailure("");
    void db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setFailure(
            "관리자 권한이 없습니다. 운영자에게 계정 등록을 요청해 주세요.",
          );
          setLoading(false);
          return;
        }
        setAuthorized(true);
        try {
          await reload();
        } catch {
          setFailure(
            "전시 자료를 불러오지 못했습니다. 스키마 설치와 연결 상태를 확인한 뒤 새로고침해 주세요.",
          );
        }
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, db]);
  async function reload() {
    if (!db) return;
    const [w, m, s] = await Promise.all([
      db
        .from("works")
        .select("*,media(*),work_reviews(metadata)")
        .order("year", { ascending: false }),
      db.from("media").select("*").order("created_at", { ascending: false }),
      db.from("site_settings").select("*").eq("id", 1).single(),
    ]);
    if (w.error || m.error || s.error)
      throw new Error(
        "자료를 불러오지 못했습니다. 연결 상태와 스키마를 확인해 주세요.",
      );
    setWorks(
      w.data.map((row) => ({
        ...row,
        review: row.work_reviews?.metadata ?? row.work_reviews?.[0]?.metadata,
      })) as Work[],
    );
    setMedia(m.data as Media[]);
    setSettings(s.data as SiteSettings);
  }
  async function action(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
      effect("success");
    } catch (e) {
      setFailure(
        e instanceof Error
          ? e.message
          : "저장하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db) return;
    const form = new FormData(e.currentTarget);
    await action(async () => {
      const { error } = await db.auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error)
        throw new Error(
          "로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.",
        );
    }, "로그인 정보를 확인했습니다.");
  }
  function edit(w: Work) {
    setWork({ ...w });
    setVideo(
      w.youtube_id ? `https://www.youtube.com/watch?v=${w.youtube_id}` : "",
    );
    setMessage("");
  }
  async function saveWork(e: FormEvent) {
    e.preventDefault();
    if (!db) return;
    await action(async () => {
      const id = video.trim() ? youtubeId(video.trim()) : null;
      if (video.trim() && !id)
        throw new Error("올바른 HTTPS YouTube 영상 주소를 입력해 주세요.");
      const payload = {
        title: work.title.trim(),
        category: work.category,
        year: work.year,
        description: work.description,
        poem: work.poem,
        content_text: work.content_text || "",
        is_public: work.is_public,
        featured_order: work.featured_order,
        motion_enabled: work.motion_enabled,
        youtube_id: id,
      };
      const result = work.id
        ? await db
            .from("works")
            .update(payload)
            .eq("id", work.id)
            .select()
            .single()
        : await db.from("works").insert(payload).select().single();
      if (result.error)
        throw new Error(
          "작품을 저장하지 못했습니다. 입력값과 관리자 권한을 확인해 주세요.",
        );
      setWork({ ...result.data, media: work.media } as Work);
      await reload();
    }, "작품을 저장했습니다. 공개 상태에 따라 전시실에 반영됩니다.");
  }
  async function deleteWork() {
    if (
      !db ||
      !work.id ||
      !confirm(
        "이 작품과 연결된 미디어 등록을 삭제할까요? 원본 파일은 별도로 보관됩니다.",
      )
    )
      return;
    await action(async () => {
      const result = await db
        .from("works")
        .delete()
        .eq("id", work.id)
        .select("id")
        .single();
      confirmMutation(
        result,
        "작품이 삭제되지 않았습니다. 권한이나 변경된 자료를 확인해 주세요.",
      );
      setWork(blank());
      setVideo("");
      await reload();
    }, "작품을 삭제했습니다.");
  }
  async function upload(file: File, workId: string | null) {
    if (!db || !user) return;
    await action(async () => {
      const invalid = validateUpload(file.name, file.type, file.size);
      if (invalid) throw new Error(invalid);
      const ext = file.name.split(".").pop()!.toLowerCase(),
        path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage
        .from("originals")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error)
        throw new Error(
          "파일을 업로드하지 못했습니다. 저장소 정책과 50MB 제한을 확인해 주세요.",
        );
      const { error: rowError } = await db.from("media").insert({
        work_id: workId,
        kind: file.type.startsWith("image/") ? "image" : "audio",
        path,
        original_name: file.name,
        mime_type: file.type,
        approved: false,
        rights_confirmed: false,
      });
      if (rowError) {
        await db.storage.from("originals").remove([path]);
        throw new Error(
          "파일 정보를 저장하지 못했습니다. 다시 업로드해 주세요.",
        );
      }
      await reload();
    }, "원본을 비공개로 보관했습니다. 사용 권한을 확인한 뒤 공개를 승인해 주세요.");
  }
  async function updateMedia(m: Media, patch: Partial<Media>) {
    if (!db) return;
    await action(async () => {
      const result = await db
        .from("media")
        .update(patch)
        .eq("id", m.id)
        .select("id")
        .single();
      confirmMutation(
        result,
        "미디어 상태가 변경되지 않았습니다. 권한과 파일 등록을 확인해 주세요.",
      );
      await reload();
    }, "미디어 공개 설정을 반영했습니다.");
  }
  async function preview(m: Media) {
    if (!db) return;
    await action(async () => {
      const {
        data: { session },
      } = await db.auth.getSession();
      const r = await fetch("/api/admin/media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ id: m.id }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "미리보기를 열 수 없습니다.");
      setPreviewLink({ id: m.id, url: body.url });
    }, "미리보기를 준비했습니다. 파일 옆의 링크를 눌러 60초 이내에 열어 주세요.");
  }
  async function removeMedia(m: Media) {
    if (!db || !confirm("이 파일의 등록과 저장된 원본을 삭제할까요?")) return;
    await action(async () => {
      const row = await db
        .from("media")
        .delete()
        .eq("id", m.id)
        .select("id")
        .single();
      confirmMutation(
        row,
        "파일 등록이 삭제되지 않았습니다. 권한을 확인해 주세요.",
      );
      const storage = await db.storage.from("originals").remove([m.path]);
      await reload();
      if (storage.error)
        throw new Error(
          "등록은 삭제했지만 원본 정리에 실패했습니다. Storage에서 원본을 정리해 주세요.",
        );
    }, "파일과 원본을 삭제했습니다.");
  }
  async function saveSettings(next: SiteSettings) {
    if (!db) return;
    await action(async () => {
      const result = await db
        .from("site_settings")
        .update(next)
        .eq("id", 1)
        .select("id")
        .single();
      confirmMutation(
        result,
        "전시 설정이 변경되지 않았습니다. 권한과 연결을 확인해 주세요.",
      );
      await reload();
    }, "전시실 설정을 저장했습니다.");
  }
  function mediaList(items: Media[]) {
    return (
      <div className="admin-media-list">
        {items.map((m) => (
          <div key={m.id} className="admin-media">
            <div>
              <strong>{m.original_name}</strong>
              <small>
                {m.kind === "audio" ? "오디오" : "이미지"} ·{" "}
                {m.approved ? "공개 승인됨" : "비공개 보관"}
              </small>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={m.rights_confirmed}
                disabled={busy}
                onChange={(e) =>
                  void updateMedia(m, {
                    rights_confirmed: e.target.checked,
                    ...(!e.target.checked ? { approved: false } : {}),
                  })
                }
              />
              사용 권한 확인
            </label>
            <div className="media-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => void preview(m)}
              >
                원본 확인 <ArrowUpRight size={12} />
              </button>
              {previewLink?.id === m.id && (
                <a
                  className="preview-link"
                  href={previewLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  미리보기 열기 <ArrowUpRight size={12} />
                </a>
              )}
              <button
                type="button"
                disabled={busy || (!m.rights_confirmed && !m.approved)}
                onClick={() => void updateMedia(m, { approved: !m.approved })}
              >
                {m.approved ? "공개 취소" : "공개 승인"}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`${m.original_name} 삭제`}
                onClick={() => void removeMedia(m)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!items.length && (
          <p className="admin-hint">아직 등록된 파일이 없습니다.</p>
        )}
      </div>
    );
  }
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="brand">
          <Sparkles size={24} />
          <span>jian’s universe.</span>
        </a>
        <div>
          <a href="/" className="text-link">
            <ArrowLeft size={14} />
            전시실로
          </a>
          <button
            className="icon-button"
            aria-label={enabled ? "사운드 끄기" : "사운드 켜기"}
            onClick={() => void toggle()}
          >
            {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          {user && (
            <button
              className="text-link"
              onClick={() => void db?.auth.signOut()}
            >
              <LogOut size={14} />
              로그아웃
            </button>
          )}
        </div>
      </header>
      <main className="admin-main">
        <div className="eyebrow">CURATOR’S DESK</div>
        <h1>작은 우주를 가꾸는 곳</h1>
        <p className="admin-intro">
          작품을 모으고, 이야기를 더하고, 세상과 나눌 순간을 골라 주세요.
        </p>
        {!configured() ? (
          <section className="setup-card">
            <span className="setup-icon">
              <OrbitIcon />
            </span>
            <h2>전시실 연결 준비</h2>
            <p>
              작품을 안전하게 보관할 공간이 아직 연결되지 않았습니다.
              <br />
              연결을 마치면 이곳에서 관리자 로그인과 작품 등록을 시작할 수
              있어요.
            </p>
            <ol>
              <li>
                Supabase 프로젝트에서 <code>supabase/schema.sql</code>을
                실행합니다.
              </li>
              <li>이메일 계정을 만들고 관리자 목록에 등록합니다.</li>
              <li>
                Vercel 환경변수에 프로젝트 URL·공개 키·서버용 키를 등록합니다.
              </li>
              <li>다시 배포한 뒤 이 화면에서 로그인합니다.</li>
            </ol>
            <a href="/" className="primary-button">
              전시실 미리 둘러보기 <ArrowUpRight size={16} />
            </a>
            <p className="admin-hint">
              자세한 연결 방법은 저장소의 README에 안내되어 있습니다.
            </p>
          </section>
        ) : loading ? (
          <p className="admin-loading" role="status">
            전시실을 확인하고 있어요…
          </p>
        ) : !user ? (
          <form className="login-card" onSubmit={(e) => void login(e)}>
            <h2>관리자 로그인</h2>
            <p>초대된 관리자 계정으로 로그인해 주세요.</p>
            <label>
              이메일
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                maxLength={254}
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={256}
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? "확인 중…" : "로그인"}
              <ArrowUpRight size={16} />
            </button>
            <p className="admin-hint">
              비밀번호 재설정은 프로젝트 운영자에게 요청해 주세요.
            </p>
          </form>
        ) : authorized ? (
          <>
            <div className="admin-tabs" role="group" aria-label="관리 항목">
              <button
                className={tab === "works" ? "active" : ""}
                onClick={() => setTab("works")}
              >
                작품 관리 <span>{works.length}</span>
              </button>
              <button
                className={tab === "settings" ? "active" : ""}
                onClick={() => setTab("settings")}
              >
                전시실 설정
              </button>
              <button
                className={tab === "candidates" ? "active" : ""}
                onClick={() => setTab("candidates")}
              >
                제공 자료 9묶음
              </button>
            </div>
            {tab === "candidates" ? (
              <CandidateLibrary importedWorks={works} onImported={reload} />
            ) : tab === "works" ? (
              <div className="admin-workspace">
                <aside className="admin-work-list">
                  <button
                    className="admin-add"
                    onClick={() => {
                      setWork(blank());
                      setVideo("");
                      setMessage("");
                    }}
                  >
                    <Plus size={16} />새 작품 등록
                  </button>
                  {works.map((w) => (
                    <button
                      key={w.id}
                      className={work.id === w.id ? "selected" : ""}
                      onClick={() => edit(w)}
                    >
                      <span>
                        {w.category} · {w.year}
                      </span>
                      <strong>{w.title}</strong>
                      <small>{w.is_public ? "공개" : "비공개"}</small>
                    </button>
                  ))}
                  {!works.length && (
                    <p className="admin-hint">첫 작품을 등록해 보세요.</p>
                  )}
                </aside>
                <div className="admin-editor">
                  <form onSubmit={(e) => void saveWork(e)}>
                    <div className="editor-heading">
                      <h2>{work.id ? "작품 편집" : "새로운 별 하나"}</h2>
                      {work.id && (
                        <button
                          type="button"
                          className="danger-link"
                          disabled={busy}
                          onClick={() => void deleteWork()}
                        >
                          <Trash2 size={14} />
                          작품 삭제
                        </button>
                      )}
                    </div>
                    <label>
                      작품 제목
                      <input
                        required
                        maxLength={160}
                        value={work.title}
                        onChange={(e) =>
                          setWork({ ...work, title: e.target.value })
                        }
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        분야
                        <select
                          value={work.category}
                          onChange={(e) =>
                            setWork({
                              ...work,
                              category: e.target.value as Work["category"],
                            })
                          }
                        >
                          {categories
                            .filter((c) => c !== "전체")
                            .map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                        </select>
                      </label>
                      <label>
                        연도
                        <input
                          type="number"
                          min={1900}
                          max={2100}
                          value={work.year ?? ""}
                          onChange={(e) =>
                            setWork({
                              ...work,
                              year:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label>
                      작품 이야기
                      <textarea
                        rows={4}
                        maxLength={10000}
                        value={work.description}
                        onChange={(e) =>
                          setWork({ ...work, description: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      시·글 원문
                      <textarea
                        rows={6}
                        maxLength={10000}
                        value={work.poem}
                        onChange={(e) =>
                          setWork({ ...work, poem: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      YouTube 공연·연주 주소
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=…"
                        value={video}
                        onChange={(e) => setVideo(e.target.value)}
                      />
                    </label>
                    {work.content_text !== undefined && (
                      <label>
                        제공된 전사·발췌 본문
                        <textarea
                          rows={12}
                          maxLength={50000}
                          value={work.content_text}
                          onChange={(e) =>
                            setWork({ ...work, content_text: e.target.value })
                          }
                        />
                      </label>
                    )}
                    <label>
                      대표 작품 순서{" "}
                      <small>비워 두면 대표 작품에서 제외됩니다.</small>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={work.featured_order ?? ""}
                        onChange={(e) =>
                          setWork({
                            ...work,
                            featured_order:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <div className="check-row">
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={work.is_public}
                          onChange={(e) =>
                            setWork({ ...work, is_public: e.target.checked })
                          }
                        />
                        작품 공개
                      </label>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={work.motion_enabled}
                          onChange={(e) =>
                            setWork({
                              ...work,
                              motion_enabled: e.target.checked,
                            })
                          }
                        />
                        작품 모션 사용
                      </label>
                    </div>
                    <button className="primary-button" disabled={busy}>
                      <Save size={15} />
                      {busy ? "저장 중…" : "작품 저장"}
                    </button>
                  </form>
                  <section className="admin-upload">
                    <h3>
                      <ImagePlus size={18} />
                      작품 이미지·오디오
                    </h3>
                    <p>
                      원본 그대로 비공개 보관한 후, 확인한 파일만 공개할 수
                      있습니다.
                    </p>
                    {work.id ? (
                      <>
                        <label className="upload-button">
                          <Upload size={16} />
                          원본 파일 업로드
                          <input
                            type="file"
                            disabled={busy}
                            accept=".jpg,.jpeg,.png,.webp,.mp3,.wav,.ogg,.m4a"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void upload(f, work.id);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {mediaList(media.filter((m) => m.work_id === work.id))}
                      </>
                    ) : (
                      <p className="admin-hint">
                        작품을 먼저 저장하면 파일을 등록할 수 있습니다.
                      </p>
                    )}
                  </section>
                </div>
              </div>
            ) : (
              <div className="admin-settings">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveSettings(settings);
                  }}
                >
                  <h2>전시실의 표정과 소리</h2>
                  <p className="admin-hint">
                    승인된 이미지와 오디오만 메인 화면에 적용됩니다.
                  </p>
                  <label>
                    메인 배경
                    <select
                      value={settings.background_id || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          background_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">기본 크림색 배경</option>
                      {media
                        .filter(
                          (m) => !m.work_id && m.kind === "image" && m.approved,
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.original_name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    테마 음악
                    <select
                      value={settings.theme_id || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">기본 테마 · Little Notes</option>
                      {media
                        .filter(
                          (m) => !m.work_id && m.kind === "audio" && m.approved,
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.original_name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    모션 강도
                    <select
                      value={settings.motion_intensity}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          motion_intensity: e.target
                            .value as SiteSettings["motion_intensity"],
                        })
                      }
                    >
                      <option value="off">최소화</option>
                      <option value="gentle">은은하게</option>
                      <option value="full">풍부하게</option>
                    </select>
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={settings.effects_enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          effects_enabled: e.target.checked,
                        })
                      }
                    />
                    인터랙션 효과음 허용
                  </label>
                  <div className="check-row">
                    <button className="primary-button" disabled={busy}>
                      <Save size={15} />
                      전시 설정 저장
                    </button>
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            "배경·테마 음악·모션 설정을 기본값으로 복원할까요? 파일은 삭제되지 않습니다.",
                          )
                        )
                          void saveSettings(defaultSettings);
                      }}
                    >
                      기본 테마로 복원
                    </button>
                  </div>
                </form>
                <section className="admin-upload">
                  <h3>
                    <Volume2 size={18} />
                    배경 이미지·테마 음악 보관함
                  </h3>
                  <p>
                    사용 권한이 확보된 자료를 등록해 주세요. 실제 작품 오디오는
                    작품 편집에서 별도로 관리합니다.
                  </p>
                  <label className="upload-button">
                    <Upload size={16} />
                    파일 업로드
                    <input
                      type="file"
                      disabled={busy}
                      accept=".jpg,.jpeg,.png,.webp,.mp3,.wav,.ogg,.m4a"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void upload(f, null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {mediaList(media.filter((m) => !m.work_id))}
                </section>
              </div>
            )}
          </>
        ) : null}
        {message && (
          <div className="admin-message" role="status">
            <Sparkles size={16} />
            {message}
          </div>
        )}
        {failure && (
          <div className="admin-error" role="alert">
            {failure}
          </div>
        )}
      </main>
      <footer className="admin-footer">
        JIAN’S UNIVERSE · 모든 새로운 이야기는 작은 호기심에서 시작됩니다.
      </footer>
    </div>
  );
}
function OrbitIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="22"
        cy="22"
        rx="20"
        ry="10"
        stroke="currentColor"
        transform="rotate(-35 22 22)"
      />
      <circle cx="22" cy="22" r="4" fill="currentColor" />
    </svg>
  );
}
