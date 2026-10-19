import { test, expect } from "@playwright/test";

// 브라우저가 자동 재생을 허용하는 경우(재방문·사이트 안 이동 등)를 흉내 냅니다.
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  },
});
test("background music plays from the start without any interaction", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const probe = { active: 0 };
    (window as unknown as { soundProbe: typeof probe }).soundProbe = probe;
    window.AudioContext = class extends Native {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args: Parameters<typeof start>) => {
          probe.active++;
          start(...args);
        };
        oscillator.addEventListener("ended", () => probe.active--);
        return oscillator;
      }
    };
  });
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { soundProbe: { active: number } }).soundProbe
            .active,
      ),
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "배경 음악 끄기", exact: true }),
  ).toBeVisible();
});
