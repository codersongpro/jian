import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { categories } from "../lib/model";
import { readRepositoryCatalog } from "../lib/repository";

test("repository works have readable text, valid categories and existing local images", async () => {
  const { works } = await readRepositoryCatalog();
  assert.equal(works.length, 34);
  assert.equal(new Set(works.map((work) => work.id)).size, works.length);
  for (const work of works) {
    assert.ok(work.title.trim() && work.content_text?.trim());
    assert.ok(categories.includes(work.category));
    assert.ok(work.year === null || Number.isInteger(work.year));
    for (const url of [work.thumbnail_url!, ...work.pages!.map((p) => p.url)]) {
      assert.match(
        url,
        /^\/works\/[a-z0-9-]+\/[a-z0-9.-]+\.(svg|webp|jpg|png)$/,
      );
      await access(`public${url}`);
    }
  }
  assert.equal(works.filter((work) => work.year === null).length, 28);
  assert.equal(works.find((work) => work.id === "moonjar")!.pages!.length, 19);
  assert.match(
    works.find((work) => work.id === "poems")!.content_text!,
    /## 튤립/,
  );
});

test("repository catalog and committed metadata contain no private review records", async () => {
  const catalog = await readRepositoryCatalog();
  assert.ok(catalog.works.every((work) => work.is_public && !work.review));
  for (const text of [
    JSON.stringify(catalog),
    await readFile("content/works.json", "utf8"),
    await readFile("content/videos.json", "utf8"),
  ]) {
    assert.doesNotMatch(
      text,
      /review_notes|review_status|publish_ready|content-bundle|api\/review-assets/,
    );
  }
});

test("repository videos preserve all six requested links in order", async () => {
  const { videos } = await readRepositoryCatalog();
  const ids = [
    "8MTh27C_X9w",
    "isLp-Cpd69o",
    "oxG9jqFvbVY",
    "3OEGRXvE2xQ",
    "90pUomxgnK0",
    "VAacWXdsdxw",
  ];
  assert.deepEqual(
    videos.map((video) => video.id),
    ids,
  );
  assert.deepEqual(
    videos.map((video) => video.url),
    ids.map((id) => `https://www.youtube.com/watch?v=${id}`),
  );
});
