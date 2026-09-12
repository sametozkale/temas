import { expect, test } from "@playwright/test";

import {
  deleteE2EUser,
  mailpitAvailable,
  provisionE2EUser,
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

test.describe("signup to public booking", () => {
  test("agent onboards, publishes availability, visitor books", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Supabase service role is required.",
    );
    test.skip(!(await mailpitAvailable()), "Mailpit is not running.");

    const stamp = Date.now();
    const email = `e2e.agent.${stamp}@havn.test`;
    const title = `E2E Loft ${stamp}`;
    let userId: string | undefined;

    try {
      userId = await provisionE2EUser(email);
      await signInViaMagicLink(page, email, "/home");
      await expect(page).toHaveURL(/\/onboarding/);
      await page.getByLabel("Full name").fill("E2E Agent");
      await page.getByLabel("Workspace name").fill(`E2E Agency ${stamp}`);
      await page.getByRole("button", { name: "Get started" }).click();
      await page.waitForURL(/\/home/, { timeout: 20_000 });

      await page.goto("/properties/new");
      await page.getByLabel("Title").fill(title);
      await page.getByRole("button", { name: "Create property" }).click();
      await page.waitForURL(/\/properties\/.+\/edit/, { timeout: 20_000 });
      const propertyId = page.url().match(/\/properties\/([^/]+)\/edit/)?.[1];
      expect(propertyId).toBeTruthy();

      await page.goto(`/properties/${propertyId}/viewings`);
      await page.getByRole("button", { name: "Create calendar" }).click();
      await expect(page.getByRole("switch", { name: "Published" })).toBeVisible(
        { timeout: 15_000 },
      );

      await page.getByRole("switch", { name: "Mon" }).click();
      await page.getByRole("button", { name: "Save windows" }).click();
      await expect(page.getByText("Availability saved")).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("switch", { name: "Published" }).click();
      await expect(page.getByRole("switch", { name: "Published" })).toBeChecked(
        { timeout: 15_000 },
      );

      const publicHref = await page
        .getByText(/\/b\/[A-Za-z0-9_-]+/)
        .textContent();
      const bookingPath = publicHref?.match(/\/b\/[A-Za-z0-9_-]+/)?.[0];
      expect(bookingPath).toBeTruthy();

      await expect
        .poll(
          async () => {
            await page.goto(`/properties/${propertyId}/viewings`);
            return page
              .getByText("No open slots in the horizon yet")
              .isVisible();
          },
          { timeout: 20_000, intervals: [1_000, 2_000, 2_000] },
        )
        .toBe(false);

      await page.goto(bookingPath!);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        title,
      );
      await expect(page.locator("button.rounded-full").first()).toBeVisible({
        timeout: 15_000,
      });

      const visitor = `e2e.visitor.${stamp}@havn.test`;
      await page.locator("button.rounded-full").first().click();
      await page.getByLabel("Full name").fill("E2E Visitor");
      await page.getByLabel("Email").fill(visitor);
      const sentAt = Date.now();
      await page
        .getByRole("button", { name: "Send confirmation code" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Enter the code we emailed you" }),
      ).toBeVisible({ timeout: 15_000 });
      const code = await waitForMailpitOtp(visitor, sentAt);
      await page.getByLabel("6-digit code").fill(code);
      await page.getByRole("button", { name: "Confirm viewing" }).click();
      await expect(page).toHaveURL(/\/b\/c\//, { timeout: 20_000 });
    } finally {
      if (userId) await deleteE2EUser(userId);
    }
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
