"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useCopy } from "../lang";

// 과학: 지안이의 그림 「몸속 탐험: 뇌와 척수」를 따라가는 뇌 지도.
// 방을 누르면 지안이가 그린 뇌세포(노란 띠를 두른 캡슐 모양)가 그 방으로 달려가고,
// 지안이 그림의 그 부분 사진과 설명이 나타납니다.
type RoomId =
  | "empty"
  | "memory"
  | "senses"
  | "feelings"
  | "skull"
  | "vessel"
  | "spine";

// 지도 위 위치(뇌세포가 설 자리)와 지안이 그림에서 그 부분 사진
const ROOMS: Record<
  RoomId,
  { x: number; y: number; img: string; tone: number }
> = {
  empty: {
    x: 300,
    y: 112,
    img: "/works/brain-journey/page-04.jpg",
    tone: 659.25,
  },
  memory: {
    x: 208,
    y: 190,
    img: "/works/brain-journey/page-04.jpg",
    tone: 523.25,
  },
  senses: {
    x: 418,
    y: 196,
    img: "/works/brain-journey/page-03.jpg",
    tone: 783.99,
  },
  feelings: {
    x: 168,
    y: 282,
    img: "/works/brain-journey/page-05.jpg",
    tone: 587.33,
  },
  skull: { x: 112, y: 92, img: "/works/brain-journey/page-02.jpg", tone: 440 },
  vessel: {
    x: 488,
    y: 112,
    img: "/works/brain-journey/page-06.jpg",
    tone: 392,
  },
  spine: {
    x: 300,
    y: 392,
    img: "/works/brain-journey/page-07.jpg",
    tone: 329.63,
  },
};

function Cell({ face = "happy" }: { face?: "happy" | "wow" }) {
  return (
    <g className="brain-cell-body">
      <path
        className="antenna"
        d="M-6 -24Q-12 -36 -18 -34M6 -24Q12 -36 18 -34"
      />
      <rect
        x="-13"
        y="-26"
        width="26"
        height="40"
        rx="13"
        className="capsule"
      />
      <rect x="-13" y="2" width="26" height="8" className="belt" />
      <circle cx="-5" cy="-12" r="2.2" className="eye" />
      <circle cx="5" cy="-12" r="2.2" className="eye" />
      {face === "wow" ? (
        <circle cx="0" cy="-4" r="2.6" className="mouth" />
      ) : (
        <path d="M-4 -6Q0 -2 4 -6" className="smile" />
      )}
      <path className="leg" d="M-5 14V22M5 14V22" />
    </g>
  );
}

export function BrainCard({
  tone,
  onOpen,
}: {
  tone: (f: number) => void;
  /** 「몸속 탐험: 뇌와 척수」 작품 열기 */
  onOpen?: () => void;
}) {
  const { t } = useCopy();
  const [room, setRoom] = useState<RoomId>("memory"),
    [secret, setSecret] = useState(false),
    [signal, setSignal] = useState(0),
    hop = useRef<SVGGElement>(null);
  const r = ROOMS[room],
    info = t.brainRooms[room];

  const go = (id: RoomId) => {
    setSecret(false);
    setRoom(id);
    tone(ROOMS[id].tone);
    if (id === "spine") setSignal((n) => n + 1);
  };
  // 도착하면 뇌세포가 폴짝
  useEffect(() => {
    const el = hop.current;
    if (!el) return;
    el.classList.remove("hop");
    void el.getBoundingClientRect();
    el.classList.add("hop");
  }, [room]);

  const roomButton = (
    id: RoomId,
    shape: React.ReactNode,
    label: { x: number; y: number },
  ) => (
    <g
      key={id}
      role="button"
      tabIndex={0}
      aria-label={t.brainRooms[id].name}
      aria-pressed={room === id}
      className={`brain-room room-${id} ${room === id ? "active" : ""}`}
      onClick={() => go(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go(id);
        }
      }}
    >
      {shape}
      <text x={label.x} y={label.y}>
        {t.brainRooms[id].name}
      </text>
    </g>
  );

  return (
    <section className="brain-card" aria-labelledby="brain-title">
      <div className="brain-copy">
        <div className="interlude-label">
          <span>BRAIN TRIP</span> {t.brainLabel}
        </div>
        <h2 id="brain-title">
          {t.brainTitle[0]}
          <br />
          <em>{t.brainTitle[1]}</em>
        </h2>
        <p className="brain-text">{t.brainText}</p>
        <div className="brain-info" aria-live="polite">
          <img src={r.img} alt="" loading="lazy" />
          <div>
            <strong>{secret ? "🤫" : info.name}</strong>
            <p>{secret ? t.brainSecretMsg : info.text}</p>
          </div>
        </div>
        {onOpen && (
          <button type="button" className="text-link" onClick={onOpen}>
            {t.brainOpen} <ArrowUpRight size={14} />
          </button>
        )}
        <p className="interlude-hint">{t.brainHint}</p>
      </div>
      <div className="brain-map">
        <svg viewBox="0 0 600 460" role="group" aria-label={t.brainFigure}>
          {/* 머리뼈와 뇌막: 겹겹의 띠 */}
          {roomButton(
            "skull",
            <>
              <path
                className="skull bone"
                d="M30 300Q30 30 300 26Q570 30 570 300"
              />
              <path
                className="skull membrane"
                d="M46 300Q48 48 300 44Q552 48 554 300"
              />
            </>,
            { x: 92, y: 66 },
          )}
          {/* 말랑한 뇌 */}
          <path
            className="brain-body"
            d="M60 300Q62 62 300 60Q538 62 540 300Q540 330 300 332Q60 330 60 300Z"
          />
          {/* 혈관 */}
          {roomButton(
            "vessel",
            <path
              className="vessel"
              d="M470 70L452 120L490 150M452 120L418 132M520 120L490 150L500 200M120 150L150 200L130 250M150 200L185 210"
            />,
            { x: 470, y: 66 },
          )}
          {/* 방들 */}
          {roomButton("empty", <ellipse cx="300" cy="118" rx="78" ry="38" />, {
            x: 300,
            y: 124,
          })}
          {roomButton("memory", <ellipse cx="200" cy="196" rx="88" ry="46" />, {
            x: 200,
            y: 202,
          })}
          {roomButton(
            "senses",
            <>
              <ellipse cx="420" cy="208" rx="92" ry="66" />
              <path className="divider" d="M420 142V274M328 208H512" />
              <text className="sense" x="380" y="186">
                👁
              </text>
              <text className="sense" x="452" y="186">
                👂
              </text>
              <text className="sense" x="380" y="246">
                👅
              </text>
              <text className="sense" x="452" y="246">
                👃
              </text>
            </>,
            { x: 420, y: 290 },
          )}
          {roomButton(
            "feelings",
            <ellipse cx="170" cy="284" rx="78" ry="38" />,
            { x: 170, y: 290 },
          )}
          {/* 비밀방 */}
          <g
            role="button"
            tabIndex={0}
            aria-label={t.brainSecretMsg}
            className={`brain-room room-secret ${secret ? "active" : ""}`}
            onClick={() => {
              setSecret(true);
              tone(1046.5);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSecret(true);
                tone(1046.5);
              }
            }}
          >
            <ellipse cx="300" cy="300" rx="34" ry="20" />
            <text x="300" y="305">
              ?
            </text>
          </g>
          {/* 척수: 뇌 아래로 이어지는 길과 사다리 */}
          {roomButton(
            "spine",
            <>
              <path
                className="spine-road"
                d="M300 332Q270 370 300 400Q330 430 300 458"
              />
              <path
                className="spine-ladder"
                d="M330 340V440M322 356H338M322 376H338M322 396H338M322 416H338"
              />
            </>,
            { x: 238, y: 410 },
          )}
          {/* 척수를 타고 올라가는 소식 */}
          {signal > 0 && (
            <circle key={signal} className="brain-signal" r="7">
              <animateMotion
                dur="1.2s"
                fill="freeze"
                path="M300 458Q330 430 300 400Q270 370 300 332L420 208"
              />
            </circle>
          )}
          {/* 뇌세포 친구 */}
          <g
            className="brain-cell"
            style={{ transform: `translate(${r.x}px, ${r.y - 8}px)` }}
          >
            <g ref={hop}>
              <Cell face={room === "vessel" || secret ? "wow" : "happy"} />
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
