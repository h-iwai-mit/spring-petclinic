import type { Page } from '@playwright/test';
export class Navigation {
  constructor(private page: Page) {}
  get menu() { return this.page.locator('#main-navbar'); }
  get homeLink() { return this.page.getByTitle('home page', { exact: true }); }
  async home() { await this.homeLink.click(); }
  async brandHome() { await this.page.locator('a.navbar-brand').click(); }
  async owners() { await this.page.getByTitle('find owners', { exact: true }).click(); }
  async vets() { await this.page.getByTitle('veterinarians', { exact: true }).click(); }
  async error() { await this.page.getByTitle('trigger a RuntimeException to see how it is handled', { exact: true }).click(); }
  async mobileViewport() { await this.page.setViewportSize({ width: 390, height: 844 }); }
  async toggleMenu() {
    // Bootstrap ignores a second toggle during its CSS transition.
    const settled = this.page.locator('#main-navbar:not(.collapsing)');
    await settled.waitFor({ state: 'attached' });
    await this.page.locator('button.navbar-toggler').click();
    await settled.waitFor({ state: 'attached' });
  }
  async expireFlash() { await this.page.locator('#success-message').waitFor({ state: 'hidden' }); }
}
export class HomePage {
  constructor(private page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: 'Welcome', exact: true }); }
  async open() { await this.page.goto('/'); }
}
