import { test, expect } from "@playwright/test";
test("unconfigured APIs never expose media or accept an upload", async ({
  request,
}) => {
  const catalog = await request.get("http://127.0.0.1:3000/api/catalog");
  expect(catalog.status()).toBe(200);
  expect((await catalog.json()).mode).toBe("setup");
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

test("production never exposes candidate works, text or asset paths", async ({
  request,
}) => {
  const catalog = await request.get("http://127.0.0.1:3000/api/catalog");
  expect((await catalog.json()).works).toEqual([]);
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
