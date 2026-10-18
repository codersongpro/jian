import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Gowun_Batang } from "next/font/google";
import "./globals.css";
import "./content.css";
import "./landing.css";

// 제목용 세리프: 영문은 Cormorant Garamond, 한글은 고운바탕 (빌드 시 자체 호스팅)
const display = Cormorant_Garamond({
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
});
const korean = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-kr",
  preload: false,
});

export const metadata: Metadata = {
  title: "JIAN'S UNIVERSE — 작은 호기심, 커다란 이야기",
  description:
    "글, 그림, 과학, 음악과 발레. 지안이의 생각이 반짝이는 작은 디지털 전시관.",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#0b1030" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${display.variable} ${korean.variable}`}>
      <body>{children}</body>
    </html>
  );
}
