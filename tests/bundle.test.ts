import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  readCandidates,
  readVideoCandidates,
  resolveCandidateAsset,
  reviewEnabled,
} from "../lib/bundle";
const sourceTest = existsSync("content-bundle/data/works.json")
  ? test
  : test.skip;
sourceTest(
  "all nine supplied works remain drafts with exact titles and original date evidence",
  async () => {
    const works = await readCandidates();
    assert.equal(works.length, 9);
    assert.ok(
      works.every(
        (w) => !w.is_public && !w.sample && w.review?.publish_ready === false,
      ),
    );
    const river = works.find((w) => w.id === "river-story")!;
    assert.equal(river.title, "어리다 강물이야기");
    assert.match(river.provenance!.date_basis, /Drive 파일 생성일/);
    const craft = works.find((w) => w.id === "craft-moon")!;
    assert.equal(craft.year, null);
    assert.match(
      works.find((w) => w.id === "ai-talk")!.content_text!,
      /구현·운영·효과는 확인하지 않았다/,
    );
    assert.match(works.find((w) => w.id === "poems")!.content_text!, /## 튤립/);
  },
);
sourceTest(
  "six supplied YouTube IDs retain order and are not approved for embedding",
  async () => {
    const links = await readVideoCandidates();
    assert.deepEqual(
      links.map((v) => v.id),
      [
        "8MTh27C_X9w",
        "isLp-Cpd69o",
        "oxG9jqFvbVY",
        "3OEGRXvE2xQ",
        "90pUomxgnK0",
        "VAacWXdsdxw",
      ],
    );
    assert.ok(
      links.every(
        (v) =>
          v.publish_ready === false &&
          v.embed_verified === false &&
          v.title === null,
      ),
    );
  },
);
sourceTest(
  "review-only assets are allowlisted and cannot traverse to metadata or secrets",
  async () => {
    assert.ok(await resolveCandidateAsset("assets/acorn/photo.jpg"));
    for (const path of [
      "../.env.local",
      "assets/../../README.md",
      "data/works.json",
      "content/poems.md",
      "assets/no-file.jpg",
    ])
      assert.equal(await resolveCandidateAsset(path), null);
  },
);
test("production never activates candidate review even when the flag is set", () => {
  assert.equal(reviewEnabled("production", "1"), false);
  assert.equal(reviewEnabled("development", "1"), true);
  assert.equal(reviewEnabled("development", undefined), false);
});
sourceTest(
  "all 58 supplied file hashes match without altering source derivatives",
  async () => {
    const manifest = await readFile("content-bundle/SHA256SUMS.txt", "utf8");
    const lines = manifest.trim().split("\n");
    assert.equal(lines.length, 58);
    for (const line of lines) {
      const [expected, path] = line.split(/\s+/, 2);
      const actual = createHash("sha256")
        .update(await readFile("content-bundle/" + path))
        .digest("hex");
      assert.equal(actual, expected, path);
    }
  },
);
