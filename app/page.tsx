import { Exhibition } from "@/components/exhibition";
import { getCatalog } from "@/lib/catalog";
import { reviewEnabled } from "@/lib/bundle";
export function generateMetadata() {
  return reviewEnabled()
    ? {
        robots: { index: false, follow: false },
        title: "자료 검토 — JIAN’S UNIVERSE",
      }
    : {};
}
export const dynamic = "force-dynamic";
export default async function Page() {
  const catalog = await getCatalog();
  return <Exhibition {...catalog} />;
}
