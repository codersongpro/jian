"use client";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "../lang";

// 사고 실험: 또르(곧은 길)와 마꺼리(사이클로이드)가 같은 높이에서 미끄러져 내려가는 경주.
// 실제 물리(마찰 없음)대로 움직입니다.
//  - 사이클로이드 x = r(θ − sinθ), y = r(1 − cosθ),  θ = t·√(g/r)  → 도착 시간 π√(r/g)
//  - 곧은 길: 거리 s = ½·a·t²,  a = g·(높이 / 길이)               → 도착 시간 √(π²+4)·√(r/g)
const R = 150,
  X0 = 60,
  Y0 = 40,
  END_X = X0 + Math.PI * R,
  END_Y = Y0 + 2 * R,
  LEN = Math.hypot(END_X - X0, END_Y - Y0),
  T_CURVE = Math.PI, // √(r/g) 단위
  T_LINE = Math.sqrt(Math.PI ** 2 + 4),
  SCALE = 2.2 / T_CURVE; // 화면에서 사이클로이드가 2.2초 걸리도록

const cycloid = (th: number) =>
  [X0 + R * (th - Math.sin(th)), Y0 + R * (1 - Math.cos(th))] as const;
const CURVE_PATH =
  "M" +
  Array.from({ length: 61 }, (_, i) => {
    const [x, y] = cycloid((i / 60) * Math.PI);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("L");

type Guess = "line" | "curve" | "tie" | null;

export function CycloidCard({
  reduced,
  onFinish,
}: {
  reduced: boolean;
  onFinish: (won: boolean) => void;
}) {
  const { t } = useCopy();
  const [guess, setGuess] = useState<Guess>(null),
    [time, setTime] = useState(0), // √(r/g) 단위의 경과 시간
    [running, setRunning] = useState(false),
    [done, setDone] = useState(false),
    [wheel, setWheel] = useState(false),
    [roll, setRoll] = useState(0),
    frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const race = () => {
    cancelAnimationFrame(frame.current);
    setDone(false);
    if (reduced) {
      setTime(T_LINE);
      setDone(true);
      onFinish(guess === "curve");
      return;
    }
    setRunning(true);
    let start = 0;
    const step = (now: number) => {
      start ||= now;
      const tt = (now - start) / 1000 / SCALE;
      setTime(Math.min(tt, T_LINE));
      if (tt < T_LINE) frame.current = requestAnimationFrame(step);
      else {
        setRunning(false);
        setDone(true);
        onFinish(guess === "curve");
      }
    };
    frame.current = requestAnimationFrame(step);
  };
  const reset = () => {
    cancelAnimationFrame(frame.current);
    setRunning(false);
    setDone(false);
    setTime(0);
    setGuess(null);
  };
  // 바퀴로 그리기: 굴러가는 바퀴 위의 점이 사이클로이드를 그립니다.
  const drawWheel = () => {
    setWheel(true);
    cancelAnimationFrame(frame.current);
    if (reduced) return setRoll(Math.PI);
    let start = 0;
    const step = (now: number) => {
      start ||= now;
      const k = Math.min(1, (now - start) / 2600);
      setRoll(k * Math.PI);
      if (k < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  // 현재 위치
  const th = Math.min(Math.PI, time),
    [mx, my] = cycloid(th),
    s = Math.min(LEN, 0.5 * ((2 * R) / LEN) * (time * time) * R),
    lx = X0 + ((END_X - X0) * s) / LEN,
    ly = Y0 + ((END_Y - Y0) * s) / LEN;
  const curveTime = Math.min(time, T_CURVE),
    lineTime = Math.min(time, T_LINE),
    fmt = (v: number) => (v * SCALE).toFixed(2);

  // 바퀴(바닥선을 거꾸로 한 천장 아래에서 구르는 바퀴: 지름 2R)
  const wx = X0 + R * roll,
    [px, py] = cycloid(roll);

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
        <div className="cycloid-guess" role="group" aria-label={t.cycloidAsk}>
          <span>{t.cycloidAsk}</span>
          {(
            [
              ["line", t.cycloidPickA],
              ["curve", t.cycloidPickB],
              ["tie", t.cycloidPickTie],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={guess === key}
              className={guess === key ? "active" : ""}
              disabled={running}
              onClick={() => setGuess(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="cycloid-actions">
          <button
            type="button"
            className="cycloid-go"
            disabled={!guess || running}
            onClick={done ? reset : race}
          >
            {done ? t.cycloidAgain : `▶ ${t.cycloidRace}`}
          </button>
          <button type="button" className="text-link" onClick={drawWheel}>
            {t.cycloidShowWheel}
          </button>
        </div>
        {done && (
          <div className="cycloid-result" aria-live="polite">
            <strong>
              {guess === "curve" ? t.cycloidRight : t.cycloidWrong}
            </strong>
            <p>{t.cycloidWhy}</p>
          </div>
        )}
        {wheel && <p className="cycloid-roll">{t.cycloidRoll}</p>}
      </div>
      <div className="cycloid-board">
        <svg viewBox="0 0 600 380" role="img" aria-label={t.cycloidFigure}>
          <line
            className="cy-ground"
            x1="30"
            y1={END_Y + 4}
            x2="580"
            y2={END_Y + 4}
          />
          <path className="cy-line" d={`M${X0} ${Y0}L${END_X} ${END_Y}`} />
          <path className="cy-curve" d={CURVE_PATH} />
          <circle className="cy-flag" cx={END_X} cy={END_Y} r="7" />
          <text className="cy-tag gold" x={X0 + 210} y={Y0 + 120}>
            {t.cycloidStraight}
          </text>
          <text className="cy-tag pink" x={X0 + 40} y={Y0 + 250}>
            {t.cycloidCurve}
          </text>
          {wheel && (
            <g className="cy-wheel">
              <circle cx={wx} cy={Y0 + R} r={R} />
              <line x1={wx} y1={Y0 + R} x2={px} y2={py} />
              <circle className="cy-dot" cx={px} cy={py} r="5" />
            </g>
          )}
          <g transform={`translate(${lx} ${ly})`}>
            <circle className="cy-ball gold" r="13" />
            <text className="cy-name" y="-20">
              {t.cycloidThor}
            </text>
          </g>
          <g transform={`translate(${mx} ${my})`}>
            <circle className="cy-ball pink" r="13" />
            <text className="cy-name" y="30">
              {t.cycloidMak}
            </text>
          </g>
        </svg>
        <div className="cycloid-times" aria-live="polite">
          <span className="gold">
            {t.cycloidThor} <b>{fmt(lineTime)}s</b>
          </span>
          <span className="pink">
            {t.cycloidMak} <b>{fmt(curveTime)}s</b>
          </span>
        </div>
      </div>
    </section>
  );
}
