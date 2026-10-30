import { test, expect } from "@playwright/test";

test.describe("E2E: contact → deal → pipeline → won", () => {
  test("full sales workflow", async ({ page }) => {
    await page.goto("/dashboard");

    await page.click("a[href='/dashboard/contacts']");
    await page.waitForURL("**/dashboard/contacts");

    await page.click("text=Add Contact");

    const contactName = `E2E Test Contact ${Date.now()}`;
    await page.fill('input[name="name"]', contactName);
    await page.fill('input[name="email"]', `e2e-${Date.now()}@test.com`);
    await page.fill('input[name="company"]', "E2E Corp");

    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/contacts/**");

    await page.click("a[href='/dashboard/pipeline']");
    await page.waitForURL("**/dashboard/pipeline");

    await page.click("text=New Deal");
    await page.waitForURL("**/dashboard/pipeline/deals/new");

    await page.fill('input[name="title"]', "E2E Test Deal");
    await page.fill('input[name="value"]', "10000");
    await page.fill('input[name="probability"]', "50");

    // Select contact from dropdown
    await page.selectOption('select[name="contact_id"]', { label: contactName });

    // Submit deal form
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/pipeline/**/board");

    const dealCard = page.locator("text=E2E Test Deal");
    await expect(dealCard).toBeVisible({ timeout: 5000 });

    await dealCard.click();
    await page.waitForURL("**/dashboard/pipeline/deals/**");

    await page.click("text=Mark Won");
    await page.waitForTimeout(500);

    await expect(page.locator("text=won")).toBeVisible({ timeout: 3000 });
  });
});
