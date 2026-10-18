import { test, expect } from "@playwright/test";
test("repository catalog works without a database and uploads stay protected", async ({
  request,
}) => {
  const catalog = await request.get("http://127.0.0.1:3000/api/catalog");
  expect(catalog.status()).toBe(200);
  const data = await catalog.json();
  expect(data.mode).toBe("repository");
  expect(data.works).toHaveLength(9);
  expect(
    data.works.every(
      (work: { is_public: boolean; review?: unknown }) =>
        work.is_public && !work.review,
    ),
  ).toBe(true);
  expect(data.videos).toHaveLength(6);
  const image = await request.get(
    "http://127.0.0.1:3000" + data.works[0].thumbnail_url,
  );
  expect(image.status()).toBe(200);
  const media = await request.get(
    "http://127.0.0.1:3000/api/media/00000000-0000-4000-8000-000000000000",
    { headers: { Range: "bytes=0-99" } },
  );
  expect(media.status()).toBe(503);
  expect(media.headers()["cache-control"]).toContain("no-store");
  const upload = await request.post("http://127.0.0.1:3000/api/admin/media", {
    data: {},
  });
  expect(upload.status()).toBe(401);
});

test("production serves selected works without exposing the private review bundle", async ({
  request,
}) => {
  const catalog = await request.get("http://127.0.0.1:3000/api/catalog");
  const data = await catalog.json();
  expect(
    data.works.find((work: { id: string }) => work.id === "poems").content_text,
  ).toContain("## 튤립");
  expect(JSON.stringify(data)).not.toMatch(
    /review_notes|review_status|publish_ready|content-bundle|api\/review-assets/,
  );
  for (const path of [
    "/api/review-assets/assets/acorn/photo.jpg",
    "/api/review-assets/data/works.json",
    "/content-bundle/assets/acorn/photo.jpg",
  ]) {
    const response = await request.get("http://127.0.0.1:3000" + path);
    expect(response.status()).toBe(404);
  }
  expect(
    (await request.get("http://127.0.0.1:3000/api/admin/candidates")).status(),
  ).toBe(401);
  expect(
    (
      await request.post("http://127.0.0.1:3000/api/admin/candidates", {
        data: { id: "poems" },
      })
    ).status(),
  ).toBe(401);
});
