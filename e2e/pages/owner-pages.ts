import { type Page, type Locator } from '@playwright/test';
import { Pagination } from './pagination';

export interface OwnerData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  telephone: string;
}

export function ownerData(suffix: string): OwnerData {
  return { firstName: 'E2E', lastName: `Owner${suffix}`.slice(0, 30), address: '42 Test Street', city: 'Test City', telephone: '0123456789' };
}

export class OwnerSearchPage {
  readonly heading: Locator;
  readonly lastName: Locator;
  readonly errors: Locator;
  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Find Owners', exact: true });
    // Search label lacks for attribute; use its stable bound field name.
    this.lastName = page.locator('input[name="lastName"]');
    this.errors = page.locator('#lastNameGroup .help-inline');
  }
  async open() { await this.page.goto('/owners/find'); }
  async enterLastName(value: string) { await this.lastName.fill(value); }
  async findOwners() { await this.page.getByRole('button', { name: 'Find Owner', exact: true }).click(); }
  async addOwner() { await this.page.getByRole('link', { name: 'Add Owner', exact: true }).click(); }
}

export class OwnerListPage {
  readonly heading: Locator;
  readonly rows: Locator;
  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Owners', exact: true });
    this.rows = page.locator('#owners tbody tr');
  }
  async open(query = '') { await this.page.goto(`/owners${query}`); }
  async turnPage(control: 'First' | 'Previous' | 'Next' | 'Last' | string) {
    await new Pagination(this.page).turnPage(control);
  }
  async openFirstOwner() { await this.rows.first().getByRole('link').click(); }
  url() { return this.page.url(); }
  async names() { return this.rows.allTextContents(); }
}

export class OwnerFormPage {
  readonly heading: Locator;
  readonly errors: Locator;
  readonly fields: Record<keyof OwnerData, Locator>;
  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Owner', exact: true });
    this.errors = page.locator('#add-owner-form .help-inline');
    this.fields = {
      firstName: page.getByLabel('First Name', { exact: true }),
      lastName: page.getByLabel('Last Name', { exact: true }),
      address: page.getByLabel('Address', { exact: true }),
      city: page.getByLabel('City', { exact: true }),
      telephone: page.getByLabel('Telephone', { exact: true }),
    };
  }
  async openNew() { await this.page.goto('/owners/new'); }
  async enterOwner(data: OwnerData) { for (const key of Object.keys(this.fields) as (keyof OwnerData)[]) await this.fields[key].fill(data[key]); }
  async complete(data: OwnerData) { await this.enterOwner(data); }
  async submit() { await this.page.getByRole('button', { name: /^(Add|Update) Owner$/ }).click(); }
  fieldError(field: keyof OwnerData) { return this.page.locator(`.form-group:has(input[name="${field}"]) > .col-sm-10 > .help-inline`); }
}

export class OwnerDetailsPage {
  readonly heading: Locator;
  readonly ownerTable: Locator;
  readonly errorHeading: Locator;
  readonly message: Locator;
  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Owner Information', exact: true });
    this.ownerTable = page.locator('table').first();
    this.errorHeading = page.getByRole('heading', { name: 'Something happened...', exact: true });
    this.message = page.locator('#success-message');
  }
  async open(id: number | string) { await this.page.goto(`/owners/${id}`); }
  async openEdit() { await this.page.getByRole('link', { name: 'Edit Owner', exact: true }).click(); }
  async addPet() { await this.page.getByRole('link', { name: 'Add New Pet', exact: true }).click(); }
  ownerId() { const segment = new URL(this.page.url()).pathname.split('/')[2];
    const id = Number(segment.split(';')[0]);
    if (!Number.isInteger(id)) throw new Error(`Owner ID missing in ${this.page.url()}`);
    return id; }
}
