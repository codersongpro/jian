"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useCopy } from "../lang";

// 사고 실험(지안이의 칠판): 달리는 수레 위의 또르와 땅 위의 마꺼리가 통 안에서 오르내리는 공을 봅니다.
//  - 또르(수레 위): 공은 곧게 위아래로만. 한 번 오르내리는 데 1초.
//  - 마꺼리(땅 위): 수레와 함께 옆으로도 움직여 비스듬한 길(노란 점선). 길이 2배 → 2초 (시간 지연).
//  - 바퀴 위의 한 점은 사이클로이드를 그립니다.
const GROUND = 300,
  H = 100, // 통 안에서 공이 오르내리는 높이
  SIDE = Math.sqrt(3) * H, // 반 번 오르내리는 동안 수레가 가는 거리 → 비스듬한 길 = 2H
  TUBE = 170, // 수레 왼쪽 끝에서 통까지
  WHEEL_R = 22,
  START = 70, // 땅 화면에서 수레가 출발하는 위치
  TICK = 2400; // 또르의 1초를 화면에서 2.4초로

type View = "thor" | "mak";

function Frog({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <g transform={`translate(${x} ${y})`} className="frog">
      <ellipse cx="0" cy="-18" rx="17" ry="15" />
      <circle cx="-9" cy="-33" r="7" />
      <circle cx="9" cy="-33" r="7" />
      <circle className="eye" cx="-9" cy="-34" r="2.5" />
      <circle className="eye" cx="9" cy="-34" r="2.5" />
      <path className="smile" d="M-7 -16Q0 -10 7 -16" />
      <path className="legs" d="M-15 -6Q-22 2 -12 2M15 -6Q22 2 12 2" />
      <text y="-50">{name}</text>
    </g>
  );
}

export function CycloidCard({
  reduced,
  onFinish,
}: {
  reduced: boolean;
  onFinish: (won: boolean) => void;
}) {
  const { t } = useCopy();
  const [view, setView] = useState<View>("mak"),
    [k, setK] = useState(0), // 진행도 0~1 (공 한 번 오르내림)
    [wheel, setWheel] = useState(true),
    frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const play = (v: View = view) => {
    cancelAnimationFrame(frame.current);
    if (reduced) {
      setK(1);
      return onFinish(true);
    }
    // 마꺼리가 보면 같은 공이 두 배 긴 길을 가므로 두 배 오래 걸립니다.
    const duration = v === "mak" ? TICK * 2 : TICK;
    let start = 0;
    const step = (now: number) => {
      start ||= now;
      const p = Math.min(1, (now - start) / duration);
      setK(p);
      if (p < 1) frame.current = requestAnimationFrame(step);
      else onFinish(true);
    };
    frame.current = requestAnimationFrame(step);
  };
  const choose = (v: View) => {
    setView(v);
    setK(0);
    play(v);
  };

  // 공의 높이: 바닥 → 위 → 바닥 (k=0.5에서 꼭대기)
  const up = k <= 0.5 ? k * 2 : (1 - k) * 2;
  const moving = view === "mak";
  const cartX = moving ? START + 2 * SIDE * k : 210;
  const tubeX = cartX + TUBE,
    ballY = GROUND - 62 - up * H;
  // 노란 점선: 마꺼리가 본 공의 길 (지나온 만큼)
  const trail = moving
    ? k <= 0.5
      ? `M${START + TUBE} ${GROUND - 62}L${tubeX} ${ballY}`
      : `M${START + TUBE} ${GROUND - 62}L${START + TUBE + SIDE} ${GROUND - 62 - H}L${tubeX} ${ballY}`
    : `M${tubeX} ${GROUND - 62}L${tubeX} ${ballY}`;
  // 바퀴 위 한 점 (오른쪽 바퀴, 시작할 때 땅에 닿은 점) → 사이클로이드
  const wheelCx = cartX + 190,
    roll = moving ? (2 * SIDE * k) / WHEEL_R : 0,
    dot = (a: number, cx: number) =>
      [
        cx - WHEEL_R * Math.sin(a),
        GROUND - WHEEL_R + WHEEL_R * Math.cos(a),
      ] as const,
    [dx, dy] = dot(roll, wheelCx);
  const cycloid = moving
    ? "M" +
      Array.from({ length: 41 }, (_, i) => {
        const a = (roll * i) / 40,
          [x, y] = dot(a, START + 190 + WHEEL_R * a);
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join("L")
    : "";
  const fmt = (v: number) => v.toFixed(2);

  return (
    <section className="cycloid-card" aria-labelledby="cycloid-title">
      <div className="cycloid-copy">
        <div className="interlude-label">
          <span>THOUGHT EXPERIMENT</span> {t.cycloidLabel}
        </div>
        <h2 id="cycloid-title">
          {t.cycloidTitle[0]}
          <br />
          <em>{t.cycloidTitle[1]}</em>
        </h2>
        <p className="cycloid-text">{t.cycloidText}</p>
        <div className="cycloid-guess" role="group" aria-label={t.cycloidLabel}>
          {(
            [
              ["thor", t.cycloidViewThor],
              ["mak", t.cycloidViewMak],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              className={view === key ? "active" : ""}
              onClick={() => choose(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="cycloid-actions">
          <button type="button" className="cycloid-go" onClick={() => play()}>
            ▶ {k >= 1 ? t.cycloidAgain : t.cycloidPlay}
          </button>
          <label className="cycloid-check">
            <input
              type="checkbox"
              checked={wheel}
              onChange={(e) => setWheel(e.target.checked)}
            />
            {t.cycloidWheel}
          </label>
        </div>
        <div className="cycloid-result" aria-live="polite">
          <p>{view === "thor" ? t.cycloidExplainThor : t.cycloidExplainMak}</p>
          {wheel && moving && <p className="pink">{t.cycloidExplainWheel}</p>}
        </div>
        <a
          className="cycloid-board-link"
          href="/works/thought-experiment/board.jpg"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/works/thought-experiment/board.jpg"
            alt=""
            loading="lazy"
          />
          <span>
            {t.cycloidBoard} <ArrowUpRight size={14} />
          </span>
        </a>
      </div>
      <div className="cycloid-board">
        <svg viewBox="0 96 640 214" role="img" aria-label={t.cycloidFigure}>
          <line className="cy-ground" x1="0" y1={GROUND} x2="640" y2={GROUND} />
          {moving && <path className="cy-trail" d={trail} />}
          {wheel && moving && <path className="cy-curve" d={cycloid} />}
          {/* 수레 */}
          <g>
            <path
              className="cy-cart"
              d={`M${cartX} ${GROUND - 62}H${cartX + 230}L${cartX + 222} ${GROUND - 34}H${cartX + 6}Z`}
            />
            {[cartX + 40, wheelCx].map((cx) => (
              <g key={cx}>
                <circle
                  className="cy-wheel"
                  cx={cx}
                  cy={GROUND - WHEEL_R}
                  r={WHEEL_R}
                />
                <line
                  className="cy-spoke"
                  x1={cx}
                  y1={GROUND - WHEEL_R}
                  x2={cx - WHEEL_R * Math.sin(roll)}
                  y2={GROUND - WHEEL_R + WHEEL_R * Math.cos(roll)}
                />
              </g>
            ))}
            {wheel && <circle className="cy-dot" cx={dx} cy={dy} r="5" />}
            <rect
              className="cy-tube"
              x={tubeX - 14}
              y={GROUND - 62 - H - 18}
              width="28"
              height={H + 18}
              rx="12"
            />
            {!moving && <path className="cy-trail" d={trail} />}
            <circle className="cy-ball" cx={tubeX} cy={ballY - 6} r="9" />
            <Frog x={cartX + 70} y={GROUND - 62} name={t.cycloidThor} />
            <text className="cy-clock" x={cartX + 70} y={GROUND - 140}>
              {t.cycloidClock(t.cycloidThor, fmt(k))}
            </text>
          </g>
          {/* 마꺼리는 땅 위에 서 있어요 */}
          <Frog x={moving ? 40 : 90} y={GROUND} name={t.cycloidMak} />
          {moving && (
            <text className="cy-clock pink" x="40" y={GROUND - 78}>
              {t.cycloidClock(t.cycloidMak, fmt(2 * k))}
            </text>
          )}
        </svg>
      </div>
    </section>
  );
}
