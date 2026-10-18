"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { fitCanvas, seeded } from "./use-scroll";

// 인트로 시간표(ms): 빛 한 점 → 별가루 폭발 → 이름으로 모임 → 머무름 → 화면이 열림
const T = { burst: 600, gather: 1300, gathered: 2800, leave: 4100, end: 4800 };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (t: number) => Math.min(1, Math.max(0, t));

type Phase = "veil" | "playing" | "leaving" | "done";

/** 제목 글자를 그립니다. 좌표 추출과 은은한 후광에 함께 씁니다. */
function drawTitle(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  family: string,
) {
  const twoLines = w < 760,
    size = twoLines ? Math.min(w * 0.22, 130) : Math.min(w * 0.12, 175),
    cy = h * 0.44;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `italic 600 ${size}px ${family}`;
  if (twoLines) {
    c.fillText("JIAN’S", w / 2, cy - size * 0.52);
    c.fillText("UNIVERSE", w / 2, cy + size * 0.52);
  } else c.fillText("JIAN’S UNIVERSE", w / 2, cy);
}

/** 글자 모양을 따라 별가루가 놓일 좌표를 뽑습니다. */
function sampleTitle(w: number, h: number, wanted: number, family: string) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#fff";
  drawTitle(c, w, h, family);
  const data = c.getImageData(0, 0, w, h).data,
    points: [number, number][] = [];
  let ink = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 128) ink++;
  const gap = Math.max(2, Math.round(Math.sqrt((ink * 4) / wanted)));
  for (let y = 0; y < h; y += gap)
    for (let x = 0; x < w; x += gap)
      if (data[(y * w + x) * 4 + 3] > 128) points.push([x, y]);
  return points;
}

export function Intro({
  reduced,
  economy,
  soundOn,
  enableSound,
  onReveal,
}: {
  reduced: boolean;
  economy: boolean;
  soundOn: boolean;
  enableSound: () => void;
  onReveal: (played: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("veil");
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef(onReveal);
  reveal.current = onReveal;
  const finish = useRef<() => void>(() => {});

  // 세션당 한 번만 재생. 모션 최소화면 바로 본문을 보여 줍니다.
  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(sessionStorage.getItem("jian-intro"));
    } catch {}
    const systemReduced = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (seen || systemReduced) {
      setPhase("leaving");
      reveal.current(false);
      const t = setTimeout(() => setPhase("done"), 450);
      return () => clearTimeout(t);
    }
    setPhase("playing");
  }, []);

  useEffect(() => {
    if (reduced && phase === "playing") finish.current();
  }, [reduced, phase]);

  useEffect(() => {
    if (phase !== "playing" || !canvas.current) return;
    // 제목 글꼴이 준비된 뒤(최대 0.7초) 글자 모양을 뽑습니다.
    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-display")
        .trim() || "Georgia, serif";
    let cleanup = () => {},
      cancelled = false;
    void Promise.race([
      document.fonts.load(`italic 600 100px ${family}`).catch(() => {}),
      new Promise((r) => setTimeout(r, 700)),
    ]).then(() => {
      if (!cancelled) cleanup = run(canvas.current!);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
    function run(el: HTMLCanvasElement) {
      const { w, h } = fitCanvas(el),
        area = (w * h) / (1440 * 900),
        count = Math.round(
          (economy ? 900 : 2400) * Math.min(1, Math.max(0.45, area)),
        ),
        targets = sampleTitle(
          Math.round(w),
          Math.round(h),
          count * 0.86,
          family,
        ),
        rand = seeded(42),
        cx = w / 2,
        cy = h * 0.44;
      // 목표 좌표를 섞어서 입자에 나눠 줍니다. 남는 입자는 주변 별이 됩니다.
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }
      const particles = Array.from({ length: count }, (_, i) => {
        const angle = rand() * Math.PI * 2,
          dist = (0.25 + rand() * 0.75) * Math.max(w, h) * 0.6,
          target = targets[i];
        return {
          sx: cx + Math.cos(angle) * dist,
          sy: cy + Math.sin(angle) * dist * 0.75,
          tx: target ? target[0] : rand() * w,
          ty: target ? target[1] : rand() * h,
          text: Boolean(target),
          delay: rand() * 450,
          size: target ? 0.7 + rand() * 0.9 : 0.4 + rand() * 1.1,
          gold: rand() < 0.35,
          phase: rand() * 6.28,
        };
      });
      let frame = 0,
        start = 0,
        stopped = false;
      const done = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(frame);
        // 끝까지 보거나 건너뛴 뒤에만 '본 인트로'로 기록합니다.
        try {
          sessionStorage.setItem("jian-intro", "seen");
        } catch {}
        setPhase("leaving");
        reveal.current(true);
        setTimeout(() => setPhase("done"), 700);
      };
      finish.current = done;
      const draw = (now: number) => {
        start ||= now;
        const t = now - start,
          { ctx } = fitCanvas(el);
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        // 처음의 작은 빛
        const glow =
          t < T.gather
            ? clamp(t / T.burst) * (1 - clamp((t - T.burst) / 900))
            : 0;
        if (glow > 0) {
          const r = 6 + glow * 60,
            g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(255,236,196,${glow})`);
          g.addColorStop(1, "rgba(255,236,196,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t >= T.burst) {
          const burst = easeOut(clamp((t - T.burst) / 900)),
            leave = clamp((t - T.leave) / (T.end - T.leave));
          for (const p of particles) {
            const g = easeInOut(clamp((t - T.gather - p.delay) / 1100));
            let x = cx + (p.sx - cx) * burst,
              y = cy + (p.sy - cy) * burst;
            x += (p.tx - x) * g;
            y += (p.ty - y) * g;
            y -= leave * leave * (p.text ? 30 : 80);
            const twinkle = 0.6 + 0.4 * Math.sin(t * 0.006 + p.phase),
              alpha =
                (p.text ? 0.55 + 0.45 * g : 0.35 + 0.3 * twinkle) * (1 - leave);
            ctx.fillStyle = p.gold
              ? `rgba(243,214,160,${alpha})`
              : `rgba(236,238,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(
              x,
              y,
              p.size * (p.text ? 0.9 + 0.3 * g * twinkle : 1),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        ctx.globalCompositeOperation = "source-over";
        // 별가루가 모두 모이면 글자 뒤로 은은한 금빛 후광
        const halo =
          clamp((t - T.gathered + 300) / 700) *
          (1 - clamp((t - T.leave) / (T.end - T.leave)));
        if (halo > 0) {
          ctx.save();
          ctx.globalAlpha = halo * 0.22;
          ctx.fillStyle = "#f3d6a0";
          ctx.shadowColor = "#f3d6a0";
          ctx.shadowBlur = 28;
          drawTitle(ctx, w, h, family);
          ctx.restore();
        }
        if (t >= T.leave) done();
        else frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      return () => {
        stopped = true;
        cancelAnimationFrame(frame);
      };
    }
  }, [phase, economy]);

  if (phase === "done") return null;
  return (
    <div className={`intro intro-${phase}`} aria-hidden={phase !== "playing"}>
      <canvas ref={canvas} className="intro-canvas" aria-hidden="true" />
      {phase === "playing" && (
        <>
          <div className="intro-copy" aria-hidden="true">
            <span>A LITTLE MIND, AN INFINITE UNIVERSE</span>
            <p>작은 호기심에서 시작된 커다란 이야기</p>
          </div>
          <div className="intro-actions">
            {!soundOn && (
              <button type="button" onClick={enableSound}>
                <Volume2 size={14} /> 소리와 함께 보기
              </button>
            )}
            <button type="button" onClick={() => finish.current()}>
              인트로 건너뛰기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
