"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Download, Sparkles } from "lucide-react";
import { browserDb } from "@/lib/supabase";
import type { Work, VideoCandidate } from "@/lib/model";
import { ContentText } from "./content-text";
export function CandidateLibrary({
  importedWorks,
  onImported,
}: {
  importedWorks: Work[];
  onImported: () => Promise<void>;
}) {
  const [works, setWorks] = useState<Work[]>([]),
    [videos, setVideos] = useState<VideoCandidate[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function headers() {
    const db = browserDb();
    const { data } = await db!.auth.getSession();
    return {
      Authorization: `Bearer ${data.session?.access_token}`,
      "Content-Type": "application/json",
    };
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch("/api/admin/candidates", {
          headers: await headers(),
          cache: "no-store",
        });
        const result = await r.json();
        if (!r.ok)
          throw new Error(result.error || "자료를 불러올 수 없습니다.");
        if (active) {
          setWorks(result.works);
          setVideos(result.videos);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "자료를 불러올 수 없습니다.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function importWork(id: string) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ id }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "가져오지 못했습니다.");
      await onImported();
      setMessage(
        result.already_imported
          ? "이미 가져온 작품입니다. 기존 편집본은 유지했습니다."
          : "작품과 자료를 비공개로 보관했습니다. 작품 관리에서 본문·날짜·공개 범위를 확인해 주세요.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오지 못했습니다.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="candidate-library">
      <h2>제공된 실제 자료</h2>
      <p>
        9개 작품 묶음을 제목·출처·전사 본문과 함께 보관했습니다. 가져오기는 공개
        승인과 별개이며, 기존 편집본을 덮어쓰지 않습니다.
      </p>
      {loading && <p role="status">자료를 확인하고 있어요…</p>}
      {!loading && !error && works.length === 0 && (
        <p className="admin-hint">
          이 환경에는 검토용 파일 묶음이 없습니다. 자료가 보관된 클라우드 검토
          환경에서 비공개 가져오기를 진행해 주세요.
        </p>
      )}
      <div className="candidate-grid">
        {works.map((w) => {
          const existing = importedWorks.find((i) => i.source_id === w.id);
          return (
            <article key={w.id}>
              <div className="eyebrow">
                {w.provenance?.category} · {w.year ?? "제작일 미확인"}
              </div>
              <h3>{w.title}</h3>
              <p>{w.description}</p>
              <small>{w.provenance?.date_basis}</small>
              <details>
                <summary>전사·출처·검수 메모</summary>
                <p>{w.provenance?.authorship_note}</p>
                <ul>
                  {w.review?.review_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                {w.content_text && <ContentText text={w.content_text} />}
              </details>
              <button
                className="text-link"
                disabled={!!busy || !!existing}
                onClick={() => void importWork(w.id)}
              >
                <Download size={14} />
                {busy === w.id
                  ? "비공개로 보관 중…"
                  : existing
                    ? "가져온 작품"
                    : "비공개로 가져오기"}
              </button>
            </article>
          );
        })}
      </div>
      {message && (
        <p className="admin-message" role="status">
          <Sparkles size={15} />
          {message}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <section className="candidate-video-list">
        <h3>사용자 지정 YouTube 링크 6개</h3>
        <p>
          영상의 제목·내용·출연자·임베드 상태는 미확인입니다. 확인한 뒤 작품
          편집의 YouTube 주소에 연결할 수 있습니다.
        </p>
        {videos.map((v, i) => (
          <a href={v.url} target="_blank" rel="noopener noreferrer" key={v.id}>
            <span>
              0{i + 1} · {v.id}
            </span>
            <ArrowUpRight size={15} />
          </a>
        ))}
      </section>
      <p className="admin-hint">
        비공개 원본 ZIP은 파일 전송 한도로 아직 반영되지 않았습니다. 이 목록은
        제공된 공개용 후보 파생본을 기준으로 합니다.
      </p>
    </section>
  );
}
