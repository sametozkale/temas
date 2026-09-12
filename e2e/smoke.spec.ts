import { expect, test } from "@playwright/test";

import {
  mailpitAvailable,
  readSeed,
  signInViaMagicLink,
  waitForMailpitOtp,
} from "./helpers";

const seed = readSeed();

test.describe("public booking smoke", () => {
  test.skip(!seed?.bookingToken, "Run `npm run seed` first (e2e/.seed.json).");

  test("booking page shows title and slot chips", async ({ page }) => {
    await page.goto(`/b/${seed!.bookingToken}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Kadıköy sea-view 2+1",
    );
    await expect(page.locator("button.rounded-full").first()).toBeVisible();
  });

  test("OTP booking reaches confirmation", async ({ page }) => {
    test.skip(!(await mailpitAvailable()), "Mailpit is not running.");
    const email = `e2e.${Date.now()}@havn.test`;
    await page.goto(`/b/${seed!.bookingToken}`);
    await page.locator("button.rounded-full").first().click();
    await page.getByLabel("Full name").fill("E2E Visitor");
    await page.getByLabel("Email").fill(email);
    const sentAt = Date.now();
    await page.getByRole("button", { name: "Send confirmation code" }).click();
    await expect(
      page.getByRole("heading", { name: "Enter the code we emailed you" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    const code = await waitForMailpitOtp(email, sentAt);
    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Confirm viewing" }).click();
    await expect(page).toHaveURL(/\/b\/c\//, { timeout: 20_000 });
  });
});

test.describe("signed-in shell", () => {
  test.skip(
    !seed?.email || !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Seed email and service role are required.",
  );

  test("home and properties load after magic-link sign-in", async ({
    page,
  }) => {
    await signInViaMagicLink(page, seed!.email, "/home");
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/properties");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
