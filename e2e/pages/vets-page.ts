import type { Page } from '@playwright/test';
import { Pagination } from './pagination';
export class VetsPage {
  constructor(private page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: 'Veterinarians', exact: true }); }
  get rows() { return this.page.locator('#vets tbody tr'); }
  get firstDisabled() { return new Pagination(this.page).firstDisabled; }
  get lastDisabled() { return new Pagination(this.page).lastDisabled; }
  async open(query = '') { await this.page.goto(`/vets.html${query}`); }
  async numbered() { await new Pagination(this.page).turnPage('2'); }
  async first() { await new Pagination(this.page).turnPage('First'); }
  async previous() { await new Pagination(this.page).turnPage('Previous'); }
  async next() { await new Pagination(this.page).turnPage('Next'); }
  async last() { await new Pagination(this.page).turnPage('Last'); }
}
