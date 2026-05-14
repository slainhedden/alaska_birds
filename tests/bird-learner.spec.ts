import { expect, test, type Page } from "@playwright/test";

async function setSearch(page: Page, value: string) {
  await page.getByTestId("bird-search").evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function setSelect(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const select = element as HTMLSelectElement;
    select.value = nextValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("validates the bird learning app core flows", async ({ page }) => {
  await page.goto("/");

  await test.step("home page loads and bird cards render", async () => {
    await expect(page.getByRole("heading", { name: "Birds" })).toBeVisible();
    await expect(page.getByTestId("result-count")).toContainText("83 of 83 birds");
    await expect(page.getByTestId("bird-card")).toHaveCount(83);
    await expect(page.getByTestId("bird-card-image")).toHaveCount(83);
    await expect(page.getByTestId("audio-available")).toHaveCount(83);
    await expect(page.getByTestId("bird-card").filter({ hasText: "Common Raven" })).toBeVisible();

    const firstCardImage = page.getByTestId("bird-card-image").first();
    await expect
      .poll(async () => firstCardImage.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    const firstImageState = await firstCardImage.evaluate((element) => {
      const image = element as HTMLImageElement;
      return {
        naturalWidth: image.naturalWidth,
        src: image.currentSrc,
      };
    });

    expect(firstImageState.src).toContain("/images/birds/");
    expect(firstImageState.naturalWidth).toBeGreaterThan(0);
  });

  await test.step("search, filters, and bird detail work", async () => {
    await setSearch(page, "black scarf");
    await expect(page.getByTestId("result-count")).toContainText("1 of 83 birds");
    await expect(page.getByTestId("bird-card").filter({ hasText: "Varied Thrush" })).toBeVisible();

    await setSearch(page, "");
    await setSelect(page, "likelihood-filter", "uncommon");
    await expect(page.getByTestId("bird-card").filter({ hasText: "Trumpeter Swan" })).toBeVisible();

    await setSelect(page, "likelihood-filter", "all");
    await setSelect(page, "habitat-filter", "river");
    await expect(page.getByTestId("result-count")).toContainText("of 83 birds");

    await setSearch(page, "raven");
    await page.getByTestId("bird-card").first().click();
    await expect(page.getByTestId("bird-detail")).toContainText("Common Raven");
    await expect(page.getByTestId("image-gallery")).toBeVisible();
    await expect(page.getByTestId("bird-detail")).toContainText("kronk");

    await setSearch(page, "");
    await setSelect(page, "habitat-filter", "all");
  });

  await test.step("flashcard mode reveals and advances", async () => {
    await page.getByTestId("mode-flashcards").click();
    await expect(page.getByTestId("flashcard-panel")).toBeVisible();
    await expect(page.getByText("Card 1 of 83")).toBeVisible();
    await page.locator(".flashcard").click();
    await expect(page.locator(".flashcard-answer strong", { hasText: "Common Raven" })).toBeVisible();
    await page.getByTestId("flashcard-next").click();
    await expect(page.getByText("Card 2 of 83")).toBeVisible();
  });

  await test.step("quiz mode answers questions", async () => {
    await page.getByTestId("mode-quiz").click();
    await expect(page.getByTestId("quiz-panel")).toBeVisible();
    await expect(page.locator('[data-testid="quiz-choice"] .choice-thumb')).toHaveCount(0);
    await page.getByTestId("quiz-choice").first().click();
    await expect(page.getByTestId("quiz-result")).toBeVisible();
    await expect(page.getByTestId("quiz-next")).toBeEnabled();
  });

  await test.step("sound quiz uses local audio and call-clue practice", async () => {
    await page.getByTestId("mode-sound").click();
    await expect(page.getByTestId("sound-quiz-panel")).toBeVisible();
    await expect(page.getByTestId("sound-audio")).toBeVisible();
    await expect(page.locator('[data-testid="sound-choice"] .choice-thumb')).toHaveCount(0);
    await page.getByTestId("sound-choice").first().click();
    await expect(page.getByTestId("sound-result")).toBeVisible();

    await page.getByTestId("sound-clue-mode").click();
    await expect(page.getByTestId("sound-audio")).toBeVisible();
    await expect(page.getByText("Embedded audio ready.")).toBeVisible();
  });

  await test.step("mobile viewport remains usable", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Browse" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cards" }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Quiz" }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Sounds" }).filter({ visible: true })).toHaveCount(1);
    await page.getByTestId("mode-browse").click();
    await page.getByTestId("bird-card").filter({ hasText: "Common Raven" }).click();
    const mobileDetail = page.getByTestId("mobile-detail-sheet");
    await expect(mobileDetail).toBeVisible();
    await expect(mobileDetail).toContainText("Common Raven");

    const mobileDetailImage = mobileDetail.getByTestId("detail-primary-image");
    await expect
      .poll(async () => mobileDetailImage.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    const mobileImageState = await mobileDetailImage.evaluate((element) => {
      const image = element as HTMLImageElement;
      return {
        naturalWidth: image.naturalWidth,
        src: image.currentSrc,
      };
    });

    expect(mobileImageState.src).toContain("/images/birds/");
    expect(mobileImageState.naturalWidth).toBeGreaterThan(0);

    const mobileSheetTop = await mobileDetail.evaluate((element) => {
      return element.getBoundingClientRect().top;
    });
    expect(mobileSheetTop).toBeLessThan(80);

    await page.getByTestId("close-mobile-detail").click();
    await expect(page.getByTestId("mobile-detail-sheet")).toBeHidden();

    await page.getByTestId("mode-sound").click();
    await expect(page.getByTestId("sound-quiz-panel")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
