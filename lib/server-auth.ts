import "server-only";
import { publicDb } from "./supabase";
import type { SupabaseClient, User } from "@supabase/supabase-js";
type AdminResult =
  | { ok: true; db: SupabaseClient; user: User }
  | { ok: false; response: Response };
export async function requireAdmin(request: Request): Promise<AdminResult> {
  const fail = (status: number, error: string): AdminResult => ({
    ok: false,
    response: Response.json(
      { error },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  });
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return fail(401, "로그인이 필요합니다.");
  const db = publicDb(token);
  if (!db) return fail(503, "서버 연결이 필요합니다.");
  try {
    const {
      data: { user },
      error,
    } = await db.auth.getUser(token);
    if (error || !user) return fail(401, "로그인이 만료되었습니다.");
    const { data: admin, error: membershipError } = await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) return fail(503, "관리자 권한을 확인할 수 없습니다.");
    if (!admin) return fail(403, "관리자 권한이 필요합니다.");
    return { ok: true, db, user };
  } catch {
    return fail(503, "서버 연결을 확인해 주세요.");
  }
}
