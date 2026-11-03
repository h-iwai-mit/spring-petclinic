import { type Page } from '@playwright/test';

export interface PetData { name: string; birthDate: string; type: string }
export class PetFormPage {
  constructor(private readonly page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: /^(New )?Pet$/ }); }
  get name() { return this.page.getByLabel('Name', { exact: true }); }
  get birthDate() { return this.page.getByLabel('Birth Date', { exact: true }); }
  get type() { return this.page.getByLabel('Type', { exact: true }); }
  get errors() { return this.page.locator('.help-inline'); }
  fieldError(field: string) { return this.page.locator(`.form-group:has(input[name="${field}"]) > .col-sm-10 > .help-inline`); }
  async enterPet(data: PetData) {
    await this.name.fill(data.name);
    await this.birthDate.fill(data.birthDate);
    await this.type.selectOption({ label: data.type });
  }
  async chooseType(type: string) { await this.type.selectOption({ label: type }); }
  async submit() { await this.page.getByRole('button', { name: /^(Add|Update) Pet$/ }).click(); }
}

export class PetDetailsComponent {
  constructor(private readonly page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: 'Owner Information' }); }
  get pets() { return this.page.locator('dl.dl-horizontal'); }
  get message() { return this.page.locator('#success-message'); }
  pet(name: string) { return this.pets.filter({ has: this.page.locator('dd', { hasText: new RegExp(`^${name}$`) }) }); }
  private petRow(name: string) { return this.page.locator('tr').filter({ has: this.pet(name) }); }
  async addPet() { await this.page.getByRole('link', { name: 'Add New Pet', exact: true }).click(); }
  async editPet(name: string) { await this.petRow(name).getByRole('link', { name: 'Edit Pet', exact: true }).click(); }
  async addVisit(name: string) { await this.petRow(name).getByRole('link', { name: 'Add Visit', exact: true }).click(); }
  visit(description: string) { return this.page.getByRole('cell', { name: description, exact: true }); }
}
