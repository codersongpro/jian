"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, seeded, useInView } from "./use-scroll";
import { useCopy } from "../lang";
import { knowledgeWorks } from "@/lib/i18n";

// 과학·수학: 가운데 'JIAN PLANET'이 중력으로 여러 지식(별)을 끌어당깁니다.
// 누르면 새로운 지식이 날아와 끌려 들어오고, 행성에 닿은 지식은 흡수되어 행성이 자랍니다.
// 꾹 누르면 그 자리에 잠시 중력이 생깁니다. ↗가 붙은 지식을 누르면 관련 작품이 열립니다.
type Body = {
  label: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: string;
  trail: [number, number][];
  /** 화면에 그린 이름표 너비 (누른 곳 찾기용) */
  lw: number;
};
const HUES = ["#f3d6a0", "#b9c6ff", "#e7b6c8", "#a8e0d0", "#fff4dc"];
const MAX = 28,
  GM = 1800;
// 좁은 화면에서는 위쪽 제목을 피해 행성을 아래로 내립니다.
const center = (w: number, h: number) => ({
  cx: w / 2,
  cy: w < 640 ? h * 0.6 : h / 2,
});

export function OrbitInterlude({
  reduced,
  economy,
  onSpawn,
  openWork,
}: {
  reduced: boolean;
  economy: boolean;
  onSpawn: () => void;
  /** 작품 id로 작품 열기. 전시에 없는 작품이면 false */
  openWork?: (id: string) => boolean;
}) {
  const wrap = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    bodies = useRef<Body[]>([]),
    dust = useRef<{ a: number; d: number; s: number; o: number }[]>([]),
    well = useRef<{ x: number; y: number } | null>(null),
    visible = useRef(false),
    loop = useRef<() => void>(() => {}),
    planet = useRef(34),
    flash = useRef(0),
    next = useRef(0);
  const [count, setCount] = useState(0);
  const { t } = useCopy();
  // 그리는 중에도 최신 언어의 지식 이름을 쓰도록 참조로 보관
  const names = useRef(t.knowledge);
  names.current = t.knowledge;
  const canOpen = useRef(openWork);
  canOpen.current = openWork;
  /** 이 지식과 연결된 작품 id (없으면 null) */
  const workOf = (label: number) =>
    canOpen.current
      ? (knowledgeWorks[label % knowledgeWorks.length] ?? null)
      : null;
  const sub = useRef(t.planetSub);
  sub.current = t.planetSub;

  // speed 1이면 원 궤도, 1보다 작으면 안쪽으로 끌려 들어오는 타원 궤도
  const orbiting = (
    x: number,
    y: number,
    cx: number,
    cy: number,
    speed = 1,
  ): Body => {
    const dx = x - cx,
      dy = y - cy,
      d = Math.hypot(dx, dy) || 1,
      v = Math.sqrt(GM / d) * speed,
      label = next.current++;
    return {
      label,
      x,
      y,
      vx: (-dy / d) * v,
      vy: (dx / d) * v,
      r: 3 + (label % 3),
      hue: HUES[label % HUES.length],
      trail: [],
      lw: 0,
    };
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
    const { w, h } = fitCanvas(el),
      reach = Math.min(w, h) / 2,
      base = Math.max(20, Math.min(34, reach * 0.12));
    const font =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-body")
        .trim() || "sans-serif";
    const display =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-display")
        .trim() || "serif";
    // 처음에는 여섯 가지 지식이 행성 둘레를 돌고 있습니다.
    next.current = 0;
    planet.current = base;
    const start = center(w, h);
    bodies.current = [0.42, 0.62, 0.82, 0.5, 0.72, 0.92].map((k, i) => {
      const a = i * 1.05 + 0.3;
      return orbiting(
        start.cx + Math.cos(a) * reach * k,
        start.cy + Math.sin(a) * reach * k * 0.8,
        start.cx,
        start.cy,
      );
    });
    setCount(bodies.current.length);
    let frame = 0,
      time = 0;
    const step = () => {
      const { ctx, w, h } = fitCanvas(el),
        { cx, cy } = center(w, h);
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
      // JIAN PLANET: 빛무리 → 고리 뒷부분 → 행성 → 고리 앞부분 → 이름
      const R = planet.current,
        glowR = R * 2.6 + flash.current * 30;
      const glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, glowR);
      glow.addColorStop(0, `rgba(243,206,140,${0.45 + flash.current * 0.4})`);
      glow.addColorStop(1, "rgba(243,206,140,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();
      flash.current *= 0.92;
      const ring = (front: boolean) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.35);
        ctx.strokeStyle = "rgba(255,236,200,.75)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          R * 1.85,
          R * 0.48,
          0,
          front ? 0 : Math.PI,
          front ? Math.PI : Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      };
      ring(false);
      const body = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.4,
        R * 0.1,
        cx,
        cy,
        R,
      );
      body.addColorStop(0, "#fff3d6");
      body.addColorStop(0.45, "#f0c98e");
      body.addColorStop(1, "#c98aa6");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ring(true);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff6e0";
      ctx.font = `600 ${Math.max(13, R * 0.42)}px ${display}`;
      ctx.fillText("JIAN PLANET", cx, cy + R + 30);
      ctx.fillStyle = "rgba(216,210,240,.85)";
      ctx.font = `12px ${font}`;
      ctx.fillText(sub.current, cx, cy + R + 48);
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
          pull(cx, cy, GM);
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
        // 지식 이름
        ctx.fillStyle = b.hue;
        ctx.globalAlpha = 0.95;
        ctx.textAlign = "left";
        ctx.font = `13px ${font}`;
        const name =
          names.current[b.label % names.current.length] +
          (workOf(b.label) ? " ↗" : "");
        b.lw = ctx.measureText(name).width;
        ctx.fillText(name, b.x + b.r + 6, b.y + 4);
        ctx.globalAlpha = 1;
      }
      // 행성에 닿은 지식은 흡수되고, 행성이 조금 자랍니다.
      const grown = bodies.current.filter(
        (b) => Math.hypot(b.x - cx, b.y - cy) < planet.current + b.r,
      ).length;
      if (grown) {
        bodies.current = bodies.current.filter(
          (b) => Math.hypot(b.x - cx, b.y - cy) >= planet.current + b.r,
        );
        planet.current = Math.min(base * 1.6, planet.current + grown * 1.2);
        flash.current = 1;
      }
      // 화면 밖으로 멀리 날아간 별은 정리
      const before = bodies.current.length;
      bodies.current = bodies.current.filter(
        (b) => b.x > -w && b.x < w * 2 && b.y > -h && b.y < h * 2,
      );
      void before;
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
  // 누른 자리에 있는 지식(별 또는 이름표). 손가락으로도 누르기 쉽게 넉넉히 잡습니다.
  const hit = (x: number, y: number) =>
    bodies.current.findLast(
      (b) =>
        Math.hypot(b.x - x, b.y - y) < b.r + 18 ||
        (x > b.x && x < b.x + b.r + 10 + b.lw && Math.abs(y - b.y) < 14),
    );
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
          aria-label={t.orbitCanvas}
          role="img"
          onPointerDown={(e) => {
            const p = point(e);
            hold.current = setTimeout(() => (well.current = p), 260);
          }}
          onPointerMove={(e) => {
            const p = point(e);
            if (well.current) well.current = p;
            // PC: 작품이 연결된 지식 위에서는 손가락 모양
            const b = e.pointerType === "mouse" ? hit(p.x, p.y) : undefined;
            e.currentTarget.style.cursor =
              b && workOf(b.label) ? "pointer" : "";
          }}
          onPointerUp={(e) => {
            if (hold.current) clearTimeout(hold.current);
            if (well.current) {
              well.current = null;
              return;
            }
            const p = point(e);
            // 작품이 연결된 지식을 누르면 그 작품을 엽니다.
            const b = hit(p.x, p.y),
              id = b && workOf(b.label);
            if (id && canOpen.current?.(id)) return;
            // 누른 자리에서 새로운 지식이 날아와 행성 쪽으로 끌려 들어갑니다.
            bodies.current = [
              ...bodies.current,
              orbiting(
                p.x,
                p.y,
                center(p.w, p.h).cx,
                center(p.w, p.h).cy,
                0.55 + Math.random() * 0.3,
              ),
            ].slice(-MAX);
            setCount((n) => n + 1);
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
            <span>INTERLUDE · 02</span> {t.orbitLabel}
          </div>
          <h2 id="orbit-title">
            {t.orbitTitle[0]}
            <br />
            <em>{t.orbitTitle[1]}</em>
          </h2>
          <p className="orbit-formula" aria-hidden="true">
            F = G · m₁m₂ / r²
          </p>
        </div>
        <div className="orbit-status">
          <span>
            {t.orbitCount} <strong>{String(count).padStart(2, "0")}</strong>
          </span>
          <span>{t.orbitHint}</span>
        </div>
      </div>
    </section>
  );
}
