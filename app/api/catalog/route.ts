import { getCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await getCatalog(), {
    headers: { "Cache-Control": "no-store" },
  });
}
