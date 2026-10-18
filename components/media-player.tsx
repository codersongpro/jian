"use client";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useSound } from "./sound-provider";
import { useCopy } from "./lang";

export function AudioPlayer({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLAudioElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    context = useRef<AudioContext | null>(null),
    analyser = useRef<AnalyserNode | null>(null),
    frame = useRef(0);
  const { pauseBackground, reduced } = useSound();
  const [error, setError] = useState("");
  const { lang } = useCopy();
  const en = lang === "en";
  function stop() {
    cancelAnimationFrame(frame.current);
    const el = canvas.current;
    if (el) el.getContext("2d")?.clearRect(0, 0, el.width, el.height);
  }
  async function visualize() {
    pauseBackground();
    if (reduced) return;
    try {
      if (!context.current && ref.current) {
        const ctx = new AudioContext();
        context.current = ctx;
        const node = ctx.createMediaElementSource(ref.current);
        analyser.current = ctx.createAnalyser();
        analyser.current.fftSize = 128;
        node.connect(analyser.current);
        analyser.current.connect(ctx.destination);
      }
      await context.current?.resume();
      cancelAnimationFrame(frame.current);
      const draw = () => {
        const el = canvas.current,
          a = analyser.current;
        if (!el || !a || ref.current?.paused) return;
        const data = new Uint8Array(a.frequencyBinCount);
        a.getByteFrequencyData(data);
        const c = el.getContext("2d");
        if (c) {
          c.clearRect(0, 0, el.width, el.height);
          c.fillStyle = "#8c779d";
          data.forEach((v, i) => {
            const h = Math.max(2, v / 4);
            c.fillRect(i * 7, el.height / 2 - h / 2, 4, h);
          });
        }
        frame.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      stop();
    }
  }
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) {
          el.pause();
          stop();
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.pause();
      stop();
      void context.current?.close();
    };
  }, []);
  return (
    <div className="audio-player">
      <div className="eyebrow">ORIGINAL AUDIO{en ? "" : " · 작품 오디오"}</div>
      <p>{title}</p>
      <audio
        ref={ref}
        controls
        preload="none"
        src={src}
        onPlay={() => void visualize()}
        onPause={stop}
        onEnded={stop}
        onError={() =>
          setError(
            en
              ? "The audio could not be loaded."
              : "오디오를 불러올 수 없습니다. 공개 상태와 파일을 확인해 주세요.",
          )
        }
        aria-label={title}
      />
      <canvas ref={canvas} width="448" height="56" aria-hidden="true" />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

type Player = { destroy: () => void; pauseVideo: () => void };
type YouTube = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onStateChange: (event: { data: number }) => void;
        onError: () => void;
      };
    },
  ) => Player;
};
declare global {
  interface Window {
    YT?: YouTube;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTube> | null = null;
function loadYouTube(): Promise<YouTube> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return (loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    window.onYouTubeIframeAPIReady = () =>
      window.YT ? resolve(window.YT) : reject(new Error("YouTube unavailable"));
    script.onerror = () => {
      loading = null;
      reject(new Error("YouTube unavailable"));
    };
    document.head.append(script);
  }));
}
export function VideoPlayer({ id }: { id: string }) {
  const host = useRef<HTMLDivElement>(null),
    player = useRef<Player | null>(null);
  const { pauseBackground } = useSound();
  const pause = useRef(pauseBackground);
  pause.current = pauseBackground;
  const [load, setLoad] = useState(false),
    [error, setError] = useState(false);
  const { lang } = useCopy();
  const en = lang === "en";
  useEffect(() => {
    if (!load) return;
    let active = true;
    void loadYouTube()
      .then((YT) => {
        if (!active || !host.current) return;
        const mount = document.createElement("div");
        host.current.append(mount);
        player.current = new YT.Player(mount, {
          videoId: id,
          playerVars: { autoplay: 0, playsinline: 1, origin: location.origin },
          events: {
            onStateChange: (e) => {
              if (e.data === 1) pause.current();
            },
            onError: () => setError(true),
          },
        });
      })
      .catch(() => {
        if (active) setError(true);
      });
    const stop = () => player.current?.pauseVideo();
    window.addEventListener("universe:pause-media", stop);
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) stop();
    });
    if (host.current) observer.observe(host.current);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("universe:pause-media", stop);
      player.current?.destroy();
      player.current = null;
    };
  }, [load, id]);
  return (
    <div className="video-player">
      {!load ? (
        <button className="video-consent" onClick={() => setLoad(true)}>
          <Play size={30} />
          <span>
            {en ? "Load performance video" : "공연·연주 영상 불러오기"}
          </span>
          <small>
            {en
              ? "Connects to YouTube · no autoplay"
              : "YouTube에 연결됩니다 · 자동 재생 없음"}
          </small>
        </button>
      ) : (
        <div className="video-frame" ref={host} />
      )}{" "}
      {error && (
        <p role="alert">
          {en ? "The video could not be loaded." : "영상을 불러올 수 없습니다."}{" "}
          <a
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            rel="noreferrer"
          >
            {en ? "Watch on YouTube" : "YouTube에서 보기"}
          </a>
        </p>
      )}
    </div>
  );
}
