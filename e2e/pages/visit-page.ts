import { type Page } from '@playwright/test';

export class VisitPage {
  constructor(private readonly page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: 'New Visit' }); }
  get date() { return this.page.getByLabel('Date', { exact: true }); }
  get description() { return this.page.getByLabel('Description', { exact: true }); }
  get errors() { return this.page.locator('.help-inline'); }
  fieldError(field: string) { return this.page.locator(`.form-group:has(input[name="${field}"]) > .col-sm-10 > .help-inline`); }
  async enterVisit(date: string, description: string) {
    await this.date.fill(date);
    await this.description.fill(description);
  }
  async submit() { await this.page.getByRole('button', { name: 'Add Visit', exact: true }).click(); }
  async submitForServerValidation() {
    await this.page.locator('form').evaluate((form: HTMLFormElement) => { form.noValidate = true; });
    await this.submit();
  }
  async dateIsRangeUnderflow() { return this.date.evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow); }
  async minimumDate() { return this.date.getAttribute('min'); }
}
