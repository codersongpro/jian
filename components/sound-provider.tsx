"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  defaultPreferences,
  mediaUrl,
  type Preferences,
  type SiteSettings,
} from "@/lib/model";
import { parsePreferences } from "@/lib/validation";
import type { EffectKind, SoundEngine } from "@/lib/sound";

type SoundContext = {
  ready: boolean;
  /** 소리 엔진이 실제로 켜져 있음 */
  enabled: boolean;
  /** 방문자가 원하는 상태(저장됨). 켜져 있으면 첫 터치·클릭 때 음악이 시작됩니다. */
  wanted: boolean;
  preferences: Preferences;
  reduced: boolean;
  paused: boolean;
  error: string;
  toggle: (intro?: boolean) => Promise<void>;
  start: (intro?: boolean) => Promise<void>;
  toggleMusic: () => void;
  update: (patch: Partial<Preferences>) => void;
  effect: (kind?: EffectKind) => void;
  tone: (frequency: number) => void;
  pauseBackground: () => void;
  resumeBackground: () => void;
};
const Context = createContext<SoundContext | null>(null);
export const useSound = () => {
  const c = useContext(Context);
  if (!c) throw new Error("SoundProvider required");
  return c;
};

export function SoundProvider({
  settings,
  autoplay = false,
  children,
}: {
  settings: SiteSettings;
  /** 랜딩: 저장된 설정이 켜져 있으면 첫 상호작용 때 배경 음악을 자동으로 시작 */
  autoplay?: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false),
    [preferences, setPreferences] = useState(defaultPreferences),
    [systemReduced, setSystemReduced] = useState(false),
    [paused, setPaused] = useState(false),
    [hidden, setHidden] = useState(false),
    [error, setError] = useState("");
  const engine = useRef<SoundEngine | null>(null),
    theme = useRef<HTMLAudioElement | null>(null),
    starting = useRef(false);
  const currentVolume = useRef(preferences.volume);
  currentVolume.current = preferences.volume;
  const soundWanted = useRef(preferences.sound),
    autoTried = useRef(false);
  soundWanted.current = preferences.sound;
  useEffect(() => {
    setReady(true);
    engine.current?.volume(preferences.volume);
    if (theme.current) theme.current.volume = preferences.volume * 0.5;
  }, [preferences.volume]);
  const reduced =
    preferences.reduced || systemReduced || settings.motion_intensity === "off";
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [reduced]);
  useEffect(() => {
    try {
      setPreferences(
        parsePreferences(localStorage.getItem("jian-preferences")),
      );
    } catch {}
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(query.matches);
    const change = () => setSystemReduced(query.matches);
    query.addEventListener("change", change);
    return () => {
      query.removeEventListener("change", change);
      void engine.current?.close();
      theme.current?.pause();
    };
  }, []);
  function update(patch: Partial<Preferences>) {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem("jian-preferences", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  function pauseBackground() {
    engine.current?.stop();
    theme.current?.pause();
    setPaused(true);
  }
  useEffect(() => {
    const hide = () => {
      // 탭을 벗어나면 잠시 멈추고, 돌아오면 배경 음악을 이어서 들려줍니다.
      setHidden(document.hidden);
      if (document.hidden) {
        document
          .querySelectorAll("audio,video")
          .forEach((el) => (el as HTMLMediaElement).pause());
        window.dispatchEvent(new Event("universe:pause-media"));
      }
    };
    const leave = () => {
      setHidden(true);
      window.dispatchEvent(new Event("universe:pause-media"));
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
    };
  }, []);
  useEffect(() => {
    engine.current?.stop();
    theme.current?.pause();
    if (!enabled || !preferences.music || paused || hidden) return;
    void engine.current?.activate(currentVolume.current).catch(() => {});
    if (settings.theme_id) {
      theme.current ??= new Audio();
      theme.current.src = mediaUrl(settings.theme_id);
      theme.current.loop = true;
      theme.current.volume = currentVolume.current * 0.5;
      void theme.current.play().catch(() => {
        setError(
          "테마 음악을 재생할 수 없습니다. 기본 테마로 복원하거나 파일을 확인해 주세요.",
        );
      });
    } else engine.current?.theme();
    return () => {
      engine.current?.stop();
      theme.current?.pause();
    };
  }, [enabled, preferences.music, paused, hidden, settings.theme_id]);
  async function start(intro = false) {
    if (starting.current) return;
    starting.current = true;
    if (!preferences.sound) update({ sound: true });
    try {
      const { SoundEngine } = await import("@/lib/sound");
      engine.current ??= new SoundEngine();
      // 아직 막혀 있으면 켜진 것으로 표시하지 않고 다음 동작 때 다시 시도합니다.
      if (!(await engine.current.activate(preferences.volume))) return;
      setError("");
      setPaused(false);
      setEnabled(true);
      if (intro && preferences.effects && settings.effects_enabled)
        engine.current.effect("shimmer");
    } catch {
      setError(
        "이 브라우저에서 소리를 켤 수 없습니다. 작품은 소리 없이 감상할 수 있습니다.",
      );
      setEnabled(false);
    } finally {
      starting.current = false;
    }
  }
  async function toggle(intro = false) {
    if (enabled || (autoplay && preferences.sound)) {
      update({ sound: false });
      setEnabled(false);
      engine.current?.stop();
      theme.current?.pause();
      return;
    }
    await start(intro);
    if (!autoplay && preferences.effects && settings.effects_enabled)
      engine.current?.effect(intro ? "shimmer" : "star");
  }
  // 배경 음악만 켜고 끄기(효과음은 그대로)
  function toggleMusic() {
    const playing = enabled && preferences.music && !paused;
    if (playing) return update({ music: false });
    update({ music: true });
    setPaused(false);
    if (!enabled) void start();
  }
  // 처음부터 배경 음악: 페이지가 열리자마자 시작을 시도합니다.
  // 브라우저가 허용하면(재방문·사이트 안 이동 등) 바로 들리고, 막히면 아래처럼 첫 상호작용 때 시작합니다.
  useEffect(() => {
    if (
      !autoplay ||
      !ready ||
      !preferences.sound ||
      enabled ||
      autoTried.current
    )
      return;
    autoTried.current = true;
    void (async () => {
      try {
        const { SoundEngine } = await import("@/lib/sound");
        engine.current ??= new SoundEngine();
        const running = await engine.current.activate(currentVolume.current);
        // 기다리는 사이 방문자가 소리를 껐다면 켜지 않습니다.
        if (running && soundWanted.current) setEnabled(true);
      } catch {}
    })();
  });
  // 브라우저는 사용자 동작 전에 소리를 막으므로, 첫 터치·클릭·키 입력 때 시작합니다.
  useEffect(() => {
    if (!autoplay || !preferences.sound || enabled) return;
    void import("@/lib/sound");
    const begin = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-sound-control]"))
        return;
      engine.current?.wake();
      void start();
    };
    const events = [
      "pointerdown",
      "keydown",
      "touchstart",
      "touchend",
      "click",
    ] as const;
    events.forEach((t) =>
      addEventListener(t, begin, { capture: true, passive: true }),
    );
    return () =>
      events.forEach((t) => removeEventListener(t, begin, { capture: true }));
  });
  const canPlay = () =>
    enabled &&
    preferences.effects &&
    settings.effects_enabled &&
    !document.hidden;
  function effect(kind: EffectKind = "select") {
    if (canPlay()) engine.current?.effect(kind);
  }
  // 체험형 음표는 사용자가 직접 누른 소리이므로 효과음 설정을 따릅니다.
  function tone(frequency: number) {
    if (canPlay()) engine.current?.tone(frequency);
  }
  return (
    <Context.Provider
      value={{
        ready,
        enabled,
        wanted: autoplay ? preferences.sound : enabled,
        preferences,
        reduced,
        paused,
        error,
        toggle,
        start,
        toggleMusic,
        update,
        effect,
        tone,
        pauseBackground,
        resumeBackground: () => {
          setError("");
          setPaused(false);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
