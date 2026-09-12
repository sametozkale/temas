import { expect, test } from "@playwright/test";

test("invalid booking token shows not-found copy", async ({ page }) => {
  await page.goto("/b/not-a-real-token");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Link not found",
  );
  await expect(
    page.getByText("This booking page is unpublished, expired or invalid."),
  ).toBeVisible();
});

test("invalid form token shows not-found copy", async ({ page }) => {
  await page.goto("/f/not-a-real-token");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Form not found",
  );
});

test("invalid owner token shows not-found copy", async ({ page }) => {
  await page.goto("/o/not-a-real-token");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Link not found",
  );
});
