import { createClient } from "@supabase/supabase-js";
import { publicDb } from "@/lib/supabase";
export const dynamic = "force-dynamic";
const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
function fail(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: noStore });
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = publicDb();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!db || !key) return fail("미디어 저장소 연결이 필요합니다.", 503);
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return fail("파일을 찾을 수 없습니다.", 404);
  // Anonymous RLS enforces current approval and parent visibility before every request, including Range.
  const { data: media, error } = await db
    .from("media")
    .select("path,mime_type,original_name")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("파일 정보를 불러올 수 없습니다.", 502);
  if (!media) return fail("공개된 파일을 찾을 수 없습니다.", 404);
  const privileged = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signed, error: signError } = await privileged.storage
    .from("originals")
    .createSignedUrl(media.path, 30);
  if (signError || !signed) return fail("파일을 불러올 수 없습니다.", 502);
  const range = request.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range))
    return fail("지원하지 않는 범위입니다.", 416);
  try {
    const upstream = await fetch(signed.signedUrl, {
      headers: range ? { Range: range } : {},
      cache: "no-store",
      signal: request.signal,
    });
    if (!upstream.ok && upstream.status !== 416)
      return fail("파일을 불러올 수 없습니다.", 502);
    const headers = new Headers(noStore);
    headers.set("Content-Type", media.mime_type);
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(media.original_name)}`,
    );
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return fail("파일 전송이 중단되었습니다.", 502);
  }
}
