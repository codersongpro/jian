import { test } from "node:test";
import assert from "node:assert/strict";
import { splitProvenance } from "../lib/provenance";
test("public provenance excludes review notes, publication flags and unexpected fields", () => {
  const source = {
    category: "문학",
    date: null,
    date_basis: "제작일 미확인",
    creator_display: "Jian",
    evidence_level: "제공 자료",
    authorship_note: "정리본 전사",
    publish_ready: false,
    review_status: "대기",
    review_notes: ["관리자 검토 메모"],
    unexpected: "internal",
  };
  const result = splitProvenance(source);
  assert.deepEqual(
    Object.keys(result.provenance).sort(),
    [
      "category",
      "date",
      "date_basis",
      "creator_display",
      "evidence_level",
      "authorship_note",
    ].sort(),
  );
  assert.deepEqual(result.review.review_notes, ["관리자 검토 메모"]);
});
