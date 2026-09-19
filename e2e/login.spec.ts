import { expect, test } from "@playwright/test";

test("login page heading and invalid email", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to Temas" }),
  ).toBeVisible();

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByLabel("Email")).toHaveJSProperty(
    "validity.valid",
    false,
  );
});
