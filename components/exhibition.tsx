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
import { MathInterlude } from "./landing/math-interlude";
import { BalletInterlude } from "./landing/ballet-interlude";
import { CycloidCard } from "./landing/cycloid-card";
import { BrainCard } from "./landing/brain-card";
import { LangProvider, useCopy } from "./lang";
import { categoryLabel, type Lang } from "@/lib/i18n";

const fieldCopy = [
  {
    category: "문학",
    label: "WORDS & WONDER",
    symbol: "01 / LITERATURE",
  },
  {
    category: "과학",
    label: "SCIENCE & PATTERNS",
    symbol: "02 / DISCOVERY",
  },
  {
    category: "미술",
    label: "ART & EXPRESSION",
    symbol: "03 / CREATION",
  },
  {
    category: "음악",
    label: "NOTES & MOVEMENT",
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
  lang = "ko",
}: {
  works: Work[];
  settings: SiteSettings;
  mode: "review" | "repository" | "unavailable";
  videos?: VideoLink[];
  lang?: Lang;
}) {
  return (
    <LangProvider lang={lang}>
      <SoundProvider settings={settings} autoplay>
        <Universe
          works={works}
          settings={settings}
          mode={mode}
          videos={videos}
        />
      </SoundProvider>
    </LangProvider>
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
  // 작품이 많아 스크롤이 길어지지 않도록 처음에는 일부만 보여 줍니다.
  const PAGE = 9;
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [category, year]);
  const { lang, t } = useCopy();
  const title = (w: Work) => (lang === "en" && w.title_en) || w.title,
    blurb = (w: Work) => (lang === "en" && w.description_en) || w.description;
  // 영어 페이지에서는 <html lang>도 영어로 바꿉니다.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
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
        {t.skip}
      </a>
      <header className="site-header">
        <a href="#" className="brand" aria-label={t.home}>
          <Star />
          <span>
            jian’s universe<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label={t.navLabel}>
          <a href="#about">{t.navAbout}</a>
          <a href="#collection">{t.navCollection}</a>
          <a href="#journey">{t.navJourney}</a>
        </nav>
        <div className="header-controls">
          <a
            className="lang-switch"
            href={t.langSwitchHref}
            hrefLang={lang === "en" ? "ko" : "en"}
            aria-label={t.langSwitchLabel}
          >
            {t.langSwitch}
          </a>
          <button
            disabled={!ready}
            data-sound-control
            className={`sound-toggle ${wanted ? "is-on" : ""}`}
            aria-label={wanted ? t.soundOff : t.soundOn}
            onClick={() => void toggle()}
          >
            {wanted ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>SOUND {wanted ? "ON" : "OFF"}</span>
          </button>
          <button
            disabled={!ready}
            className="icon-button settings-button"
            aria-label={t.settings}
            aria-expanded={panel}
            onClick={() => setPanel(!panel)}
          >
            {panel ? <X size={18} /> : <Settings2 size={18} />}
          </button>
        </div>
      </header>
      {panel && (
        <section className="preferences" aria-label={t.settingsPanel}>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h2>{t.settingsTitle}</h2>
          <p>{t.settingsText}</p>
          <label>
            <span>{t.music}</span>
            <input
              type="checkbox"
              checked={preferences.music}
              onChange={(e) => update({ music: e.target.checked })}
            />
          </label>
          <label>
            <span>{t.effects}</span>
            <input
              type="checkbox"
              checked={preferences.effects}
              onChange={(e) => update({ effects: e.target.checked })}
            />
          </label>
          <label>
            <span>{t.reduceMotion}</span>
            <input
              type="checkbox"
              checked={preferences.reduced}
              onChange={(e) => update({ reduced: e.target.checked })}
            />
          </label>
          <label>
            <span>{t.volume}</span>
            <input
              aria-label={t.volume}
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
              {t.resumeMusic} <ArrowRight size={14} />
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
              {t.heroSubtitle[0]}
              <br />
              <strong>{t.heroSubtitle[1]}</strong>
            </p>
            <p className="hero-description">
              {t.heroDescription[0]}
              <br />
              {t.heroDescription[1]}
            </p>
            <a className="primary-button" href="#collection">
              {t.heroCta} <ArrowUpRight size={17} />
            </a>
            <div className="hero-footnote">
              <span className="mini-orbit">✧</span> {t.heroFootnote}
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
                aria-label={t.preview(title(w))}
              >
                <div className="hero-card-art">
                  <Artwork work={w} />
                </div>
                <span className="hero-card-caption">
                  <span>{title(w)}</span>
                  <ArrowUpRight size={13} />
                </span>
              </button>
            ))}
            {!heroWorks.length && (
              <div className="hero-empty">
                <Star />
                <p>
                  {t.heroEmpty[0]}
                  <br />
                  {t.heroEmpty[1]}
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
              {t.aboutTitle[0]}
              <br />
              <em>{t.aboutTitle[1]}</em>
            </h2>
          </div>
          <div className="about-copy">
            <Star />
            {t.aboutText.map(([a, b]) => (
              <p key={a}>
                {a}
                <br />
                {b}
              </p>
            ))}
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
                {t.collectionTitle}
                <span className="heading-spark">✳</span>
              </h2>
              <p>{t.collectionText}</p>
            </div>
            <span className="collection-count">
              {String(works.length).padStart(2, "0")}{" "}
              <span>little wonders</span>
            </span>
          </div>
          {mode === "review" && (
            <p className="collection-notice">
              <Sparkles size={14} /> {t.reviewNotice}
            </p>
          )}
          {mode === "unavailable" && (
            <p className="collection-notice" role="status">
              {t.unavailable}
            </p>
          )}
          <div className="collection-toolbar">
            <div className="filters" role="group" aria-label={t.filtersLabel}>
              {/* 작품이 있는 분야만, 작품 수와 함께 보여 줍니다. */}
              {categories
                .filter(
                  (c) => c === "전체" || works.some((w) => w.category === c),
                )
                .map((c) => (
                  <button
                    disabled={!ready}
                    key={c}
                    className={category === c ? "active" : ""}
                    aria-pressed={category === c}
                    onClick={() => choose(c)}
                  >
                    {c === "전체" ? t.allWorks : categoryLabel(c, lang)}
                    <span className="filter-count" aria-hidden="true">
                      {c === "전체"
                        ? works.length
                        : works.filter((w) => w.category === c).length}
                    </span>
                  </button>
                ))}
            </div>
            <div className="view-controls">
              <button
                disabled={!ready}
                aria-label={t.gridView}
                aria-pressed={view === "grid"}
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                disabled={!ready}
                aria-label={t.starView}
                aria-pressed={view === "stars"}
                className={view === "stars" ? "active" : ""}
                onClick={() => setView("stars")}
              >
                <Orbit size={18} />
              </button>
            </div>
          </div>
          {view === "stars" && (
            <div className="constellation" aria-label={t.constellation}>
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
                  <span>{title(w)}</span>
                  <small>{categoryLabel(w.category, lang)}</small>
                </button>
              ))}
            </div>
          )}
          <div className="work-grid" aria-live="polite">
            {visible.slice(0, limit).map((w, i) => (
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
                  <span>{categoryLabel(w.category, lang)}</span>
                  <span>{w.year ?? t.unknownDate}</span>
                </div>
                <h3>{title(w)}</h3>
                <p>{blurb(w)}</p>
              </button>
            ))}
          </div>
          {visible.length > PAGE && (
            <div className="show-more">
              {limit < visible.length ? (
                <>
                  <button
                    type="button"
                    className="show-more-main"
                    onClick={() => setLimit((n) => n + PAGE)}
                  >
                    {t.showMore(Math.min(PAGE, visible.length - limit))}
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setLimit(visible.length)}
                  >
                    {t.showAllWorks}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setLimit(PAGE);
                    document
                      .getElementById("collection")
                      ?.scrollIntoView({
                        behavior: reduced ? "auto" : "smooth",
                      });
                  }}
                >
                  {t.showLess}
                </button>
              )}
            </div>
          )}
          {!visible.length && (
            <div className="empty-collection">
              <Star />
              <p>
                {t.emptyCollection[0]}
                <br />
                {t.emptyCollection[1]}
              </p>
              <button
                disabled={!ready}
                className="text-link"
                onClick={() => {
                  setCategory("전체");
                  setYear("전체");
                }}
              >
                {t.showAll} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <OrbitInterlude
          reduced={reduced}
          economy={economy}
          onSpawn={() => effect("orbit")}
        />
        <CycloidCard
          reduced={reduced}
          onFinish={(won) => effect(won ? "success" : "page")}
        />
        <BrainCard
          tone={tone}
          onOpen={
            works.some((w) => w.id === "brain-journey")
              ? () => open(works.find((w) => w.id === "brain-journey")!)
              : undefined
          }
        />
        <MathInterlude
          tone={tone}
          onWhole={() => effect("chime")}
          onOpenBoard={
            works.some((w) => w.id === "teacher-board")
              ? () => open(works.find((w) => w.id === "teacher-board")!)
              : undefined
          }
        />
        <section className="field-section section-shell reveal">
          <div className="eyebrow">
            <span className="section-index">03</span> MANY WAYS TO WONDER
          </div>
          <div className="field-heading">
            <h2>
              {t.fieldsTitle[0]}
              <br />
              <em>{t.fieldsTitle[1]}</em>
            </h2>
            <p>
              {t.fieldsText[0]}
              <br />
              {t.fieldsText[1]}
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
                <h3>{t.fields[i].title}</h3>
                <p>{t.fields[i].text}</p>
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
        <PaintInterlude
          reduced={reduced}
          onStroke={() => effect("brush")}
          onReveal={() => effect("success")}
          artworks={[
            ["drawings", "/works/drawings/page-01.jpg"],
            ["moonjar", "/works/moonjar/drawing-3226.jpg"],
            ["brain-journey", "/works/brain-journey/page-01.jpg"],
            ["fan-painting", "/works/fan-painting/page-01.jpg"],
          ]
            .map(([id, src]) => ({ w: works.find((x) => x.id === id), src }))
            .filter((a) => a.w)
            .map(({ w, src }) => ({
              src,
              title: title(w!),
              open: () => open(w!),
            }))}
        />
        <section id="journey" className="journey section-shell reveal">
          <div className="journey-heading">
            <div className="eyebrow">
              <span className="section-index">04</span> GROWING, LITTLE BY
              LITTLE
            </div>
            <h2>
              {t.journeyTitle[0]}
              <br />
              <em>{t.journeyTitle[1]}</em>
            </h2>
            <p>{t.journeyText}</p>
            {works.some((w) => w.provenance) && (
              <p className="date-basis-note">{t.dateBasis}</p>
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
              <strong>{t.allMoments}</strong>
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
                <strong>{y ?? t.unknownYear}</strong>
                <small>
                  {t.thoughts(works.filter((w) => w.year === y).length)}
                </small>
              </button>
            ))}
          </div>
        </section>
        <RhythmInterlude
          tone={tone}
          soundOn={enabled}
          christmas={(() => {
            const w = works.find((x) => x.id === "christmas-song");
            return w ? { title: title(w), open: () => open(w) } : undefined;
          })()}
          songs={works
            .filter((x) => x.id === "song-score")
            .map((w) => ({ title: title(w), open: () => open(w) }))}
        />
        <BalletInterlude
          reduced={reduced}
          tone={tone}
          onTurn={() => effect("shimmer")}
        />
        {videos.length > 0 && (
          <section
            className="source-videos section-shell reveal"
            aria-labelledby="source-videos-title"
          >
            <div className="eyebrow">{t.videosEyebrow}</div>
            <h2 id="source-videos-title">{t.videosTitle}</h2>
            <p>{t.videosText}</p>
            <div className="source-video-grid video-cards">
              {videos.map((video, i) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${video.title || t.videoName(i + 1)} · ${t.watchOnYoutube}`}
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
                    <strong>{video.title || t.videoName(i + 1)}</strong>
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
            {t.closing[0]}
            <br />
            {t.closing[1]}
          </p>
          <span>KEEP WONDERING. KEEP GROWING.</span>
        </section>
      </main>
      <footer className="site-footer">
        <a href="#" className="brand">
          <Star />
          <span>jian’s universe.</span>
        </a>
        <p>{t.footer}</p>
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
          enabled && preferences.music && !paused ? t.musicOff : t.musicOnLabel
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
            ? t.musicPlaying
            : wanted && !enabled
              ? t.musicWaiting
              : t.musicStopped}
        </span>
      </button>
      <WorkDialog work={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
