import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmMutation } from "../lib/mutations";

test("RLS-filtered zero-row mutation cannot report a successful approval or deletion", () => {
  assert.throws(
    () => confirmMutation({ data: null, error: null }, "변경되지 않았습니다."),
    /변경되지 않았습니다/,
  );
});
test("cloud error is a failure even if stale row data accompanies it", () => {
  assert.throws(
    () =>
      confirmMutation(
        { data: { id: "a" }, error: { code: "42501" } },
        "권한이 없습니다.",
      ),
    /권한이 없습니다/,
  );
});
test("a returned changed row confirms the mutation", () => {
  assert.deepEqual(
    confirmMutation({ data: { id: "a" }, error: null }, "실패"),
    { id: "a" },
  );
});
