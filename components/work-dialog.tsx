"use client";
import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ArrowUpRight } from "lucide-react";
import { Artwork } from "./artwork";
import { AudioPlayer, VideoPlayer } from "./media-player";
import { mediaUrl, type Work } from "@/lib/model";
import { ContentText } from "./content-text";
import { useCopy } from "./lang";
import { categoryLabel } from "@/lib/i18n";

export function WorkDialog({
  work,
  onClose,
}: {
  work: Work | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(false);
  const [page, setPage] = useState(0);
  const { lang, t } = useCopy();
  useEffect(() => {
    const el = dialog.current;
    if (!el || !work) return;
    setZoom(false);
    setPage(0);
    const previous = document.activeElement as HTMLElement;
    el.showModal();
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.querySelectorAll("audio,video").forEach((a) =>
        (a as HTMLMediaElement).pause(),
      );
      el.close();
      document.body.style.overflow = saved;
      previous?.focus();
    };
  }, [work]);
  if (!work) return null;
  const images =
    work.pages ||
    work.media
      .filter((m) => m.kind === "image" && m.approved)
      .map((m) => ({ url: mediaUrl(m.id), caption: m.original_name }));
  return (
    <dialog
      ref={dialog}
      className={`work-dialog ${zoom ? "zoomed" : ""}`}
      aria-labelledby="work-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-inner">
        <button
          className="icon-button dialog-close"
          aria-label={t.dialogClose}
          onClick={onClose}
        >
          <X />
        </button>
        <div className="dialog-visual">
          <button
            className="dialog-art"
            aria-label={zoom ? t.zoomOut : t.zoomIn}
            onClick={() => setZoom(!zoom)}
          >
            {images.length ? (
              <img
                className="original-art"
                src={images[page]?.url}
                alt={`${work.title} · ${images[page]?.caption}`}
                loading="lazy"
              />
            ) : (
              <Artwork work={work} />
            )}
            <span>
              <ZoomIn size={16} />
              {zoom ? t.zoomOutShort : t.zoomInShort}
            </span>
          </button>
          {images.length > 1 && (
            <nav className="page-navigation" aria-label={t.pagesLabel}>
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                {t.prev}
              </button>
              <span aria-live="polite">
                {page + 1} / {images.length}
              </span>
              <button
                disabled={page === images.length - 1}
                onClick={() => setPage(page + 1)}
              >
                {t.next}
              </button>
            </nav>
          )}
          {images[page] && (
            <p className="page-caption">{images[page].caption}</p>
          )}
          {images[page] && (
            <a
              className="text-link image-source-link"
              href={images[page].url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.openImage} <ArrowUpRight size={13} />
            </a>
          )}
        </div>
        <div className="dialog-copy">
          <div className="eyebrow">
            {categoryLabel(work.category, lang)} · {work.year ?? t.unknownDate}
            {work.sample ? t.sampleTag : ""}
          </div>
          <h2 id="work-title">
            {(lang === "en" && work.title_en) || work.title}
          </h2>
          <p>{(lang === "en" && work.description_en) || work.description}</p>
          {t.originalNote && <p className="dialog-note">{t.originalNote}</p>}
          {work.provenance && (
            <section className="work-provenance">
              <h3>{t.recordTitle}</h3>
              <dl>
                <dt>{t.recordDate}</dt>
                <dd>
                  {work.provenance.date || t.recordUnknown} ·{" "}
                  {work.provenance.date_basis}
                </dd>
                <dt>{t.recordCategory}</dt>
                <dd>{work.provenance.category}</dd>
                <dt>{t.recordNote}</dt>
                <dd>{work.provenance.authorship_note}</dd>
              </dl>
              {!work.is_public && work.review && (
                <details>
                  <summary>{t.recordReview}</summary>
                  <ul>
                    {work.review.review_notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
          {work.content_text && <ContentText text={work.content_text} />}
          {work.poem && <blockquote>{work.poem}</blockquote>}
          {work.media
            .filter((m) => m.kind === "audio" && m.approved)
            .map((m) => (
              <AudioPlayer
                key={m.id}
                src={mediaUrl(m.id)}
                title={m.original_name}
              />
            ))}
          {work.youtube_id && <VideoPlayer id={work.youtube_id} />}
          <div className="dialog-note">
            <ArrowUpRight size={14} />
            {work.sample ? t.dialogFootSample : t.dialogFoot}
          </div>
        </div>
      </div>
    </dialog>
  );
}
