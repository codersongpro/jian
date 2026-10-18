"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Grid2X2,
  Orbit,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  categories,
  mediaUrl,
  type Work,
  type SiteSettings,
  type VideoLink,
} from "@/lib/model";
import { filterWorks } from "@/lib/validation";
import { Artwork } from "./artwork";
import { WorkDialog } from "./work-dialog";
import { SoundProvider, useSound } from "./sound-provider";
import { Sky } from "./landing/sky";
import { Intro } from "./landing/intro";
import { WordsInterlude } from "./landing/words-interlude";
import { OrbitInterlude } from "./landing/orbit-interlude";
import { PaintInterlude } from "./landing/paint-interlude";
import { RhythmInterlude } from "./landing/rhythm-interlude";

const fieldCopy = [
  {
    category: "문학",
    label: "WORDS & WONDER",
    title: "마음이 글이 되는 순간",
    text: "일상에서 주운 작은 생각들을 한 글자씩, 나만의 이야기로 엮어요.",
    symbol: "01 / LITERATURE",
  },
  {
    category: "과학",
    label: "SCIENCE & PATTERNS",
    title: "세상에 물음표를 건네다",
    text: "왜 그럴까? 어떻게 될까? 하나의 질문이 또 다른 발견으로 이어져요.",
    symbol: "02 / DISCOVERY",
  },
  {
    category: "미술",
    label: "ART & EXPRESSION",
    title: "색과 선으로 펼치는 상상",
    text: "눈에 보이는 것 너머, 마음에 담긴 풍경을 자유롭게 그려요.",
    symbol: "03 / CREATION",
  },
  {
    category: "음악",
    label: "NOTES & MOVEMENT",
    title: "소리와 몸짓으로 전하는 말",
    text: "작은 음표와 발끝의 곡선이 말로 다 못한 이야기를 들려줘요.",
    symbol: "04 / HARMONY",
  },
];

function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 1Q16 14 29 15Q16 16 15 29Q14 16 1 15Q14 14 15 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Exhibition({
  works,
  settings,
  mode,
  videos = [],
}: {
  works: Work[];
  settings: SiteSettings;
  mode: "review" | "repository" | "unavailable";
  videos?: VideoLink[];
}) {
  return (
    <SoundProvider settings={settings} autoplay>
      <Universe works={works} settings={settings} mode={mode} videos={videos} />
    </SoundProvider>
  );
}
function Universe({
  works,
  settings,
  mode,
  videos,
}: {
  works: Work[];
  settings: SiteSettings;
  mode: string;
  videos: VideoLink[];
}) {
  const [category, setCategory] = useState("전체"),
    [year, setYear] = useState("전체"),
    [view, setView] = useState("grid"),
    [selected, setSelected] = useState<Work | null>(null),
    [panel, setPanel] = useState(false),
    // intro: 인트로 재생 중, ready: 본문 등장
    [stage, setStage] = useState<"intro" | "ready">("intro"),
    [replay, setReplay] = useState(0);
  const [economy, setEconomy] = useState(false);
  useEffect(() => {
    const hardware = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    setEconomy(
      Boolean(hardware.connection?.saveData) ||
        (hardware.deviceMemory ?? 8) < 4 ||
        hardware.hardwareConcurrency <= 2,
    );
  }, []);
  const {
    ready,
    enabled,
    wanted,
    start,
    toggleMusic,
    toggle,
    effect,
    tone,
    preferences,
    update,
    reduced,
    error,
    paused,
    resumeBackground,
  } = useSound();
  const container = useRef<HTMLDivElement>(null);
  const visible = filterWorks(works, category, year),
    featured = works
      .filter((w) => w.featured_order !== null)
      .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0))
      .slice(0, 6);
  const heroWorks = featured.length ? featured : works.slice(0, 3);
  const years = [...new Set(works.map((w) => w.year))].sort(
    (a, b) => (b ?? -1) - (a ?? -1),
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    container.current
      ?.querySelectorAll(".reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  // 히어로 아래까지 내려갔다가 맨 위로 돌아오면 인트로를 다시 재생합니다.
  useEffect(() => {
    if (reduced) return;
    let away = false;
    const watch = () => {
      if (scrollY > innerHeight * 0.8) away = true;
      else if (away && scrollY < 8) {
        away = false;
        setStage("intro");
        setReplay((n) => n + 1);
      }
    };
    addEventListener("scroll", watch, { passive: true });
    return () => removeEventListener("scroll", watch);
  }, [reduced]);
  // 페이지 안 링크(#…)는 클릭할 때만 부드럽게 이동합니다.
  useEffect(() => {
    const jump = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (
        !link ||
        link.matches(".skip-link") ||
        e.defaultPrevented ||
        e.button !== 0
      )
        return;
      const id = link.getAttribute("href")!.slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      history.replaceState(null, "", id ? `#${id}` : location.pathname);
    };
    document.addEventListener("click", jump);
    return () => document.removeEventListener("click", jump);
  }, [reduced]);
  function open(work: Work, kind: "select" | "star" = "select") {
    effect(kind);
    setSelected(work);
  }
  function choose(value: string) {
    effect("page");
    setCategory(value);
  }
  return (
    <div
      ref={container}
      className="universe"
      data-reduced={String(reduced)}
      data-intensity={
        economy && settings.motion_intensity === "full"
          ? "gentle"
          : settings.motion_intensity
      }
      data-economy={String(economy)}
      data-stage={stage}
    >
      <Sky reduced={reduced} economy={economy} />
      <Intro
        reduced={reduced}
        economy={economy}
        soundOn={enabled}
        enableSound={() => void start(true)}
        onReveal={() => setStage("ready")}
        replay={replay}
      />
      {mode === "review" && (
        <div className="review-banner" role="status">
          <Sparkles size={14} />
          <span>
            자료 검토 미리보기 · {works.length}개 작품 묶음 · 공개 검수 대기
          </span>
        </div>
      )}
      <a href="#collection" className="skip-link">
        작품 목록으로 건너뛰기
      </a>
      <header className="site-header">
        <a href="#" className="brand" aria-label="Jian’s Universe 홈">
          <Star />
          <span>
            jian’s universe<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="메인 메뉴">
          <a href="#about">작은 우주 소개</a>
          <a href="#collection">작품 둘러보기</a>
          <a href="#journey">성장의 기록</a>
        </nav>
        <div className="header-controls">
          <button
            disabled={!ready}
            data-sound-control
            className={`sound-toggle ${wanted ? "is-on" : ""}`}
            aria-label={wanted ? "사운드 끄기" : "사운드 켜기"}
            onClick={() => void toggle()}
          >
            {wanted ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>SOUND {wanted ? "ON" : "OFF"}</span>
          </button>
          <button
            disabled={!ready}
            className="icon-button settings-button"
            aria-label="감상 설정"
            aria-expanded={panel}
            onClick={() => setPanel(!panel)}
          >
            {panel ? <X size={18} /> : <Settings2 size={18} />}
          </button>
        </div>
      </header>
      {panel && (
        <section className="preferences" aria-label="감상 설정 패널">
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h2>나만의 감상 방식</h2>
          <p>소리 없이도 충분히 아름다운 우주예요.</p>
          <label>
            <span>배경 음악</span>
            <input
              type="checkbox"
              checked={preferences.music}
              onChange={(e) => update({ music: e.target.checked })}
            />
          </label>
          <label>
            <span>효과음</span>
            <input
              type="checkbox"
              checked={preferences.effects}
              onChange={(e) => update({ effects: e.target.checked })}
            />
          </label>
          <label>
            <span>모션 최소화</span>
            <input
              type="checkbox"
              checked={preferences.reduced}
              onChange={(e) => update({ reduced: e.target.checked })}
            />
          </label>
          <label>
            <span>볼륨</span>
            <input
              aria-label="볼륨"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={preferences.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
          {enabled && paused && (
            <button className="text-link" onClick={resumeBackground}>
              배경 음악 재개 <ArrowRight size={14} />
            </button>
          )}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
      <main>
        <section
          id="top"
          className="hero"
          aria-labelledby="hero-title"
          style={
            settings.background_id
              ? {
                  backgroundImage: `linear-gradient(90deg,rgba(7,11,34,.92),rgba(20,26,68,.55)),url(${mediaUrl(settings.background_id)})`,
                }
              : undefined
          }
        >
          <div className="hero-copy">
            <div className="eyebrow hero-kicker">
              <span className="little-line" /> A LITTLE MIND, AN INFINITE
              UNIVERSE
            </div>
            <h1 id="hero-title">
              JIAN’S
              <br />
              <span>UNIVERSE</span>
              <Star className="title-star" />
            </h1>
            <p className="hero-subtitle">
              작은 호기심에서 시작된
              <br />
              <strong>커다란 이야기</strong>
            </p>
            <p className="hero-description">
              글로, 그림으로, 소리와 몸짓으로.
              <br />
              지안이의 생각이 반짝이는 작은 우주에 오신 걸 환영해요.
            </p>
            <a className="primary-button" href="#collection">
              지안이의 우주 둘러보기 <ArrowUpRight size={17} />
            </a>
            <div className="hero-footnote">
              <span className="mini-orbit">✧</span> 생각이 작품이 되고, 작품이
              하나의 세계가 되는 곳
            </div>
          </div>
          <div
            className="hero-universe"
            onPointerMove={(e) => {
              if (reduced || e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                "--px",
                `${(e.clientX - r.left - r.width / 2) * 0.012}px`,
              );
              e.currentTarget.style.setProperty(
                "--py",
                `${(e.clientY - r.top - r.height / 2) * 0.012}px`,
              );
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.setProperty("--px", "0px");
              e.currentTarget.style.setProperty("--py", "0px");
            }}
          >
            <svg
              className="hero-orbits"
              viewBox="0 0 600 560"
              aria-hidden="true"
            >
              <ellipse
                cx="299"
                cy="280"
                rx="265"
                ry="185"
                transform="rotate(-27 299 280)"
              />
              <ellipse
                cx="299"
                cy="280"
                rx="211"
                ry="251"
                transform="rotate(29 299 280)"
              />
              <path
                className="constellation-line"
                d="M140 150L420 130L464 371L240 447L140 150"
              />
              <circle cx="140" cy="150" r="4" />
              <circle cx="420" cy="130" r="3" />
              <circle cx="464" cy="371" r="4" />
              <circle cx="240" cy="447" r="3" />
            </svg>
            <span className="floating-label label-top">
              a collection of little wonders
            </span>
            <span className="floating-label label-bottom">
              made of curiosity & a little stardust
            </span>
            <Star className="universe-star star-one" />
            <Star className="universe-star star-two" />
            <span className="star-dot dot-one" />
            <span className="star-dot dot-two" />
            {heroWorks.slice(0, 3).map((w, i) => (
              <button
                disabled={!ready}
                key={w.id}
                data-motion={String(w.motion_enabled)}
                className={`hero-card hero-card-${i + 1}`}
                onClick={() => open(w, "star")}
                aria-label={`${w.title} 미리보기`}
              >
                <div className="hero-card-art">
                  <Artwork work={w} />
                </div>
                <span className="hero-card-caption">
                  <span>{w.title}</span>
                  <ArrowUpRight size={13} />
                </span>
              </button>
            ))}
            {!heroWorks.length && (
              <div className="hero-empty">
                <Star />
                <p>
                  새로운 이야기를
                  <br />
                  준비하고 있어요.
                </p>
              </div>
            )}
            <span className="orbit-caption">
              ✦ EVERY LITTLE THOUGHT IS A STAR
            </span>
          </div>
          <a href="#about" className="scroll-cue">
            <span>SCROLL TO DISCOVER</span>
            <ArrowDown size={14} />
          </a>
        </section>
        <div className="universe-ribbon" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div className="ribbon-track" key={copy}>
              {[
                "WORDS",
                "SCIENCE",
                "MATH",
                "ART",
                "MUSIC",
                "BALLET",
                "ENDLESS CURIOSITY",
              ].map((word) => (
                <span key={word} className="ribbon-item">
                  <span>{word}</span>
                  <Star />
                </span>
              ))}
            </div>
          ))}
        </div>
        <section id="about" className="about-section section-shell reveal">
          <div>
            <div className="eyebrow">
              <span className="section-index">01</span> ABOUT THIS LITTLE
              UNIVERSE
            </div>
            <h2>
              좋아하는 것들이 모여
              <br />
              <em>나라는 우주가 돼요.</em>
            </h2>
          </div>
          <div className="about-copy">
            <Star />
            <p>
              한 편의 동시, 한 장의 그림, 끝없는 물음표.
              <br />
              지안이의 시선으로 바라본 세상을 차곡차곡 모았습니다.
            </p>
            <p>
              잘하는 것보다 좋아하는 마음을,
              <br />
              완성보다 자라나는 과정을 담는 작은 전시관입니다.
            </p>
            <span className="handwritten">with curiosity, always.</span>
          </div>
        </section>
        <WordsInterlude onComplete={() => effect("chime")} tone={tone} />
        <section id="collection" className="collection section-shell reveal">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="section-index">02</span> THE COLLECTION
              </div>
              <h2>
                반짝이는 생각의 조각들<span className="heading-spark">✳</span>
              </h2>
              <p>하나하나의 작품 속에 담긴 이야기를 만나 보세요.</p>
            </div>
            <span className="collection-count">
              {String(works.length).padStart(2, "0")}{" "}
              <span>little wonders</span>
            </span>
          </div>
          {mode === "review" && (
            <p className="collection-notice">
              <Sparkles size={14} /> 제공된 실제 자료입니다. 전사·편집 여부와
              날짜 근거는 작품 상세에서 확인할 수 있습니다.
            </p>
          )}
          {mode === "unavailable" && (
            <p className="collection-notice" role="status">
              전시 자료를 잠시 불러올 수 없어요. 조금 뒤 다시 방문해 주세요.
            </p>
          )}
          <div className="collection-toolbar">
            <div className="filters" role="group" aria-label="작품 분야">
              {categories.map((c) => (
                <button
                  disabled={!ready}
                  key={c}
                  className={category === c ? "active" : ""}
                  aria-pressed={category === c}
                  onClick={() => choose(c)}
                >
                  {c === "전체" ? "전체 작품" : c}
                </button>
              ))}
            </div>
            <div className="view-controls">
              <button
                disabled={!ready}
                aria-label="목록 보기"
                aria-pressed={view === "grid"}
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                disabled={!ready}
                aria-label="별자리 보기"
                aria-pressed={view === "stars"}
                className={view === "stars" ? "active" : ""}
                onClick={() => setView("stars")}
              >
                <Orbit size={18} />
              </button>
            </div>
          </div>
          {view === "stars" && (
            <div className="constellation" aria-label="작품 별자리">
              <svg
                viewBox="0 0 900 300"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={
                    category === "전체"
                      ? "M70 160L215 80L370 195L520 70L675 185L830 100"
                      : "M70 100L215 190L370 70L520 195L675 90L830 160"
                  }
                />
              </svg>
              {visible.slice(0, 6).map((w, i) => (
                <button
                  disabled={!ready}
                  key={w.id}
                  className="constellation-work"
                  style={{
                    left: `${8 + i * 16}%`,
                    top: `${(category === "전체" ? [53, 27, 65, 23, 62, 33] : [33, 63, 23, 65, 30, 53])[i]}%`,
                  }}
                  onClick={() => open(w, "star")}
                >
                  <Star />
                  <span>{w.title}</span>
                  <small>{w.category}</small>
                </button>
              ))}
            </div>
          )}
          <div className="work-grid" aria-live="polite">
            {visible.map((w, i) => (
              <button
                disabled={!ready}
                key={w.id}
                data-work-card
                data-motion={String(w.motion_enabled)}
                className="work-card"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                onClick={() => open(w)}
              >
                <div className="work-card-art">
                  <Artwork work={w} />
                  <span className="card-open">
                    <ArrowUpRight size={19} />
                  </span>
                </div>
                <div className="card-meta">
                  <span>{w.category}</span>
                  <span>{w.year ?? "제작일 미확인"}</span>
                </div>
                <h3>{w.title}</h3>
                <p>{w.description}</p>
              </button>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-collection">
              <Star />
              <p>
                아직 이곳에 도착하지 않은 별이에요.
                <br />
                다른 분야의 이야기를 먼저 만나 보세요.
              </p>
              <button
                disabled={!ready}
                className="text-link"
                onClick={() => {
                  setCategory("전체");
                  setYear("전체");
                }}
              >
                전체 작품 보기 <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <OrbitInterlude
          reduced={reduced}
          economy={economy}
          onSpawn={() => effect("orbit")}
        />
        <section className="field-section section-shell reveal">
          <div className="eyebrow">
            <span className="section-index">03</span> MANY WAYS TO WONDER
          </div>
          <div className="field-heading">
            <h2>
              호기심에는
              <br />
              <em>여러 가지 모양이 있어요.</em>
            </h2>
            <p>
              서로 다른 세계가 만나
              <br />더 넓은 상상이 펼쳐집니다.
            </p>
          </div>
          <div className="field-grid">
            {fieldCopy.map((f, i) => (
              <a
                href="#collection"
                className={`field-card field-${i}`}
                key={f.category}
                onClick={() => {
                  choose(f.category);
                  setYear("전체");
                }}
              >
                <span className="field-symbol">
                  {i === 0 ? (
                    <BookOpen />
                  ) : i === 1 ? (
                    <Orbit />
                  ) : i === 2 ? (
                    <Sparkles />
                  ) : (
                    <AudioLines />
                  )}
                </span>
                <span className="eyebrow">{f.label}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <div className="field-bottom">
                  <span>{f.symbol}</span>
                  <ArrowUpRight size={18} />
                </div>
                <svg
                  className="field-decoration"
                  viewBox="0 0 200 90"
                  aria-hidden="true"
                >
                  {i === 0 ? (
                    <path d="M10 60Q50 10 90 60T190 60" />
                  ) : i === 1 ? (
                    <>
                      <ellipse cx="100" cy="45" rx="75" ry="25" />
                      <ellipse
                        cx="100"
                        cy="45"
                        rx="75"
                        ry="25"
                        transform="rotate(-30 100 45)"
                      />
                    </>
                  ) : i === 2 ? (
                    <>
                      <path d="M20 80L60 10L100 80Z" />
                      <circle cx="135" cy="45" r="35" />
                    </>
                  ) : (
                    <path d="M0 45Q15 0 30 45T60 45T90 45T120 45T150 45T180 45" />
                  )}
                </svg>
              </a>
            ))}
          </div>
        </section>
        <PaintInterlude reduced={reduced} onStroke={() => effect("brush")} />
        <section id="journey" className="journey section-shell reveal">
          <div className="journey-heading">
            <div className="eyebrow">
              <span className="section-index">04</span> GROWING, LITTLE BY
              LITTLE
            </div>
            <h2>
              오늘의 작은 별이
              <br />
              <em>내일의 우주가 되도록.</em>
            </h2>
            <p>작품을 따라 걸으며 성장의 순간들을 만나요.</p>
            {works.some((w) => w.provenance) && (
              <p className="date-basis-note">
                자료에 남은 연도입니다. 파일 등록일·판권일은 창작일과 다를 수
                있어요.
              </p>
            )}
          </div>
          <div className="timeline">
            <button
              disabled={!ready}
              className={year === "전체" ? "active" : ""}
              onClick={() => {
                setYear("전체");
                effect("page");
              }}
            >
              <span className="timeline-dot" />
              <strong>모든 순간</strong>
              <small>THE WHOLE JOURNEY</small>
            </button>
            {years.map((y) => (
              <button
                disabled={!ready}
                key={y ?? "unknown"}
                className={
                  year === (y === null ? "미상" : String(y)) ? "active" : ""
                }
                onClick={() => {
                  setYear(y === null ? "미상" : String(y));
                  effect("page");
                  document.getElementById("collection")?.scrollIntoView({
                    behavior: reduced ? "instant" : "smooth",
                  });
                }}
              >
                <span className="timeline-dot" />
                <strong>{y ?? "연도 미상"}</strong>
                <small>
                  {works.filter((w) => w.year === y).length}개의 생각
                </small>
              </button>
            ))}
          </div>
        </section>
        <RhythmInterlude tone={tone} soundOn={enabled} />
        {videos.length > 0 && (
          <section
            className="source-videos section-shell reveal"
            aria-labelledby="source-videos-title"
          >
            <div className="eyebrow">MOVING MOMENTS · 지안이의 영상</div>
            <h2 id="source-videos-title">소리와 몸짓으로 남긴 장면들</h2>
            <p>영상을 누르면 YouTube에서 열립니다.</p>
            <div className="source-video-grid video-cards">
              {videos.map((video, i) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${video.title || `지안이의 영상 ${i + 1}`} · YouTube에서 보기`}
                >
                  <span className="video-thumb">
                    <img
                      src={`https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    <span className="video-play" aria-hidden="true" />
                  </span>
                  <span className="video-meta">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{video.title || `지안이의 영상 ${i + 1}`}</strong>
                    <ArrowUpRight size={18} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
        <section id="nightfall" className="closing-note reveal">
          <Star />
          <p>
            “작은 호기심 하나가
            <br />
            어디까지 데려다줄지, 아직은 모르니까요.”
          </p>
          <span>KEEP WONDERING. KEEP GROWING.</span>
        </section>
      </main>
      <footer className="site-footer">
        <a href="#" className="brand">
          <Star />
          <span>jian’s universe.</span>
        </a>
        <p>작은 호기심에서 시작된 커다란 이야기</p>
        <div>
          <span>© {new Date().getFullYear()} JIAN’S UNIVERSE</span>
        </div>
      </footer>
      {/* 배경 음악 켜고 끄기: 화면 오른쪽 아래에 늘 떠 있는 버튼 */}
      <button
        type="button"
        data-sound-control
        className={`music-fab ${enabled && preferences.music && !paused ? "is-playing" : ""}`}
        aria-label={
          enabled && preferences.music && !paused
            ? "배경 음악 끄기"
            : "배경 음악 켜기"
        }
        aria-pressed={enabled && preferences.music && !paused}
        onClick={toggleMusic}
      >
        <span className="music-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="music-label">
          {enabled && preferences.music && !paused
            ? "배경 음악 ON"
            : wanted && !enabled
              ? "화면을 누르면 음악이 시작돼요"
              : "배경 음악 OFF"}
        </span>
      </button>
      <WorkDialog work={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
