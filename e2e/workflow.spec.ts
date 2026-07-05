import { test, expect } from "@playwright/test";

test.describe("E2E: contact → deal → pipeline → won", () => {
  test("full sales workflow", async ({ page }) => {
    // 1. Navigate to dashboard
    await page.goto("/dashboard");

    // 2. Go to contacts
    await page.click("a[href='/dashboard/contacts']");
    await page.waitForURL("**/dashboard/contacts");

    // 3. Click Add Contact
    await page.click("text=Add Contact");

    // 4. Fill contact form
    const contactName = `E2E Test Contact ${Date.now()}`;
    await page.fill('input[name="name"]', contactName);
    await page.fill('input[name="email"]', `e2e-${Date.now()}@test.com`);
    await page.fill('input[name="company"]', "E2E Corp");

    // 5. Submit contact form
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/contacts/**");

    // 6. Navigate to pipeline
    await page.click("a[href='/dashboard/pipeline']");
    await page.waitForURL("**/dashboard/pipeline");

    // 7. Add new deal
    await page.click("text=New Deal");
    await page.waitForURL("**/dashboard/pipeline/deals/new");

    // 8. Fill deal form
    await page.fill('input[name="title"]', "E2E Test Deal");
    await page.fill('input[name="value"]', "10000");
    await page.fill('input[name="probability"]', "50");

    // Select contact from dropdown
    await page.selectOption('select[name="contact_id"]', { label: contactName });

    // Submit deal form
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/pipeline/**/board");

    // 9. Verify deal card appears on kanban board
    const dealCard = page.locator("text=E2E Test Deal");
    await expect(dealCard).toBeVisible({ timeout: 5000 });

    // 10. Click on deal card to view detail
    await dealCard.click();
    await page.waitForURL("**/dashboard/pipeline/deals/**");

    // 11. Mark deal as won
    await page.click("text=Mark Won");
    await page.waitForTimeout(500);

    // 12. Verify status changed to won
    await expect(page.locator("text=won")).toBeVisible({ timeout: 3000 });
  });
});
