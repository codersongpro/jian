import { test, expect } from "@playwright/test";
test("actual source works retain transcriptions, pages, dates and six unembedded videos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("자료 검토 미리보기 · 9개 작품 묶음 · 공개 검수 대기"),
  ).toBeVisible();
  await expect(page.locator("[data-work-card]")).toHaveCount(9);
  await page
    .locator("[data-work-card]")
    .filter({ hasText: "동시 다섯 편" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "튤립", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Drive 파일 생성일");
  await page.keyboard.press("Escape");
  await page
    .locator("[data-work-card]")
    .filter({ hasText: "달항아리 이야기 1" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "작품 페이지" }),
  ).toContainText("1 / 19");
  const pageImage = page.getByRole("dialog").locator("img").first();
  await expect
    .poll(() =>
      pageImage.evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBeTruthy();
  expect((await pageImage.boundingBox())!.width).toBeGreaterThan(250);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "작품 페이지" }),
  ).toContainText("2 / 19");
  await page.keyboard.press("Escape");
  await expect(page.locator(".source-video-grid a")).toHaveCount(6);
  await expect(page.locator("iframe")).toHaveCount(0);
  const broken = await page
    .locator("[data-work-card] img")
    .evaluateAll(
      (images) =>
        images.filter(
          (i) =>
            !(i as HTMLImageElement).complete ||
            (i as HTMLImageElement).naturalWidth === 0,
        ).length,
    );
  expect(broken).toBe(0);
});
test("unknown dates stay unknown in the timeline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /연도 미상/ }).click();
  await expect(page.locator("[data-work-card]")).toHaveCount(4);
});
