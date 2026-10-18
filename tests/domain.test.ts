import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterWorks,
  parsePreferences,
  youtubeId,
  validateUpload,
} from "../lib/validation";

test("filters combine category and year without changing the source", () => {
  const works = [
    { category: "문학", year: 2025 },
    { category: "미술", year: 2025 },
    { category: "문학", year: 2024 },
  ];
  assert.deepEqual(filterWorks(works, "문학", "2025"), [works[0]]);
  assert.equal(filterWorks(works, "전체", "전체").length, 3);
  assert.equal(works.length, 3);
});
test("preferences recover safely from malformed and untrusted storage", () => {
  assert.deepEqual(parsePreferences("{broken"), {
    music: true,
    effects: true,
    volume: 0.35,
    reduced: false,
  });
  assert.deepEqual(
    parsePreferences(
      '{"music":false,"effects":"yes","volume":9,"reduced":true,"enabled":true}',
    ),
    { music: false, effects: true, volume: 1, reduced: true },
  );
  assert.equal(parsePreferences("null").volume, 0.35);
});
test("accepts only valid YouTube hosts and video identifiers", () => {
  assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=3"), "dQw4w9WgXcQ");
  assert.equal(
    youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://evil.test/dQw4w9WgXcQ",
    "https://youtube.com/shorts/no",
  ])
    assert.equal(youtubeId(url), null);
});
test("uploads reject active content, MIME mismatch and oversized originals", () => {
  assert.equal(validateUpload("drawing.png", "image/png", 1234), null);
  assert.equal(validateUpload("recital.wav", "audio/wav", 10_000_000), null);
  assert.ok(validateUpload("drawing.svg", "image/svg+xml", 10));
  assert.ok(validateUpload("drawing.png", "text/html", 10));
  assert.ok(validateUpload("recital.mp3", "audio/mpeg", 51 * 1024 * 1024));
  assert.ok(validateUpload("empty.png", "image/png", 0));
});
test("unknown source dates can be filtered without inventing a year", () => {
  const works = [
    { category: "문학", year: null },
    { category: "미술", year: 2024 },
  ];
  assert.deepEqual(filterWorks(works, "전체", "미상"), [works[0]]);
});
