import { test, expect } from "@playwright/test";

test("exhibition is silent, filterable and keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "JIAN’S UNIVERSE" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "사운드 켜기", exact: true }),
  ).toBeVisible();
  expect(await page.locator("audio[autoplay], video[autoplay]").count()).toBe(
    0,
  );
  await page.getByRole("button", { name: "문학", exact: true }).click();
  await expect(page.locator("[data-work-card]")).toHaveCount(2);
  const card = page.locator("[data-work-card]").first();
  await card.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(card).toBeFocused();
});
test("saved settings never autoplay and survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "감상 설정" }).click();
  await page.getByLabel("모션 최소화").check();
  await page.getByLabel("볼륨").fill("0.6");
  await page.reload();
  await expect(page.locator(".universe")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "사운드 켜기", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "감상 설정" }).click();
  await expect(page.getByLabel("볼륨")).toHaveValue("0.6");
});
test("constellation and reduced motion retain the ordinary list", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "별자리 보기" }).click();
  await expect(page.getByLabel("작품 별자리")).toBeVisible();
  await expect(page.locator("[data-work-card]")).toHaveCount(9);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("repository management opens GitHub editing without requiring a database", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "GitHub로 작품 관리" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "작품 목록 편집", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://github.com/codersongpro/jian/edit/main/content/works.json",
  );
  await expect(page.getByRole("link", { name: "작품 본문 편집" })).toHaveCount(
    9,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "로그인", exact: true }),
  ).toHaveCount(0);
});

test("sound engine is created only by opt-in and stops voices on opt-out", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const probe = { contexts: [] as AudioContext[], active: 0, started: 0 };
    (window as unknown as { soundProbe: typeof probe }).soundProbe = probe;
    window.AudioContext = class extends Native {
      constructor() {
        super();
        probe.contexts.push(this);
      }
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args: Parameters<typeof start>) => {
          probe.active++;
          probe.started++;
          start(...args);
        };
        oscillator.addEventListener("ended", () => probe.active--);
        return oscillator;
      }
    };
  });
  await page.goto("/");
  const count = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            soundProbe: { contexts: AudioContext[]; active: number };
          }
        ).soundProbe.contexts.length,
    );
  expect(await count()).toBe(0);
  await page.getByRole("button", { name: "사운드 켜기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "사운드 끄기", exact: true }),
  ).toBeVisible();
  expect(await count()).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { soundProbe: { active: number } }).soundProbe
            .active,
      ),
    )
    .toBeGreaterThan(0);
  await page.locator("[data-work-card]").first().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "감상 설정" }).click();
  await expect(
    page.getByRole("button", { name: /배경 음악 재개/ }),
  ).toHaveCount(0);
  const started = () =>
    page.evaluate(
      () =>
        (window as unknown as { soundProbe: { started: number } }).soundProbe
          .started,
    );
  const beforeVolume = await started();
  await page.getByLabel("볼륨").fill("0.6");
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(await started()).toBe(beforeVolume);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { soundProbe: { active: number } }).soundProbe
            .active,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "사운드 끄기", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { soundProbe: { active: number } }).soundProbe
            .active,
      ),
    )
    .toBe(0);
  await page.reload();
  expect(await count()).toBe(0);
});
