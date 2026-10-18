"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { fitCanvas, useInView } from "./use-scroll";
import { useCopy } from "../lang";

// 미술: 드래그하면 수채 물감이 번지듯 그려지고, 칠한 자리마다 지안이의 그림이 조금씩 비쳐 나와요.
// 도화지를 충분히 칠하면 지안이의 작품 전체가 드러납니다. 가만히 있으면 보이지 않는 붓이 먼저 시범을 보여요.
export type Reveal = { src: string; title: string; open: () => void };
const GRID_X = 24,
  GRID_Y = 14,
  DONE = 0.5; // 도화지의 이만큼을 칠하면 작품 전체가 드러남
const PAINTS = [
  { name: "초록 물감", color: [120, 148, 112] },
  { name: "금빛 물감", color: [214, 168, 98] },
  { name: "라벤더 물감", color: [158, 140, 190] },
  { name: "분홍 물감", color: [214, 140, 156] },
  { name: "하늘 물감", color: [112, 156, 196] },
] as const;

export function PaintInterlude({
  reduced,
  onStroke,
  artworks,
  onReveal,
}: {
  reduced: boolean;
  onStroke: () => void;
  artworks: Reveal[];
  onReveal: () => void;
}) {
  const wrap = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    last = useRef<{ x: number; y: number } | null>(null),
    touched = useRef(false),
    demo = useRef(0),
    distance = useRef(0),
    cover = useRef<HTMLCanvasElement>(null),
    image = useRef<HTMLImageElement | null>(null),
    cells = useRef(new Set<number>()),
    revealedRef = useRef(false);
  const [art, setArt] = useState(0),
    [progress, setProgress] = useState(0),
    [revealed, setRevealed] = useState(false);
  const current = artworks[art % Math.max(1, artworks.length)];
  // 작품 이미지를 미리 불러 둡니다.
  useEffect(() => {
    if (!current) return;
    const img = new Image();
    img.src = current.src;
    image.current = img;
  }, [current]);
  // 도화지 안에서 작품이 놓일 자리 (비율 유지, 가운데)
  const fitRect = (w: number, h: number) => {
    const img = image.current;
    if (!img || !img.naturalWidth) return null;
    const k = Math.min(w / img.naturalWidth, h / img.naturalHeight) * 0.92,
      iw = img.naturalWidth * k,
      ih = img.naturalHeight * k;
    return { x: (w - iw) / 2, y: (h - ih) / 2, w: iw, h: ih };
  };
  // 붓이 지나간 자리에 작품을 살짝 비춰 그리고, 칠한 넓이를 셉니다.
  const uncover = (x: number, y: number, size: number) => {
    const el = cover.current,
      img = image.current;
    if (!el || !img || !img.complete || revealedRef.current) return;
    const ctx = el.getContext("2d")!,
      w = el.clientWidth,
      h = el.clientHeight,
      r = fitRect(w, h);
    if (!r) return;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.restore();
    const cx = Math.floor((x / w) * GRID_X),
      cy = Math.floor((y / h) * GRID_Y);
    if (cx >= 0 && cy >= 0 && cx < GRID_X && cy < GRID_Y) {
      cells.current.add(cy * GRID_X + cx);
      const p = cells.current.size / (GRID_X * GRID_Y);
      setProgress(p);
      if (p >= DONE && !revealedRef.current) {
        revealedRef.current = true;
        setRevealed(true);
        onReveal();
      }
    }
  };
  const { t } = useCopy();
  const [paint, setPaint] = useState(0),
    [painted, setPainted] = useState(false);
  const paintRef = useRef(paint);
  paintRef.current = paint;

  // 한 번의 붓 자국: 여러 겹의 반투명 얼룩으로 번짐을 흉내 냅니다.
  const dab = (
    x: number,
    y: number,
    size: number,
    index = paintRef.current,
  ) => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d")!,
      [r, g, b] = PAINTS[index].color;
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 3; i++) {
      const ox = x + (Math.random() - 0.5) * size * 0.6,
        oy = y + (Math.random() - 0.5) * size * 0.6,
        rad = size * (0.6 + Math.random() * 0.6),
        grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.16)`);
      grad.addColorStop(0.7, `rgba(${r},${g},${b},0.07)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ox, oy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    uncover(x, y, size);
  };
  const line = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    index?: number,
  ) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y),
      steps = Math.max(1, Math.floor(d / 6)),
      size = Math.max(14, Math.min(40, 46 - d * 0.6));
    for (let i = 1; i <= steps; i++)
      dab(
        a.x + ((b.x - a.x) * i) / steps,
        a.y + ((b.y - a.y) * i) / steps,
        size,
        index,
      );
  };

  const clear = () => {
    const el = canvas.current;
    if (!el) return;
    fitCanvas(el).ctx.clearRect(0, 0, el.width, el.height);
    if (cover.current)
      fitCanvas(cover.current).ctx.clearRect(0, 0, el.width, el.height);
    cells.current.clear();
    revealedRef.current = false;
    setProgress(0);
    setRevealed(false);
    setPainted(false);
    // 새 종이에는 다음 작품이 숨어 있어요.
    setArt((a) => a + 1);
  };

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    fitCanvas(el);
    if (cover.current) fitCanvas(cover.current);
    const resize = () => {
      // 크기가 바뀌면 그림을 보존한 채 다시 맞춥니다.
      const copy = document.createElement("canvas");
      copy.width = el.width;
      copy.height = el.height;
      copy.getContext("2d")!.drawImage(el, 0, 0);
      const { ctx, w, h } = fitCanvas(el);
      ctx.drawImage(copy, 0, 0, w, h);
    };
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, []);

  // 보이지 않는 붓의 시범: 처음 화면에 들어올 때 한 번만, 사용자가 그리기 전까지
  useInView(wrap, (v) => {
    if (!v || touched.current || demo.current || reduced) return;
    const el = canvas.current;
    if (!el) return;
    const w = el.clientWidth,
      h = el.clientHeight;
    let t = 0,
      prev: { x: number; y: number } | null = null;
    const run = () => {
      if (touched.current) return;
      t += 0.012;
      const p = {
        x: w * (0.12 + 0.76 * t),
        y: h * (0.55 + 0.22 * Math.sin(t * Math.PI * 2.2) - 0.1 * t),
      };
      if (prev) line(prev, p, Math.min(PAINTS.length - 1, Math.floor(t * 3)));
      prev = p;
      if (t < 1) demo.current = requestAnimationFrame(run);
    };
    demo.current = requestAnimationFrame(run);
  });

  const at = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  return (
    <section
      ref={wrap}
      className="interlude paint-interlude"
      aria-labelledby="paint-title"
    >
      <div className="paint-head">
        <div>
          <div className="interlude-label">
            <span>INTERLUDE · 04</span> {t.paintLabel}
          </div>
          <h2 id="paint-title">
            {t.paintTitle[0]}
            <br />
            <em>{t.paintTitle[1]}</em>
          </h2>
        </div>
        <div className="paint-tools" role="group" aria-label={t.paintPick}>
          {PAINTS.map((p, i) => (
            <button
              key={p.name}
              type="button"
              aria-label={t.paints[i]}
              aria-pressed={paint === i}
              className={paint === i ? "active" : ""}
              style={
                {
                  "--swatch": `rgb(${p.color.join(",")})`,
                } as React.CSSProperties
              }
              onClick={() => setPaint(i)}
            />
          ))}
          <button
            type="button"
            className="paint-clear"
            onClick={clear}
            aria-label={t.paintClear}
          >
            <Eraser size={16} />
          </button>
        </div>
      </div>
      <div className="paint-paper">
        <canvas
          ref={canvas}
          className="paint-canvas"
          role="img"
          aria-label={t.paintCanvas}
          onPointerDown={(e) => {
            touched.current = true;
            cancelAnimationFrame(demo.current);
            last.current = at(e);
            dab(last.current.x, last.current.y, 26);
            distance.current = 0;
            setPainted(true);
            onStroke();
          }}
          onPointerMove={(e) => {
            if (!last.current) return;
            const p = at(e);
            distance.current += Math.hypot(
              p.x - last.current.x,
              p.y - last.current.y,
            );
            line(last.current, p);
            last.current = p;
            // 붓을 길게 움직이면 붓질 소리
            if (distance.current > 260) {
              distance.current = 0;
              onStroke();
            }
          }}
          onPointerUp={() => (last.current = null)}
          onPointerLeave={() => (last.current = null)}
          onPointerCancel={() => (last.current = null)}
        />
        <canvas ref={cover} className="paint-cover" aria-hidden="true" />
        {current && (
          <img
            className={`paint-artwork ${revealed ? "shown" : ""}`}
            src={current.src}
            alt={revealed ? current.title : ""}
          />
        )}
        {!painted && <span className="paint-hint">{t.paintHint}</span>}
        {current && (
          <div className="paint-progress" aria-live="polite">
            {revealed ? (
              <button type="button" onClick={current.open}>
                {t.paintFound(current.title)}
              </button>
            ) : (
              <>
                <span>{t.paintHidden}</span>
                <i
                  style={{ width: `${Math.round((progress / DONE) * 100)}%` }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
