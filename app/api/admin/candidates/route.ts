import { readFile } from "node:fs/promises";
import { extname, basename } from "node:path";
import { requireAdmin } from "@/lib/server-auth";
import {
  readCandidates,
  readVideoCandidates,
  candidateFiles,
} from "@/lib/bundle";
import { confirmMutation } from "@/lib/mutations";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  return Response.json(
    { works: await readCandidates(), videos: await readVideoCandidates() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { db, user } = auth;
  let id: string;
  try {
    const body = await request.json();
    if (typeof body.id !== "string") throw new Error();
    id = body.id;
  } catch {
    return Response.json({ error: "작품을 선택해 주세요." }, { status: 400 });
  }
  const work = (await readCandidates()).find((w) => w.id === id);
  if (!work)
    return Response.json(
      { error: "제공된 작품을 찾을 수 없습니다." },
      { status: 404 },
    );
  const existing = await db
    .from("works")
    .select("id,import_complete")
    .eq("source_id", id)
    .maybeSingle();
  if (existing.error)
    return Response.json(
      {
        error:
          "가져오기 상태를 확인할 수 없습니다. 최신 스키마와 권한을 확인해 주세요.",
      },
      { status: 502 },
    );
  if (existing.data)
    return existing.data.import_complete
      ? Response.json({ id: existing.data.id, already_imported: true })
      : Response.json(
          {
            error:
              "이전 가져오기가 끝나지 않은 비공개 작품이 있습니다. 작품 관리에서 확인 후 정리해 주세요.",
          },
          { status: 409 },
        );
  let createdId: string | null = null;
  const paths: string[] = [];
  try {
    const inserted = await db
      .from("works")
      .insert({
        source_id: id,
        title: work.title,
        category: work.category,
        year: work.year,
        description: work.description,
        poem: "",
        content_text: work.content_text,
        provenance: work.provenance,
        is_public: false,
        featured_order: work.featured_order,
        motion_enabled: true,
        youtube_id: null,
        import_complete: false,
      })
      .select("id")
      .single();
    const row = confirmMutation(
      inserted,
      "작품을 비공개로 등록하지 못했습니다.",
    );
    createdId = row.id;
    confirmMutation(
      await db
        .from("work_reviews")
        .insert({ work_id: createdId, metadata: work.review })
        .select("work_id")
        .single(),
      "내부 검수 기록을 비공개로 저장하지 못했습니다.",
    );
    const files = await candidateFiles(id);
    const media = [];
    for (const [i, file] of files.entries()) {
      if (!file.absolute)
        throw new Error("검증된 자료 파일을 찾을 수 없습니다.");
      const extension = extname(file.path).slice(1),
        path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const mime =
        extension === "webp"
          ? "image/webp"
          : extension === "png"
            ? "image/png"
            : "image/jpeg";
      const upload = await db.storage
        .from("originals")
        .upload(path, await readFile(file.absolute), {
          contentType: mime,
          upsert: false,
        });
      if (upload.error)
        throw new Error("자료 파일 업로드를 완료하지 못했습니다.");
      paths.push(path);
      media.push({
        work_id: createdId,
        path,
        original_name: basename(file.path),
        kind: "image",
        mime_type: mime,
        approved: false,
        rights_confirmed: false,
        sort_order: i,
      });
    }
    if (media.length) {
      const saved = await db.from("media").insert(media).select("id");
      if (saved.error || saved.data?.length !== media.length)
        throw new Error("미디어 정보를 모두 보관하지 못했습니다.");
    }
    confirmMutation(
      await db
        .from("works")
        .update({ import_complete: true })
        .eq("id", createdId)
        .select("id")
        .single(),
      "가져오기 완료 상태를 저장하지 못했습니다.",
    );
    return Response.json(
      {
        id: createdId,
        already_imported: false,
        media_count: media.length,
        is_public: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    if (createdId) await db.from("works").delete().eq("id", createdId);
    if (paths.length) await db.storage.from("originals").remove(paths);
    return Response.json(
      {
        error:
          "가져오기를 완료하지 못했습니다. 권한과 저장소를 확인해 주세요. 정리에 실패한 경우 비공개 작품·파일이 남을 수 있습니다.",
      },
      { status: 502 },
    );
  }
}
