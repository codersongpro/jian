"use client";
import { useEffect, useRef } from "react";
import { fitCanvas, seeded } from "./use-scroll";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * 페이지 뒤의 하늘. 맨 위는 밤 → 스크롤하면 새벽빛을 지나 종이색 낮 →
 * 마지막 문장(#nightfall)에 가까워지면 다시 밤이 됩니다.
 * --night(0~1), --dawn(0~1)을 <html>에 기록해 글자색도 함께 바뀌게 합니다.
 */
export function Sky({
  reduced,
  economy,
}: {
  reduced: boolean;
  economy: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    let night = 1,
      frame = 0;
    const update = () => {
      frame = 0;
      const y = scrollY,
        vh = innerHeight,
        end = document.getElementById("nightfall"),
        endTop = end ? end.getBoundingClientRect().top + y : Infinity,
        dayFrom = 1 - smooth(vh * 0.45, vh * 0.98, y),
        nightAgain = smooth(endTop - vh * 0.95, endTop - vh * 0.3, y),
        next = Math.max(dayFrom, nightAgain);
      if (Math.abs(next - night) < 0.004 && next !== 0 && next !== 1) return;
      night = next;
      root.style.setProperty("--night", night.toFixed(3));
      root.style.setProperty("--dawn", (4 * night * (1 - night)).toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      root.style.removeProperty("--night");
      root.style.removeProperty("--dawn");
    };
  }, []);

  // 반짝이는 별: 밤이 보일 때만 그립니다.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const rand = seeded(7),
      count = economy ? 90 : 220,
      stars = Array.from({ length: count }, () => ({
        x: rand(),
        y: rand(),
        r: rand() ** 3 * 1.6 + 0.35,
        phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 1.6,
        depth: 0.2 + rand() * 0.8,
        gold: rand() < 0.14,
      }));
    let frame = 0,
      shooting: { x: number; y: number; life: number } | null = null;
    const draw = (time: number) => {
      const night = Number(
        document.documentElement.style.getPropertyValue("--night") || 1,
      );
      const { ctx, w, h } = fitCanvas(el);
      ctx.clearRect(0, 0, w, h);
      if (night > 0.01) {
        const drift = (scrollY * 0.04) % h;
        for (const s of stars) {
          const twinkle = reduced
            ? 0.8
            : 0.55 + 0.45 * Math.sin(time * 0.001 * s.speed + s.phase);
          const y = (s.y * h - drift * s.depth + h) % h;
          ctx.globalAlpha = twinkle * night;
          ctx.fillStyle = s.gold ? "#f3d9a4" : "#eef0ff";
          ctx.beginPath();
          ctx.arc(s.x * w, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        // 가끔 지나가는 별똥별
        if (!reduced && !economy) {
          if (!shooting && Math.random() < 0.0025)
            shooting = {
              x: Math.random() * w * 0.7 + w * 0.2,
              y: Math.random() * h * 0.35,
              life: 1,
            };
          if (shooting) {
            const s = shooting,
              g = ctx.createLinearGradient(s.x, s.y, s.x + 120, s.y - 50);
            g.addColorStop(0, `rgba(255,240,210,${0.9 * s.life * night})`);
            g.addColorStop(1, "rgba(255,240,210,0)");
            ctx.globalAlpha = 1;
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + 120, s.y - 50);
            ctx.stroke();
            s.x -= 9;
            s.y += 3.75;
            s.life -= 0.02;
            if (s.life <= 0) shooting = null;
          }
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const redraw = () => reduced && requestAnimationFrame(draw);
    addEventListener("scroll", redraw, { passive: true });
    addEventListener("resize", redraw);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", redraw);
      removeEventListener("resize", redraw);
    };
  }, [reduced, economy]);

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-night" />
      <div className="sky-dawn" />
      <canvas ref={canvas} className="sky-stars" />
    </div>
  );
}
