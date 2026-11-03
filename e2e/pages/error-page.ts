import type { Page } from '@playwright/test';
export class ErrorPage {
  constructor(private page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: 'Something happened', exact: false }); }
  get body() { return this.page.locator('.xd-container'); }
  async missingPage() { return this.page.goto('/e2e-page-that-does-not-exist'); }
  async missingOwner() { return this.page.goto('/owners/2147483647'); }
  async missingPetVisit() { return this.page.goto('/owners/1/pets/2147483647/visits/new'); }
  async missingPetEdit() { return this.page.goto('/owners/1/pets/2147483647/edit'); }
  async malformedId() { return this.page.goto('/owners/not-an-integer'); }
}
