"use client";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "../lang";
import { useInView } from "./use-scroll";

// 발레: 지안이가 공연 안무를 외우려고 직접 적은 '안무 노트'의 순서대로 발레리나가 춤춥니다.
// 각도는 '아래로 곧게'가 0도, 양수면 화면 왼쪽으로 돌아갑니다.
// [왼팔, 왼팔 아래, 오른팔, 오른팔 아래, 왼다리, 왼종아리, 오른다리, 오른종아리, 높이]
type Pose = number[];
const POSES: Pose[] = [
  [165, 30, -60, 20, 0, 0, -14, 0, 0], // 포즈: 4번 손(한 팔 위, 한 팔 앞), 4번 발
  [160, 25, -82, -6, 0, 0, -95, -55, -6], // 에티튜드: 뒤로 든 다리의 무릎을 둥글게
  [75, 8, -75, -8, 28, -50, -28, 50, 22], // 플리에
  [40, -70, -40, 70, 2, 0, -2, 0, -14], // 쉐네: 발끝으로 서서 돌기
  [55, -85, -55, 85, 0, 0, -75, 135, -14], // 파세
  [140, 0, -140, 0, 0, 0, -22, 0, 0], // 엔딩: 두 팔을 활짝, 한 발 포인
];
const TURN = 3; // 쉐네에서 한 바퀴 돕니다.
const SHOULDER_L: [number, number] = [187, 172],
  SHOULDER_R: [number, number] = [213, 172],
  HIP_L: [number, number] = [193, 280],
  HIP_R: [number, number] = [207, 280];
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

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
    if (index === TURN) setSpin((s) => s + 1);
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

  // 한 동작을 고르면 시범과 이어 추기를 멈추고 그 동작으로
  const pick = (i: number) => {
    touched.current = true;
    clearInterval(demo.current);
    go(i);
    if (i === TURN) onTurn();
    else tone(NOTES[i]);
  };
  // 노트대로 춤추기: 첫 동작부터 마지막 인사까지 차례로
  const playAll = () => {
    touched.current = true;
    clearInterval(demo.current);
    let i = 0;
    pick(0);
    demo.current = setInterval(() => {
      i++;
      if (i >= POSES.length) return clearInterval(demo.current);
      pick(i);
    }, 1500);
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
          <p className="ballet-text">{t.balletText}</p>
          {/* 안무 노트 카드: 지금 추는 동작에 밑줄 */}
          <div className="ballet-note" aria-hidden="true">
            <strong>{t.balletNote}</strong>
            <ol>
              {t.balletPoses.map((p, i) => (
                <li key={p.name} className={pose === i ? "now" : ""}>
                  {p.name}
                </li>
              ))}
            </ol>
          </div>
          <div className="ballet-steps" role="group" aria-label={t.balletLabel}>
            {t.balletPoses.map((p, i) => (
              <button
                key={p.name}
                type="button"
                aria-pressed={pose === i}
                className={pose === i ? "active" : ""}
                onClick={() => pick(i)}
              >
                <small>{i + 1}</small> {p.name}
              </button>
            ))}
          </div>
          <p className="ballet-desc" aria-live="polite">
            {t.balletPoses[pose].desc}
          </p>
          <button type="button" className="ballet-play" onClick={playAll}>
            ▶ {t.balletPlay}
          </button>
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
