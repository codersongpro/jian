import type { Metadata } from "next";
import "./globals.css";
import "./content.css";
export const metadata: Metadata = {
  title: "JIAN'S UNIVERSE — 작은 호기심, 커다란 이야기",
  description:
    "글, 그림, 과학, 음악과 발레. 지안이의 생각이 반짝이는 작은 디지털 전시관.",
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
