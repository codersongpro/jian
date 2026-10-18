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
  enabled: boolean;
  preferences: Preferences;
  reduced: boolean;
  paused: boolean;
  error: string;
  toggle: (intro?: boolean) => Promise<void>;
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
  children,
}: {
  settings: SiteSettings;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false),
    [preferences, setPreferences] = useState(defaultPreferences),
    [systemReduced, setSystemReduced] = useState(false),
    [paused, setPaused] = useState(false),
    [error, setError] = useState("");
  const engine = useRef<SoundEngine | null>(null),
    theme = useRef<HTMLAudioElement | null>(null);
  const currentVolume = useRef(preferences.volume);
  currentVolume.current = preferences.volume;
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
      if (document.hidden) {
        pauseBackground();
        document
          .querySelectorAll("audio,video")
          .forEach((el) => (el as HTMLMediaElement).pause());
        window.dispatchEvent(new Event("universe:pause-media"));
      }
    };
    const leave = () => {
      pauseBackground();
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
    if (!enabled || !preferences.music || paused) return;
    engine.current?.volume(currentVolume.current);
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
  }, [enabled, preferences.music, paused, settings.theme_id]);
  async function toggle(intro = false) {
    if (enabled) {
      setEnabled(false);
      engine.current?.stop();
      theme.current?.pause();
      return;
    }
    try {
      const { SoundEngine } = await import("@/lib/sound");
      engine.current ??= new SoundEngine();
      await engine.current.activate(preferences.volume);
      setError("");
      setPaused(false);
      setEnabled(true);
      if (preferences.effects && settings.effects_enabled)
        engine.current.effect(intro ? "shimmer" : "star");
    } catch {
      setError(
        "이 브라우저에서 소리를 켤 수 없습니다. 작품은 소리 없이 감상할 수 있습니다.",
      );
      setEnabled(false);
    }
  }
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
        preferences,
        reduced,
        paused,
        error,
        toggle,
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
