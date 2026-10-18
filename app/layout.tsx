import type { Metadata, Viewport } from "next";
import { Fraunces, Gowun_Batang, Gowun_Dodum } from "next/font/google";
import "./globals.css";
import "./content.css";
import "./landing.css";

// 글꼴 (빌드 시 자체 호스팅, 방문자 브라우저는 Google에 요청하지 않음)
// 영문 제목: Fraunces(부드러운 SOFT 축) · 한글 제목: 고운바탕 · 본문: 고운돋움
const display = Fraunces({
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  subsets: ["latin"],
  variable: "--font-display",
});
const korean = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-kr",
  preload: false,
});
const body = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-body",
  preload: false,
});

const title = "JIAN’S UNIVERSE — 작은 호기심, 커다란 이야기",
  description =
    "글, 그림, 과학, 음악과 발레. 지안이의 생각이 반짝이는 작은 디지털 전시관.";
// 공유 미리보기(카카오톡·문자·SNS). 이미지는 app/opengraph-image.png를 자동으로 씁니다.
export const metadata: Metadata = {
  metadataBase: new URL("https://jian.songpro.app"),
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "JIAN’S UNIVERSE",
    title,
    description,
    url: "/",
    locale: "ko_KR",
  },
  twitter: { card: "summary_large_image", title, description },
};
export const viewport: Viewport = { themeColor: "#0b1030" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${korean.variable} ${body.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
