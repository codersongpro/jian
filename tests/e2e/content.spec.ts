import { test, expect } from "@playwright/test";
test("actual source works retain transcriptions, pages, dates and six unembedded videos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".review-banner")).toHaveCount(0);
  await expect(page.locator("[data-work-card]")).toHaveCount(18);
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
  // 카드 이미지는 화면에 들어올 때 불러오므로(지연 로딩) 하나씩 화면에 보이게 한 뒤 확인
  const images = page.locator("[data-work-card] img");
  for (let i = 0; i < (await images.count()); i++) {
    await images.nth(i).scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        images.nth(i).evaluate((image) => (image as HTMLImageElement).complete),
      )
      .toBe(true);
  }
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
  await expect(page.locator("[data-work-card]")).toHaveCount(13);
});
