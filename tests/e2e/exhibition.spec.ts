import { test, expect } from "@playwright/test";

test("exhibition has no media autoplay, filters and is keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "JIAN’S UNIVERSE" }),
  ).toBeVisible();
  // 배경 음악은 기본 ON(첫 상호작용 때 시작), 작품 미디어는 자동 재생하지 않음
  await expect(
    page.getByRole("button", { name: "사운드 끄기", exact: true }),
  ).toBeVisible();
  expect(await page.locator("audio[autoplay], video[autoplay]").count()).toBe(
    0,
  );
  await page.getByRole("button", { name: "문학", exact: true }).click();
  await expect(page.locator("[data-work-card]")).toHaveCount(4);
  const card = page.locator("[data-work-card]").first();
  await card.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(card).toBeFocused();
});
test("saved settings survive a reload", async ({ page }) => {
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
    page.getByRole("button", { name: "사운드 끄기", exact: true }),
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
  await expect(page.locator("[data-work-card]")).toHaveCount(17);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("background music starts on first interaction and stays off once turned off", async ({
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
  // 브라우저 정책상 사용자 동작 전에는 소리 엔진을 만들지 않음
  expect(await count()).toBe(0);
  await page.getByRole("heading", { name: "JIAN’S UNIVERSE" }).click();
  await expect(
    page.getByRole("button", { name: "배경 음악 끄기", exact: true }),
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
  // 볼륨을 바꿔도 곡을 처음부터 다시 틀지 않음(재시작이면 첫 마디 23개 이상이 한꺼번에 시작).
  // 배경 음악은 8초마다 다음 마디를 예약하므로 그 사이 일부 음이 시작될 수는 있습니다.
  expect((await started()) - beforeVolume).toBeLessThan(20);
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
  // 끈 상태는 다음 방문에도 유지되어, 화면을 눌러도 소리가 나지 않음
  await page.reload();
  await expect(
    page.getByRole("button", { name: "사운드 켜기", exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "JIAN’S UNIVERSE" }).click();
  expect(await count()).toBe(0);
  // 배경 음악 버튼으로 다시 켤 수 있음
  await page
    .getByRole("button", { name: "배경 음악 켜기", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "배경 음악 끄기", exact: true }),
  ).toBeVisible();
  expect(await count()).toBe(1);
});
