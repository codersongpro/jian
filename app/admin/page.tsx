import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin-panel";
export const metadata: Metadata = {
  title: "전시 관리 — JIAN’S UNIVERSE",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminPanel />;
}
