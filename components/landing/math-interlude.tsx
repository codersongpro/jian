"use client";
import { useState } from "react";
import { ArrowUpRight, Minus, Plus, RotateCcw } from "lucide-react";
import { useCopy } from "../lang";

// 수학: '지안 수학 선생님'의 칠판 수업. 강의 목록은 지안이가 직접 쓴 칠판에서 가져왔고,
// 첫 수업 '분수란?'에서 원을 나눠 칠하면 분수가, 약분하면 다음 수업 '약수'가 이어집니다.
const MIN = 2,
  MAX = 12,
  R = 150,
  C = 170;
// 조각마다 오르는 음 (도레미솔라 반복)
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const divisors = (n: number) =>
  Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

/** 원의 i번째 조각 경로 (12시 방향부터 시계 방향) */
function slice(i: number, n: number) {
  if (n === 1) return `M${C} ${C - R}A${R} ${R} 0 1 1 ${C - 0.01} ${C - R}Z`;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2,
    a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2,
    x0 = C + R * Math.cos(a0),
    y0 = C + R * Math.sin(a0),
    x1 = C + R * Math.cos(a1),
    y1 = C + R * Math.sin(a1),
    large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${C} ${C}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
}

export function MathInterlude({
  tone,
  onWhole,
  onOpenBoard,
}: {
  tone: (f: number) => void;
  onWhole: () => void;
  /** 「지안 선생님의 칠판」 작품 열기 (작품이 없으면 생략) */
  onOpenBoard?: () => void;
}) {
  const { t } = useCopy();
  const [n, setN] = useState(8),
    [filled, setFilled] = useState<number[]>([]);
  const k = filled.length,
    g = k ? gcd(k, n) : 1,
    // 약분이 되는 순간 다음 수업 '약수'로 넘어갑니다.
    lesson = k > 0 && k < n && g > 1 ? 3 : 0;

  const resize = (next: number) => {
    setN(Math.min(MAX, Math.max(MIN, next)));
    setFilled([]);
  };
  const toggle = (i: number) => {
    const next = filled.includes(i)
      ? filled.filter((x) => x !== i)
      : [...filled, i];
    setFilled(next);
    if (!filled.includes(i)) {
      tone(SCALE[next.length % SCALE.length] * (next.length > 5 ? 1.5 : 1));
      if (next.length === n) onWhole();
    }
  };

  return (
    <section className="interlude math-interlude" aria-labelledby="math-title">
      <div className="math-copy">
        <div className="interlude-label">
          <span>INTERLUDE · 03</span> {t.mathLabel}
        </div>
        <p className="math-board-title">{t.mathBoard}</p>
        <h2 id="math-title">
          {t.mathTitle[0]}
          <br />
          <em>{t.mathTitle[1]}</em>
        </h2>
        <p className="math-text">{t.mathText}</p>
        <div className="math-syllabus">
          <strong>{t.mathSyllabusTitle}</strong>
          <ol>
            {t.mathSyllabus.map((item, i) => (
              <li
                key={item}
                className={i === lesson ? "now" : i < lesson ? "done" : ""}
                aria-current={i === lesson ? "step" : undefined}
              >
                {item}
              </li>
            ))}
          </ol>
          {onOpenBoard && (
            <button type="button" className="text-link" onClick={onOpenBoard}>
              {t.mathOpenBoard} <ArrowUpRight size={14} />
            </button>
          )}
        </div>
        <p className="interlude-hint">{t.mathHint}</p>
      </div>
      <div className="math-stage">
        <svg
          className="math-circle"
          viewBox="0 0 340 340"
          role="group"
          aria-label={t.mathCircle}
        >
          <circle className="math-plate" cx={C} cy={C} r={R + 10} />
          {Array.from({ length: n }, (_, i) => (
            <path
              key={`${n}-${i}`}
              d={slice(i, n)}
              role="button"
              tabIndex={0}
              aria-label={t.mathSlice(i + 1, n)}
              aria-pressed={filled.includes(i)}
              className={`math-slice ${filled.includes(i) ? "filled" : ""}`}
              style={{ "--hue": `${(i * 360) / n}deg` } as React.CSSProperties}
              onClick={() => toggle(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(i);
                }
              }}
            />
          ))}
          <circle className="math-center" cx={C} cy={C} r="5" />
        </svg>
        <div className="math-controls">
          <button
            type="button"
            aria-label={t.mathLess}
            disabled={n <= MIN}
            onClick={() => resize(n - 1)}
          >
            <Minus size={18} />
          </button>
          <span>{t.mathPieces(n)}</span>
          <button
            type="button"
            aria-label={t.mathMore}
            disabled={n >= MAX}
            onClick={() => resize(n + 1)}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="math-reset"
            aria-label={t.mathReset}
            onClick={() => setFilled([])}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="math-readout" aria-live="polite">
          <span className="fraction" aria-hidden="true">
            <b>{k}</b>
            <i />
            <b>{n}</b>
          </span>
          {k > 0 && k < n && g > 1 && (
            <span className="fraction simplified" aria-hidden="true">
              <em>=</em>
              <b>{k / g}</b>
              <i />
              <b>{n / g}</b>
            </span>
          )}
          {k === n && (
            <span className="fraction simplified" aria-hidden="true">
              <em>=</em>
              <b>1</b>
            </span>
          )}
          <p>{k === n ? t.mathWhole : t.mathFilled(k, n)}</p>
        </div>
        <div className="math-divisors">
          <span>{t.mathDivisors(n)}</span>
          {divisors(n).map((d) => (
            // 약분에 쓰인 최대공약수를 강조
            <b key={d} className={k > 0 && g === d ? "active" : ""}>
              {d}
            </b>
          ))}
        </div>
      </div>
    </section>
  );
}
