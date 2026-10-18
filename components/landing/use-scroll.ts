"use client";
import { useEffect, useRef, type RefObject } from "react";

/** 요소가 화면을 지나가는 진행도(0~1)를 CSS 변수 --p로 기록합니다. */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress?: (p: number) => void,
) {
  const callback = useRef(onProgress);
  callback.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0,
      visible = false,
      last = -1;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect(),
        travel = Math.max(1, r.height - innerHeight),
        p = Math.min(1, Math.max(0, -r.top / travel));
      if (Math.abs(p - last) < 0.002) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(4));
      callback.current?.(p);
    };
    const schedule = () => {
      if (visible && !frame) frame = requestAnimationFrame(measure);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      schedule();
    });
    io.observe(el);
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    measure();
    return () => {
      io.disconnect();
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}

/** 화면에 보일 때만 true. 캔버스 애니메이션을 화면 밖에서 멈추는 데 씁니다. */
export function useInView(
  ref: RefObject<HTMLElement | null>,
  onChange: (visible: boolean) => void,
) {
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => callback.current(e.isIntersecting),
      { rootMargin: "80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** 고해상도 화면에 맞춰 캔버스 크기를 맞추고 2D 컨텍스트를 돌려줍니다. */
export function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(devicePixelRatio || 1, 2),
    w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** 같은 입력이면 같은 값: 서버·브라우저 렌더 결과를 일치시킵니다. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
