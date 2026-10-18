"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, seeded, useInView } from "./use-scroll";

// 과학·수학: 누르면 새 별이 태어나 궤도를 돌고, 꾹 누르면 그 자리에 중력이 생깁니다.
type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: string;
  trail: [number, number][];
};
const HUES = ["#f3d6a0", "#b9c6ff", "#e7b6c8", "#a8e0d0", "#fff4dc"];
const MAX = 28;

export function OrbitInterlude({
  reduced,
  economy,
  onSpawn,
}: {
  reduced: boolean;
  economy: boolean;
  onSpawn: () => void;
}) {
  const wrap = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    bodies = useRef<Body[]>([]),
    dust = useRef<{ a: number; d: number; s: number; o: number }[]>([]),
    well = useRef<{ x: number; y: number } | null>(null),
    visible = useRef(false),
    loop = useRef<() => void>(() => {});
  const [count, setCount] = useState(0);

  // 시작할 때 세 개의 행성을 원 궤도에 올려 둡니다.
  const circular = (
    x: number,
    y: number,
    cx: number,
    cy: number,
    hue: string,
    r = 3,
  ): Body => {
    const dx = x - cx,
      dy = y - cy,
      d = Math.hypot(dx, dy) || 1,
      v = Math.sqrt(1800 / d);
    return { x, y, vx: (-dy / d) * v, vy: (dx / d) * v, r, hue, trail: [] };
  };

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const rand = seeded(5);
    dust.current = Array.from({ length: economy ? 80 : 180 }, () => ({
      a: rand() * Math.PI * 2,
      d: 60 + rand() ** 0.7 * 320,
      s: 0.4 + rand() * 1.2,
      o: 0.2 + rand() * 0.6,
    }));
    const { w, h } = fitCanvas(el);
    bodies.current = [
      circular(w / 2 + 90, h / 2, w / 2, h / 2, HUES[0], 4),
      circular(w / 2, h / 2 - 160, w / 2, h / 2, HUES[1], 5),
      circular(w / 2 - 230, h / 2 + 40, w / 2, h / 2, HUES[2], 3.5),
    ];
    setCount(3);
    let frame = 0,
      time = 0;
    const step = () => {
      const { ctx, w, h } = fitCanvas(el),
        cx = w / 2,
        cy = h / 2;
      time += 1;
      ctx.clearRect(0, 0, w, h);
      // 회전하는 먼지 원반
      for (const d of dust.current) {
        const a = d.a + (reduced ? 0 : time * 0.0009 * (220 / d.d));
        ctx.globalAlpha = d.o;
        ctx.fillStyle = "#d9d4ff";
        ctx.fillRect(
          cx + Math.cos(a) * d.d,
          cy + Math.sin(a) * d.d * 0.42,
          d.s,
          d.s,
        );
      }
      ctx.globalAlpha = 1;
      // 중심별
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
      sun.addColorStop(0, "rgba(255,240,205,1)");
      sun.addColorStop(0.25, "rgba(243,206,140,.85)");
      sun.addColorStop(1, "rgba(243,206,140,0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();
      if (well.current) {
        const g = ctx.createRadialGradient(
          well.current.x,
          well.current.y,
          0,
          well.current.x,
          well.current.y,
          46,
        );
        g.addColorStop(0, "rgba(185,198,255,.55)");
        g.addColorStop(1, "rgba(185,198,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(well.current.x, well.current.y, 46, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of bodies.current) {
        if (!reduced) {
          // 중력: 가속도 ∝ 1/r² (너무 가까우면 완화)
          const pull = (px: number, py: number, m: number) => {
            const dx = px - b.x,
              dy = py - b.y,
              d2 = Math.max(dx * dx + dy * dy, 900),
              d = Math.sqrt(d2);
            b.vx += (m * dx) / (d2 * d);
            b.vy += (m * dy) / (d2 * d);
          };
          pull(cx, cy, 1800);
          if (well.current) pull(well.current.x, well.current.y, 2600);
          b.x += b.vx;
          b.y += b.vy;
          b.trail.push([b.x, b.y]);
          if (b.trail.length > 46) b.trail.shift();
        }
        ctx.strokeStyle = b.hue;
        ctx.lineWidth = 1.2;
        for (let i = 1; i < b.trail.length; i++) {
          ctx.globalAlpha = (i / b.trail.length) * 0.55;
          ctx.beginPath();
          ctx.moveTo(b.trail[i - 1][0], b.trail[i - 1][1]);
          ctx.lineTo(b.trail[i][0], b.trail[i][1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.hue;
        ctx.shadowColor = b.hue;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // 화면 밖으로 멀리 날아간 별은 정리
      const before = bodies.current.length;
      bodies.current = bodies.current.filter(
        (b) => b.x > -w && b.x < w * 2 && b.y > -h && b.y < h * 2,
      );
      if (bodies.current.length !== before) setCount(bodies.current.length);
      if (!reduced && visible.current) frame = requestAnimationFrame(step);
    };
    loop.current = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    };
    loop.current();
    return () => cancelAnimationFrame(frame);
  }, [reduced, economy]);

  useInView(wrap, (v) => {
    visible.current = v;
    if (v) loop.current();
  });

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      w: r.width,
      h: r.height,
    };
  };
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <section
      ref={wrap}
      className="interlude orbit-interlude"
      aria-labelledby="orbit-title"
    >
      <div className="orbit-window">
        <canvas
          ref={canvas}
          className="orbit-canvas"
          aria-label="눌러서 새 별을 궤도에 올리는 중력 놀이"
          role="img"
          onPointerDown={(e) => {
            const p = point(e);
            hold.current = setTimeout(() => (well.current = p), 260);
          }}
          onPointerMove={(e) => {
            if (well.current) well.current = point(e);
          }}
          onPointerUp={(e) => {
            if (hold.current) clearTimeout(hold.current);
            if (well.current) {
              well.current = null;
              return;
            }
            const p = point(e);
            const next = [
              ...bodies.current,
              circular(
                p.x,
                p.y,
                p.w / 2,
                p.h / 2,
                HUES[bodies.current.length % HUES.length],
                2.5 + Math.random() * 2.5,
              ),
            ].slice(-MAX);
            bodies.current = next;
            setCount(next.length);
            onSpawn();
            loop.current();
          }}
          onPointerLeave={() => {
            if (hold.current) clearTimeout(hold.current);
            well.current = null;
          }}
          onPointerCancel={() => {
            if (hold.current) clearTimeout(hold.current);
            well.current = null;
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
        <div className="orbit-copy">
          <div className="interlude-label">
            <span>INTERLUDE · 02</span> 과학·수학 — 끌어당기는 힘
          </div>
          <h2 id="orbit-title">
            세상의 모든 것은
            <br />
            <em>서로를 끌어당겨요.</em>
          </h2>
          <p className="orbit-formula" aria-hidden="true">
            F = G · m₁m₂ / r²
          </p>
        </div>
        <div className="orbit-status">
          <span>
            궤도를 도는 별 <strong>{String(count).padStart(2, "0")}</strong>
          </span>
          <span>누르면 별이 태어나요 · 꾹 누르면 중력이 생겨요</span>
        </div>
      </div>
    </section>
  );
}
