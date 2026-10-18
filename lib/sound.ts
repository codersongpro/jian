// Web Audio로 직접 합성하는 사운드 엔진 (외부 음원·제삼자 음악 없음)
export type EffectKind =
  | "select"
  | "page"
  | "star"
  | "success"
  | "shimmer"
  | "orbit"
  | "brush"
  | "chime";

// 배경 음악 "Starlight Lullaby": 4개 화음 × 8초 = 32초 반복
const CHORDS = [
  {
    pad: [130.81, 196, 246.94, 329.63],
    bell: [523.25, 659.25, 783.99, 987.77],
  }, // Cmaj7
  { pad: [110, 164.81, 246.94, 261.63], bell: [440, 523.25, 659.25, 880] }, // Am9
  { pad: [87.31, 174.61, 220, 329.63], bell: [523.25, 698.46, 880, 1046.5] }, // Fmaj7
  { pad: [98, 196, 246.94, 293.66], bell: [587.33, 783.99, 987.77, 1174.66] }, // G6
];
// 화음마다 연주할 벨 선율 (화음 음 인덱스, 시작 박자)
const PHRASES = [
  [
    [0, 0],
    [2, 1],
    [1, 2],
    [3, 3.5],
    [2, 5],
  ],
  [
    [1, 0.5],
    [0, 1.5],
    [2, 3],
    [1, 4.5],
  ],
  [
    [2, 0],
    [3, 1],
    [1, 2.5],
    [0, 4],
    [2, 5.5],
  ],
  [
    [3, 0.5],
    [2, 2],
    [1, 3],
    [0, 4.5],
    [1, 6],
  ],
];
const BAR = 8;

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer | null = null;
  private bar = 0;

  async activate(volume: number) {
    this.context ??= new AudioContext();
    if (!this.master) {
      const c = this.context;
      const limiter = c.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.ratio.value = 6;
      limiter.connect(c.destination);
      this.master = c.createGain();
      this.master.connect(limiter);
      // 잔향: 직접 만든 임펄스 응답으로 넓은 공간감
      const convolver = c.createConvolver();
      convolver.buffer = this.impulse(2.8);
      this.reverb = c.createGain();
      this.reverb.gain.value = 0.42;
      this.reverb.connect(convolver);
      convolver.connect(this.master);
    }
    this.volume(volume);
    await this.context.resume();
  }

  volume(volume: number) {
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        volume * 0.32,
        this.context.currentTime,
        0.03,
      );
  }

  private impulse(seconds: number) {
    const c = this.context!,
      length = Math.floor(c.sampleRate * seconds),
      buffer = c.createBuffer(2, length, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    return buffer;
  }

  private ready() {
    return Boolean(
      this.context && this.master && this.context.state === "running",
    );
  }

  private track(node: AudioScheduledSourceNode, ...chain: AudioNode[]) {
    this.voices.add(node);
    node.onended = () => {
      node.disconnect();
      chain.forEach((n) => n.disconnect());
      this.voices.delete(node);
    };
  }

  // 한 음: 기본 파형 + 선택적 배음(벨 음색), 드라이/잔향으로 함께 전송
  private note(
    frequency: number,
    delay = 0,
    duration = 0.35,
    voice: OscillatorType = "sine",
    level = 0.16,
    wet = 0.35,
  ) {
    if (!this.ready()) return;
    const c = this.context!,
      t = c.currentTime + delay,
      o = c.createOscillator(),
      g = c.createGain(),
      send = c.createGain();
    o.type = voice;
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    send.gain.value = wet;
    o.connect(g);
    g.connect(this.master!);
    g.connect(send);
    send.connect(this.reverb!);
    this.track(o, g, send);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  private bell(frequency: number, delay = 0, level = 0.12, duration = 1.6) {
    this.note(frequency, delay, duration, "sine", level, 0.5);
    this.note(
      frequency * 2.01,
      delay,
      duration * 0.45,
      "sine",
      level * 0.28,
      0.6,
    );
    this.note(
      frequency * 3.02,
      delay,
      duration * 0.25,
      "sine",
      level * 0.1,
      0.7,
    );
  }

  // 부드러운 화음 패드: 살짝 어긋난 두 삼각파 + 저역 통과 필터
  private pad(frequency: number, start: number, duration: number) {
    if (!this.ready()) return;
    const c = this.context!,
      t = c.currentTime + start,
      filter = c.createBiquadFilter(),
      g = c.createGain(),
      send = c.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 2.2);
    g.gain.setValueAtTime(0.045, t + duration - 2.4);
    g.gain.linearRampToValueAtTime(0, t + duration);
    send.gain.value = 0.8;
    filter.connect(g);
    g.connect(this.master!);
    g.connect(send);
    send.connect(this.reverb!);
    [-4, 4].forEach((cents, i) => {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = frequency;
      o.detune.value = cents;
      o.connect(filter);
      // 마지막 오실레이터가 끝날 때 공용 노드를 정리
      this.track(o, ...(i ? [filter, g, send] : []));
      o.start(t);
      o.stop(t + duration + 0.05);
    });
  }

  private hiss(
    delay: number,
    duration: number,
    from: number,
    to: number,
    level: number,
  ) {
    if (!this.ready()) return;
    const c = this.context!;
    this.noise ??= (() => {
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();
    const t = c.currentTime + delay,
      src = c.createBufferSource(),
      band = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = this.noise;
    src.loop = true;
    band.type = "bandpass";
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(from, t);
    band.frequency.exponentialRampToValueAtTime(to, t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + duration * 0.3);
    g.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(band);
    band.connect(g);
    g.connect(this.master!);
    this.track(src, band, g);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  effect(kind: EffectKind = "select") {
    switch (kind) {
      case "success":
        [523.25, 659.25, 783.99].forEach((n, i) =>
          this.bell(n, i * 0.08, 0.1, 1.2),
        );
        break;
      case "star":
        [1046.5, 1318.5].forEach((n, i) => this.bell(n, i * 0.07, 0.09, 1.1));
        break;
      case "page":
        this.note(293.66, 0, 0.3, "triangle", 0.1);
        this.hiss(0, 0.28, 1800, 600, 0.05);
        break;
      case "shimmer": // 인트로: 별가루가 모이는 반짝임
        this.hiss(0, 2.4, 3000, 9000, 0.035);
        [1318.5, 1567.98, 1975.53, 2349.32, 2637.02, 3135.96].forEach((n, i) =>
          this.bell(n, 0.25 + i * 0.22, 0.05, 1.4),
        );
        [261.63, 392, 523.25].forEach((n) =>
          this.note(n, 1.4, 3.2, "triangle", 0.06, 0.8),
        );
        break;
      case "orbit": // 새 별 탄생
        this.bell(880 + Math.random() * 660, 0, 0.08, 1.2);
        break;
      case "brush": // 붓질
        this.hiss(0, 0.35, 700 + Math.random() * 400, 2400, 0.045);
        break;
      case "chime": // 문장 완성
        [783.99, 987.77, 1174.66, 1567.98].forEach((n, i) =>
          this.bell(n, i * 0.11, 0.07, 1.8),
        );
        break;
      default:
        this.note(440, 0, 0.23, "sine", 0.12);
    }
  }

  // 사용자가 직접 누르는 음표 (음악·발레 체험)
  tone(frequency: number) {
    this.bell(frequency, 0, 0.13, 1.8);
  }

  private playBar() {
    const i = this.bar % CHORDS.length,
      chord = CHORDS[i];
    chord.pad.forEach((f) => this.pad(f, 0.05, BAR + 1.6));
    PHRASES[i].forEach(([n, beat]) =>
      this.bell(chord.bell[n], 0.1 + beat, 0.075, 2.4),
    );
    if (i === 3) this.bell(chord.bell[3] * 2, 6.8, 0.03, 2.2);
    this.bar++;
  }

  theme() {
    this.stop();
    this.bar = 0;
    this.playBar();
    this.timer = setInterval(() => this.playBar(), BAR * 1000);
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
    this.reverb = null;
  }
}
