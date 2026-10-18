export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<OscillatorNode>();
  async activate(volume: number) {
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    this.volume(volume);
    await this.context.resume();
  }
  volume(volume: number) {
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        volume * 0.3,
        this.context.currentTime,
        0.03,
      );
  }
  private note(
    frequency: number,
    delay = 0,
    duration = 0.35,
    voice: OscillatorType = "sine",
  ) {
    if (!this.context || !this.master || this.context.state !== "running")
      return;
    const t = this.context.currentTime + delay,
      o = this.context.createOscillator(),
      g = this.context.createGain();
    o.type = voice;
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.master);
    this.voices.add(o);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      this.voices.delete(o);
    };
    o.start(t);
    o.stop(t + duration + 0.02);
  }
  effect(kind: "select" | "page" | "star" | "success" = "select") {
    const notes =
      kind === "success"
        ? [523.25, 659.25, 783.99]
        : kind === "star"
          ? [1046.5, 1318.5]
          : kind === "page"
            ? [293.66]
            : [440];
    notes.forEach((n, i) => this.note(n, i * 0.07, 0.23));
  }
  theme() {
    this.stop();
    const phrase = () => {
      [
        523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 523.25, 659.25,
        783.99, 1046.5, 783.99,
      ].forEach((n, i) =>
        this.note(n, i * 1.25, 1.5, i % 4 === 0 ? "triangle" : "sine"),
      );
      this.note(261.63, 3, 3, "triangle");
      this.note(392, 8, 3, "triangle");
    };
    phrase();
    this.timer = setInterval(phrase, 18000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const v of this.voices) {
      try {
        v.stop();
      } catch {}
    }
    this.voices.clear();
  }
  async close() {
    this.stop();
    await this.context?.close();
    this.context = null;
    this.master = null;
  }
}
