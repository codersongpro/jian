"use client";
import { useEffect, useRef } from "react";
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

export function RhythmInterlude({
  tone,
  soundOn,
}: {
  tone: (f: number) => void;
  soundOn: boolean;
}) {
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
            <span>INTERLUDE · 04</span> {t.rhythmLabel}
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
                className="rhythm-note"
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
      </div>
    </section>
  );
}
