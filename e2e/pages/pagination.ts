import type { Page } from '@playwright/test';

/** Shared owner/veterinarian pagination, including disabled boundary controls. */
export class Pagination {
  constructor(private readonly page: Page) {}
  get firstDisabled() { return this.page.locator('span[title="First"]'); }
  get lastDisabled() { return this.page.locator('span[title="Last"]'); }
  async turnPage(control: string) {
    if (/^\d+$/.test(control)) {
      await this.page.getByRole('link', { name: control, exact: true }).click();
    } else {
      await this.page.locator('a').and(this.page.getByTitle(control, { exact: true })).click();
    }
  }
}
