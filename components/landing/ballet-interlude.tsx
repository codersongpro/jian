"use client";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "../lang";
import { useInView } from "./use-scroll";

// 발레: 관절로 이어진 발레리나가 동작 버튼에 맞춰 자세를 부드럽게 바꿉니다.
// 각도는 '아래로 곧게'가 0도, 양수면 화면 왼쪽으로 돌아갑니다.
// [왼팔, 왼팔 아래, 오른팔, 오른팔 아래, 왼다리, 왼종아리, 오른다리, 오른종아리, 높이]
type Pose = number[];
const POSES: Pose[] = [
  [18, -35, -18, 35, 3, 0, -3, 0, 0], // 1번 포지션 (팔은 아래로 둥글게)
  [75, 8, -75, -8, 28, -50, -28, 50, 22], // 플리에 (팔은 옆으로)
  [160, 30, -160, -30, 2, 0, -2, 0, -14], // 를르베 (팔은 머리 위로)
  [125, 5, -100, -5, 0, 0, -95, 0, -8], // 아라베스크
  [55, -85, -55, 85, 0, 0, -75, 135, -14], // 피루엣 (파세)
];
const SHOULDER_L: [number, number] = [187, 172],
  SHOULDER_R: [number, number] = [213, 172],
  HIP_L: [number, number] = [193, 280],
  HIP_R: [number, number] = [207, 280];
const NOTES = [523.25, 587.33, 659.25, 783.99, 1046.5];

const rad = (d: number) => (d * Math.PI) / 180;
const reach = ([x, y]: [number, number], len: number, deg: number) =>
  [x - len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))] as [
    number,
    number,
  ];
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function BalletInterlude({
  reduced,
  tone,
  onTurn,
}: {
  reduced: boolean;
  tone: (f: number) => void;
  onTurn: () => void;
}) {
  const { t } = useCopy();
  const wrap = useRef<HTMLElement>(null),
    current = useRef<Pose>(POSES[0]),
    frame = useRef(0),
    demo = useRef<ReturnType<typeof setInterval> | undefined>(undefined),
    touched = useRef(false);
  const [pose, setPose] = useState(0),
    [angles, setAngles] = useState<Pose>(POSES[0]),
    [spin, setSpin] = useState(0);

  // 자세 사이를 0.7초 동안 부드럽게 이어 줍니다.
  const go = (index: number) => {
    setPose(index);
    cancelAnimationFrame(frame.current);
    const from = current.current,
      to = POSES[index];
    if (index === 4) setSpin((s) => s + 1);
    if (reduced) {
      current.current = to;
      setAngles(to);
      return;
    }
    let start = 0;
    const step = (now: number) => {
      start ||= now;
      const k = ease(Math.min(1, (now - start) / 700)),
        next = from.map((a, i) => a + (to[i] - a) * k);
      current.current = next;
      setAngles(next);
      if (k < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  // 화면에 들어오면 사용자가 누르기 전까지 동작을 차례로 보여 줍니다.
  useInView(wrap, (visible) => {
    clearInterval(demo.current);
    if (!visible || touched.current || reduced) return;
    let i = 0;
    demo.current = setInterval(() => go((i = (i + 1) % POSES.length)), 2200);
  });
  useEffect(
    () => () => {
      clearInterval(demo.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const [aL, fL, aR, fR, tL, sL, tR, sR, lift] = angles;
  const elbowL = reach(SHOULDER_L, 56, aL),
    handL = reach(elbowL, 50, aL + fL),
    elbowR = reach(SHOULDER_R, 56, aR),
    handR = reach(elbowR, 50, aR + fR),
    kneeL = reach(HIP_L, 80, tL),
    footL = reach(kneeL, 82, tL + sL),
    toeL = reach(footL, 14, tL + sL),
    kneeR = reach(HIP_R, 80, tR),
    footR = reach(kneeR, 82, tR + sR),
    toeR = reach(footR, 14, tR + sR);
  const line = (...pts: [number, number][]) =>
    "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");

  return (
    <section
      ref={wrap}
      className="interlude ballet-interlude"
      aria-labelledby="ballet-title"
    >
      <div className="ballet-stage">
        <div className="ballet-copy">
          <div className="interlude-label">
            <span>INTERLUDE · 06</span> {t.balletLabel}
          </div>
          <h2 id="ballet-title">
            {t.balletTitle[0]}
            <br />
            <em>{t.balletTitle[1]}</em>
          </h2>
          <div className="ballet-steps" role="group" aria-label={t.balletLabel}>
            {t.balletPoses.map((p, i) => (
              <button
                key={p.name}
                type="button"
                aria-pressed={pose === i}
                className={pose === i ? "active" : ""}
                onClick={() => {
                  touched.current = true;
                  clearInterval(demo.current);
                  go(i);
                  if (i === 4) onTurn();
                  else tone(NOTES[i]);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="ballet-desc" aria-live="polite">
            {t.balletPoses[pose].desc}
          </p>
          <p className="interlude-hint">{t.balletHint}</p>
        </div>
        <svg
          className="ballet-figure"
          viewBox="0 0 400 540"
          role="img"
          aria-label={`${t.balletFigure} · ${t.balletPoses[pose].name}`}
        >
          <defs>
            <radialGradient id="spotlight" cx="50%" cy="35%" r="60%">
              <stop offset="0" stopColor="rgba(255,240,215,.55)" />
              <stop offset="1" stopColor="rgba(255,240,215,0)" />
            </radialGradient>
          </defs>
          <ellipse cx="200" cy="250" rx="190" ry="250" fill="url(#spotlight)" />
          <ellipse
            className="ballet-floor"
            cx="200"
            cy="470"
            rx="120"
            ry="16"
          />
          <g
            key={spin}
            className={spin ? "ballet-body spinning" : "ballet-body"}
            transform={`translate(0 ${lift.toFixed(1)})`}
          >
            <path className="limb leg" d={line(HIP_L, kneeL, footL)} />
            <path className="limb leg" d={line(HIP_R, kneeR, footR)} />
            <path className="toe" d={line(footL, toeL)} />
            <path className="toe" d={line(footR, toeR)} />
            <path
              className="tutu"
              d="M138 280Q200 256 262 280L276 302Q238 316 200 314Q162 316 124 302Z"
            />
            <path
              className="bodice"
              d="M186 168Q200 162 214 168L210 230Q208 262 214 282L186 282Q192 262 190 230Z"
            />
            <path className="limb arm" d={line(SHOULDER_L, elbowL, handL)} />
            <path className="limb arm" d={line(SHOULDER_R, elbowR, handR)} />
            <path className="neck" d="M200 150V170" />
            <circle className="head" cx="200" cy="134" r="20" />
            <circle className="bun" cx="207" cy="111" r="9" />
          </g>
        </svg>
      </div>
    </section>
  );
}
