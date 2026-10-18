import type { Metadata } from "next";
import { Exhibition } from "@/components/exhibition";
import { getCatalog } from "@/lib/catalog";

// 영어 버전 랜딩페이지 (/en)
export const metadata: Metadata = {
  title: "JIAN'S UNIVERSE — A little curiosity, a big story",
  description:
    "Writing, drawing, science, music and ballet. A small digital gallery where Jian’s thoughts sparkle.",
  alternates: { languages: { ko: "/", en: "/en" } },
  openGraph: {
    title: "JIAN'S UNIVERSE — A little curiosity, a big story",
    description:
      "Writing, drawing, science, music and ballet. A small digital gallery where Jian’s thoughts sparkle.",
    url: "/en",
    locale: "en_US",
  },
};
export const dynamic = "force-dynamic";
export default async function EnglishPage() {
  const catalog = await getCatalog();
  return <Exhibition {...catalog} lang="en" />;
}
