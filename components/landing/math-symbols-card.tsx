"use client";
import { useState } from "react";
import { useCopy } from "../lang";

// 수학: 지안이가 좋아하는 수학 기호들. 기호를 고르고 '한 번 더'를 누르면
// 그 기호가 품은 생각이 한 걸음씩 그림으로 펼쳐집니다.
export type SymbolId = "inf" | "pi" | "i" | "sqrt" | "sigma" | "e";
const SYMBOLS: { id: SymbolId; glyph: string; f: number }[] = [
  { id: "inf", glyph: "∞", f: 523.25 },
  { id: "pi", glyph: "π", f: 587.33 },
  { id: "i", glyph: "i", f: 659.25 },
  { id: "sqrt", glyph: "√", f: 698.46 },
  { id: "sigma", glyph: "Σ", f: 783.99 },
  { id: "e", glyph: "e", f: 880 },
];

// 무한대: 베르누이의 렘니스케이트(끝없이 도는 8자 길)
const LEMNISCATE =
  Array.from({ length: 73 }, (_, n) => {
    const a = (n / 72) * Math.PI * 2,
      d = 1 + Math.sin(a) ** 2,
      x = 180 + (130 * Math.cos(a)) / d,
      y = 112 + (130 * Math.sin(a) * Math.cos(a)) / d;
    return `${n ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("") + "Z";

/** 기호마다 k번째 걸음의 그림 */
function Stage({ id, k }: { id: SymbolId; k: number }) {
  if (id === "inf")
    return (
      <>
        <path className="sym-line" d={LEMNISCATE} />
        {Array.from({ length: Math.min(k, 8) + 1 }, (_, n) => (
          <circle key={n} className="sym-dot" r={7 - n * 0.6}>
            <animateMotion
              dur="3s"
              begin={`${-n * 0.35}s`}
              repeatCount="indefinite"
              path={LEMNISCATE}
            />
          </circle>
        ))}
      </>
    );
  if (id === "pi") {
    // 지름 70인 원의 둘레를 펼치면 지름의 약 3.14배
    const d = 70,
      x0 = 30;
    return (
      <>
        <circle className="sym-line" cx="80" cy="70" r={d / 2} />
        <path className="sym-accent" d={`M45 70H115`} />
        <path className="sym-line" d={`M${x0} 150H${x0 + d * Math.PI}`} />
        {[0, 1, 2, 3].map((n) => (
          <path key={n} className="sym-tick" d={`M${x0 + n * d} 140V160`} />
        ))}
        <text className="sym-small" x={x0 + d * 1.5} y="182">
          d · d · d · 0.14…
        </text>
      </>
    );
  }
  if (id === "i") {
    // i를 한 번 곱할 때마다 화살표가 왼쪽으로 90°씩 돌아요: 1 → i → −1 → −i → 1
    const turn = k % 4,
      labels = ["1", "i", "−1", "−i"];
    return (
      <>
        <path className="sym-axis" d="M70 120H290M180 20V220" />
        <circle className="sym-faint" cx="180" cy="120" r="80" />
        {[
          [264, 126],
          [186, 34],
          [92, 126],
          [186, 216],
        ].map(([x, y], n) => (
          <text
            key={n}
            className={`sym-small ${n === turn ? "on" : ""}`}
            x={x}
            y={y}
          >
            {labels[n]}
          </text>
        ))}
        <g className="sym-arrow" style={{ transform: `rotate(${-90 * k}deg)` }}>
          <path d="M180 120H256M244 110L258 120L244 130" />
        </g>
      </>
    );
  }
  if (id === "sqrt") {
    const n = (k % 5) + 1,
      s = 160 / n;
    return (
      <>
        {Array.from({ length: n * n }, (_, c) => (
          <rect
            key={c}
            className="sym-cell"
            x={100 + (c % n) * s}
            y={30 + Math.floor(c / n) * s}
            width={s - 3}
            height={s - 3}
            rx="4"
            style={{ animationDelay: `${c * 0.02}s` }}
          />
        ))}
        <text className="sym-small" x="70" y="114">
          {n}
        </text>
        <text className="sym-small" x="180" y="220">
          {n}
        </text>
      </>
    );
  }
  if (id === "sigma") {
    const n = (k % 7) + 1;
    return (
      <>
        {Array.from({ length: n }, (_, r) =>
          Array.from({ length: r + 1 }, (_, c) => (
            <circle
              key={`${r}-${c}`}
              className="sym-cell"
              cx={180 + (c - r / 2) * 26}
              cy={30 + r * 26}
              r="10"
            />
          )),
        )}
      </>
    );
  }
  // e: (1 + 1/n)ⁿ — n을 두 배씩 늘리면 2.718…에 점점 다가가요
  const n = 2 ** (k % 12),
    v = (1 + 1 / n) ** n,
    w = (x: number) => 30 + (x / 3) * 300;
  return (
    <>
      <path className="sym-axis" d="M30 150H330" />
      {[1, 2, 3].map((x) => (
        <text key={x} className="sym-small" x={w(x)} y="180">
          {x}
        </text>
      ))}
      <path className="sym-tick sym-goal" d={`M${w(Math.E)} 70V160`} />
      <text className="sym-small on" x={w(Math.E)} y="60">
        e
      </text>
      <rect
        className="sym-bar"
        x="30"
        y="110"
        height="34"
        rx="8"
        width={w(v) - 30}
      />
    </>
  );
}

export function MathSymbolsCard({ tone }: { tone: (f: number) => void }) {
  const { t } = useCopy();
  const [id, setId] = useState<SymbolId>("inf"),
    [k, setK] = useState(0);
  const sym = SYMBOLS.find((s) => s.id === id)!,
    info = t.symbols[id];

  const pick = (s: (typeof SYMBOLS)[number]) => {
    setId(s.id);
    setK(0);
    tone(s.f);
  };
  const next = () => {
    setK((x) => x + 1);
    tone(sym.f * (1 + ((k + 1) % 4) * 0.125));
  };

  return (
    <section className="symbols-card" aria-labelledby="symbols-title">
      <div className="symbols-copy">
        <div className="interlude-label">
          <span>FAVORITE SYMBOLS</span> {t.symLabel}
        </div>
        <h2 id="symbols-title">
          {t.symTitle[0]}
          <br />
          <em>{t.symTitle[1]}</em>
        </h2>
        <p className="symbols-text">{t.symText}</p>
        <div className="symbols-chips" role="group" aria-label={t.symPick}>
          {SYMBOLS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === id ? "active" : ""}
              aria-pressed={s.id === id}
              aria-label={t.symbols[s.id].name}
              onClick={() => pick(s)}
            >
              {s.glyph}
            </button>
          ))}
        </div>
        <div className="symbols-info" aria-live="polite">
          <strong>
            {info.name} <small>{info.read}</small>
          </strong>
          <p>{info.text}</p>
        </div>
      </div>
      <div className="symbols-stage">
        <div className="symbols-glyph" aria-hidden="true" key={id}>
          {sym.glyph}
        </div>
        <svg viewBox="0 0 360 240" role="img" aria-label={info.figure}>
          <Stage id={id} k={k} />
        </svg>
        <p className="symbols-step" aria-live="polite">
          {t.symStep(id, k)}
        </p>
        <button type="button" className="symbols-next" onClick={next}>
          {t.symNext}
        </button>
      </div>
    </section>
  );
}
