import type { Work } from "@/lib/model";
import { mediaUrl } from "@/lib/model";

export function Artwork({
  work,
  className = "",
}: {
  work: Work;
  className?: string;
}) {
  if (work.thumbnail_url)
    return (
      <img
        className={`original-art ${className}`}
        src={work.thumbnail_url}
        alt={`${work.title} · 제공된 미리보기 자료`}
        loading="lazy"
      />
    );
  const photo = work.media.find((m) => m.kind === "image" && m.approved);
  if (photo)
    return (
      <img
        className={`original-art ${className}`}
        src={mediaUrl(photo.id)}
        alt={work.title}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.alt = "이미지를 불러올 수 없습니다";
        }}
      />
    );
  return (
    <div
      className={`artwork art-${work.category} ${className}`}
      aria-label={`${work.title}${work.sample ? " · 예시 이미지" : " · 등록된 이미지 없음"}`}
      role="img"
    >
      {work.category === "문학" ? (
        <div className="poem-art">
          <span className="tiny-star">✦</span>
          <div>
            {(work.poem || work.title).split("\n").map((line, i) => (
              <span
                className="poem-line"
                key={i}
                style={{ animationDelay: `${i * 0.16}s` }}
              >
                {line || "\u00a0"}
              </span>
            ))}
          </div>
          <svg viewBox="0 0 140 70" aria-hidden="true">
            <path
              d="M70 65Q63 30 84 12M71 48Q32 48 34 25Q62 23 71 48M76 34Q113 34 108 13Q83 13 76 34"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      ) : (
        <svg viewBox="0 0 400 300" fill="none" aria-hidden="true">
          {work.category === "미술" ? (
            <>
              <path d="M0 300V187Q72 135 164 185T400 160V300Z" fill="#91a28a" />
              <path d="M0 300V242Q98 182 226 232T400 201V300Z" fill="#526b53" />
              <circle cx="290" cy="77" r="31" fill="#dca96d" />
              <path
                d="M106 226Q115 151 95 89M108 160Q42 150 64 107Q112 107 108 160M109 190Q173 158 155 129Q112 143 109 190"
                stroke="#344e40"
                strokeWidth="5"
              />
              <path
                d="M215 242Q217 212 204 178M215 222Q174 218 188 191M214 215Q246 188 237 178"
                stroke="#344e40"
                strokeWidth="3"
              />
            </>
          ) : work.category === "과학" ? (
            <>
              <ellipse
                className="orbit-drawing"
                cx="200"
                cy="150"
                rx="135"
                ry="60"
                transform="rotate(-30 200 150)"
                stroke="#8490ad"
              />
              <ellipse
                cx="200"
                cy="150"
                rx="135"
                ry="60"
                transform="rotate(35 200 150)"
                stroke="#a9a2bf"
              />
              <ellipse
                cx="200"
                cy="150"
                rx="135"
                ry="60"
                transform="rotate(90 200 150)"
                stroke="#b9b2cb"
              />
              <circle cx="200" cy="150" r="22" fill="#a29bb5" />
              <circle cx="305" cy="88" r="8" fill="#c79e68" />
              <circle cx="141" cy="250" r="6" fill="#8693ad" />
              <path d="M310 43v18m-9-9h18M82 222v14m-7-7h14" stroke="#c79e68" />
            </>
          ) : work.category === "음악" ? (
            <>
              <path
                d="M45 120h310M45 137h310M45 154h310M45 171h310M45 188h310"
                stroke="#bcab91"
                strokeWidth=".8"
              />
              <path
                d="M150 172v-72l100-20v72M150 117l100-20"
                stroke="#6e624f"
                strokeWidth="5"
              />
              <ellipse
                cx="136"
                cy="174"
                rx="16"
                ry="11"
                transform="rotate(-20 136 174)"
                fill="#6e624f"
              />
              <ellipse
                cx="236"
                cy="154"
                rx="16"
                ry="11"
                transform="rotate(-20 236 154)"
                fill="#6e624f"
              />
              <path
                d="M78 74l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z"
                fill="#c39d5c"
              />
              <circle cx="310" cy="224" r="3" fill="#c39d5c" />
            </>
          ) : work.category === "발레" ? (
            <>
              <path
                d="M78 247Q254 292 310 207Q342 148 235 173"
                stroke="#b17d8c"
                strokeWidth="1"
              />
              <circle cx="210" cy="69" r="15" fill="#9f7180" />
              <path
                d="M207 85Q181 120 205 153L165 236M205 151Q234 171 284 153M196 111Q133 94 125 58M196 111Q240 109 263 71"
                stroke="#9f7180"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M183 132Q218 128 234 156Q211 188 159 170Z"
                fill="#cba9b4"
                opacity=".7"
              />
              <path
                d="M92 40l4 10 11 1-8 7 2 11-9-5-9 5 2-11-8-7 11-1Z"
                fill="#c39d5c"
              />
            </>
          ) : (
            <>
              {Array.from({ length: 7 }, (_, i) => (
                <rect
                  key={i}
                  x={120 - i * 5}
                  y={70 - i * 4}
                  width={145 + i * 10}
                  height={145 + i * 8}
                  rx="2"
                  transform={`rotate(${i * 12} 200 150)`}
                  stroke={i % 2 ? "#c2a871" : "#829e99"}
                  strokeWidth="1.3"
                />
              ))}
              <circle cx="200" cy="150" r="12" fill="#94a8a0" />
            </>
          )}
        </svg>
      )}
      {work.sample && (
        <span className="art-sample">EXHIBITION STUDY · 예시</span>
      )}
    </div>
  );
}
