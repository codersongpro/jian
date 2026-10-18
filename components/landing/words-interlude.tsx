"use client";
import { useMemo, useRef } from "react";
import { seeded, useScrollProgress } from "./use-scroll";

// 문학: 흩어진 글자 별들이 스크롤에 맞춰 한 문장으로 모입니다.
const LINES = ["내 생각 하나 하나가", "별이 되어", "나만의 우주를 만들어요."];
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export function WordsInterlude({
  onComplete,
  tone,
}: {
  onComplete: () => void;
  tone: (f: number) => void;
}) {
  const ref = useRef<HTMLElement>(null),
    completed = useRef(false);
  const glyphs = useMemo(() => {
    const rand = seeded(19);
    let n = 0;
    const total = LINES.join("").length;
    return LINES.map((line) =>
      [...line].map((ch) => {
        const i = n++;
        return {
          ch,
          i,
          style: {
            "--dx": `${(rand() - 0.5) * 120}vw`,
            "--dy": `${(rand() - 0.5) * 90}vh`,
            "--r": `${(rand() - 0.5) * 140}deg`,
            "--d": ((i / total) * 0.3).toFixed(3),
          } as React.CSSProperties,
        };
      }),
    );
  }, []);
  useScrollProgress(ref, (p) => {
    if (p > 0.7 && !completed.current) {
      completed.current = true;
      onComplete();
    } else if (p < 0.2) completed.current = false;
  });
  return (
    <section
      ref={ref}
      className="interlude words-interlude"
      aria-labelledby="words-title"
    >
      <div className="interlude-stage">
        <div className="interlude-label">
          <span>INTERLUDE · 01</span> 문학 — 글자가 별이 될 때
        </div>
        <svg
          className="words-constellation"
          viewBox="0 0 1000 400"
          aria-hidden="true"
        >
          <path d="M80 300L230 120L410 220L560 70L760 180L920 90" />
          <path d="M230 120L300 330L560 300L760 180" />
        </svg>
        <h2
          id="words-title"
          className="words-sentence"
          aria-label={LINES.join(" ")}
        >
          {glyphs.map((line, li) => (
            <span className="words-line" key={li} aria-hidden="true">
              {line.map(({ ch, i, style }) =>
                ch === " " ? (
                  <span key={i} className="glyph-space">
                    {" "}
                  </span>
                ) : (
                  <span
                    key={i}
                    className="glyph"
                    style={style}
                    onClick={() => tone(NOTES[i % NOTES.length])}
                  >
                    {ch}
                  </span>
                ),
              )}
            </span>
          ))}
        </h2>
        <p className="interlude-hint">
          스크롤하면 흩어진 글자가 모여요 · 글자를 눌러 보세요
        </p>
      </div>
    </section>
  );
}
