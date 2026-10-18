"use client";
import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "./use-scroll";
import { useCopy } from "../lang";

// 음악·발레: 스크롤에 맞춰 리본 곡선이 그려지고, 춤추는 별이 곡선을 따라 움직입니다.
// 오선 위 음표를 누르면 소리가 나요.
// 낮은 도(C4)부터 높은 도(C5)까지 한 옥타브를 왼쪽 아래에서 오른쪽 위로 배치
const NOTES = [
  { name: "낮은 도", f: 261.63, x: 110, y: 260 },
  { name: "레", f: 293.66, x: 221, y: 247 },
  { name: "미", f: 329.63, x: 332, y: 234 },
  { name: "파", f: 349.23, x: 443, y: 221 },
  { name: "솔", f: 392, x: 554, y: 208 },
  { name: "라", f: 440, x: 665, y: 195 },
  { name: "시", f: 493.88, x: 776, y: 182 },
  { name: "높은 도", f: 523.25, x: 887, y: 169 },
];
const RIBBON =
  "M-20 300C120 120 220 380 340 250S520 40 600 170S760 380 860 220S980 60 1040 140";

// 지안이가 작곡한 「크리스마스의 행복」 악보에 적힌 화음 (첫째·둘째 줄)
// 각 화음이 오선 위 음표(0=낮은 도 … 7=높은 도) 중 어떤 음으로 이루어지는지
const CHORDS: { name: string; notes: number[] }[] = [
  { name: "C", notes: [0, 2, 4, 7] },
  { name: "G", notes: [4, 6, 1] },
  { name: "Am", notes: [5, 7, 2] },
  { name: "G7", notes: [4, 6, 1, 3] },
  { name: "C", notes: [0, 2, 4, 7] },
  { name: "F", notes: [3, 5, 7] },
  { name: "G", notes: [4, 6, 1] },
  { name: "C", notes: [0, 2, 4, 7] },
];

export type Song = { title: string; open: () => void };

export function RhythmInterlude({
  tone,
  soundOn,
  christmas,
  songs = [],
}: {
  tone: (f: number) => void;
  soundOn: boolean;
  /** 「크리스마스의 행복」 작품 (악보 보기) */
  christmas?: Song;
  /** 지안이가 작곡한 다른 노래들 */
  songs?: Song[];
}) {
  const [chord, setChord] = useState(-1),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // 화음을 하나씩 짚으며 음표를 밝히고 연주합니다.
  const playChords = () => {
    clearTimeout(timer.current);
    const step = (i: number) => {
      if (i >= CHORDS.length) return setChord(-1);
      setChord(i);
      CHORDS[i].notes.forEach((n, k) =>
        setTimeout(() => tone(NOTES[n].f), k * 70),
      );
      timer.current = setTimeout(() => step(i + 1), 1100);
    };
    step(0);
  };
  const lit = chord >= 0 ? CHORDS[chord].notes : [];
  const { t } = useCopy();
  const ref = useRef<HTMLElement>(null),
    path = useRef<SVGPathElement>(null),
    dancer = useRef<SVGGElement>(null),
    length = useRef(0);
  useEffect(() => {
    length.current = path.current?.getTotalLength() ?? 0;
  }, []);
  useScrollProgress(ref, (p) => {
    const el = path.current,
      d = dancer.current;
    if (!el || !d || !length.current) return;
    const at = Math.min(0.999, Math.max(0.001, p * 1.15 - 0.05)),
      pt = el.getPointAtLength(at * length.current),
      ahead = el.getPointAtLength(
        Math.min(length.current, at * length.current + 4),
      ),
      angle = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
    d.setAttribute(
      "transform",
      `translate(${pt.x} ${pt.y}) rotate(${angle * 0.35})`,
    );
  });
  return (
    <section
      ref={ref}
      className="interlude rhythm-interlude"
      aria-labelledby="rhythm-title"
    >
      <div className="interlude-stage">
        <div className="rhythm-copy">
          <div className="interlude-label">
            <span>INTERLUDE · 05</span> {t.rhythmLabel}
          </div>
          <h2 id="rhythm-title">
            {t.rhythmTitle[0]}
            <br />
            <em>{t.rhythmTitle[1]}</em>
          </h2>
        </div>
        <div className="rhythm-board">
          <svg className="rhythm-art" viewBox="0 0 1000 420" aria-hidden="true">
            <defs>
              <linearGradient id="ribbon-gradient" x1="0" x2="1">
                <stop offset="0" stopColor="#f3d6a0" />
                <stop offset=".5" stopColor="#e7b6c8" />
                <stop offset="1" stopColor="#b9c6ff" />
              </linearGradient>
            </defs>
            <g className="rhythm-staff">
              {/* 높은음자리 오선: 맨 아래 줄 = 미(E4), 줄·칸 간격 13 */}
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M0 ${130 + i * 26}H1000`} />
              ))}
              {/* 낮은 도의 덧줄 */}
              <path className="ledger" d="M80 260H140" />
            </g>
            <path
              ref={path}
              className="rhythm-ribbon"
              d={RIBBON}
              pathLength={1}
            />
            <g ref={dancer} className="rhythm-dancer">
              <circle r="16" className="dancer-glow" />
              <path d="M0-12 2.6-3.6 11.4-3.7 4.3 1.5 7 10 0 4.8-7 10-4.3 1.5-11.4-3.7-2.6-3.6Z" />
            </g>
          </svg>
          <div className="rhythm-notes" role="group" aria-label={t.notesLabel}>
            {NOTES.map((n, i) => (
              <button
                key={n.name}
                type="button"
                className={`rhythm-note ${lit.includes(i) ? "lit" : ""}`}
                aria-label={t.playNote(t.noteNames[i])}
                style={
                  {
                    left: `${n.x / 10}%`,
                    top: `${(n.y / 420) * 100}%`,
                    "--i": i,
                  } as React.CSSProperties
                }
                onClick={(e) => {
                  tone(n.f);
                  const el = e.currentTarget;
                  el.classList.remove("ring");
                  void el.offsetWidth;
                  el.classList.add("ring");
                }}
              >
                <svg viewBox="0 0 30 60" aria-hidden="true">
                  <ellipse
                    cx="11"
                    cy="48"
                    rx="10"
                    ry="7"
                    transform="rotate(-22 11 48)"
                  />
                  <path d="M20 46V6q6 6 9 14" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <p className="interlude-hint">
          {soundOn ? t.rhythmHintOn : t.rhythmHintOff}
        </p>
        {/* 지안이의 작곡 노트와 연결 */}
        <div className="rhythm-songs">
          <span className="rhythm-songs-label">{t.songsLabel}</span>
          {christmas && (
            <div className="rhythm-song">
              <strong>{christmas.title}</strong>
              <div className="rhythm-chords" aria-hidden="true">
                {CHORDS.map((c, i) => (
                  <b key={i} className={chord === i ? "now" : ""}>
                    {c.name}
                  </b>
                ))}
              </div>
              <button type="button" onClick={playChords}>
                ▶ {t.songPlayChords}
              </button>
              <button type="button" className="ghost" onClick={christmas.open}>
                {t.songOpenScore}
              </button>
            </div>
          )}
          {songs.map((s) => (
            <button
              key={s.title}
              type="button"
              className="rhythm-song-link"
              onClick={s.open}
            >
              ♪ {s.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
