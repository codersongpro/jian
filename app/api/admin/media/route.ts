import { publicDb } from "@/lib/supabase";
export async function POST(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = publicDb(token);
  if (!db)
    return Response.json({ error: "서버 연결이 필요합니다." }, { status: 503 });
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user)
    return Response.json(
      { error: "로그인이 만료되었습니다." },
      { status: 401 },
    );
  const { data: admin } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin)
    return Response.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 },
    );
  let id: string;
  try {
    const body = await request.json();
    id = body.id;
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))
      throw new Error();
  } catch {
    return Response.json({ error: "잘못된 파일 요청입니다." }, { status: 400 });
  }
  const { data: media } = await db
    .from("media")
    .select("path")
    .eq("id", id)
    .maybeSingle();
  if (!media)
    return Response.json(
      { error: "파일을 찾을 수 없습니다." },
      { status: 404 },
    );
  const { data, error: signError } = await db.storage
    .from("originals")
    .createSignedUrl(media.path, 60);
  if (signError)
    return Response.json(
      { error: "파일 미리보기를 만들 수 없습니다." },
      { status: 502 },
    );
  return Response.json(
    { url: data.signedUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
