import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { resolveCandidateAsset, reviewEnabled } from "@/lib/bundle";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
  if (!reviewEnabled()) return new Response(null, { status: 404, headers });
  const { path } = await params;
  const file = await resolveCandidateAsset(path.join("/"));
  if (!file) return new Response(null, { status: 404, headers });
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
  return new Response(new Uint8Array(await readFile(file)), {
    headers: {
      ...headers,
      "Content-Type": types[extname(file)] || "application/octet-stream",
    },
  });
}
