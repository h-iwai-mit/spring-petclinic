import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { OwnerSearchPage, OwnerListPage, OwnerFormPage, OwnerDetailsPage, ownerData } from '../pages/owner-pages';

test('E2E-001 Search a single owner', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-001', 'E2E-001-01', "Open owner search", async () => { await search.open(); });
  await evidence.assert('E2E-001', 'E2E-001-01', "Search form is visible", async () => { await expect(search.heading).toBeVisible(); });
  await evidence.step('E2E-001', 'E2E-001-02', "Enter last name", async () => { await search.enterLastName("Franklin"); });
  await evidence.assert('E2E-001', 'E2E-001-02', "Entered query is retained", async () => { await expect(search.lastName).toHaveValue("Franklin"); });
  await evidence.step('E2E-001', 'E2E-001-03', "Find owners", async () => { await search.findOwners(); });
  await evidence.assert('E2E-001', 'E2E-001-03', "George Franklin owner detail is shown", async () => { await expect(detail.heading).toBeVisible(); await expect(detail.ownerTable).toContainText("George Franklin"); });
});

test('E2E-002 Search all owners with empty query', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-002', 'E2E-002-01', "Open owner search", async () => { await search.open(); });
  await evidence.assert('E2E-002', 'E2E-002-01', "Search form is visible", async () => { await expect(search.heading).toBeVisible(); });
  await evidence.step('E2E-002', 'E2E-002-02', "Enter last name", async () => { await search.enterLastName(""); });
  await evidence.assert('E2E-002', 'E2E-002-02', "Entered query is retained", async () => { await expect(search.lastName).toHaveValue(""); });
  await evidence.step('E2E-002', 'E2E-002-03', "Find owners", async () => { await search.findOwners(); });
  await evidence.assert('E2E-002', 'E2E-002-03', "Owner list contains five rows", async () => { await expect(list.heading).toBeVisible(); await expect(list.rows).toHaveCount(5); });
});

test('E2E-003 Search owners with multiple matches', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-003', 'E2E-003-01', "Open owner search", async () => { await search.open(); });
  await evidence.assert('E2E-003', 'E2E-003-01', "Search form is visible", async () => { await expect(search.heading).toBeVisible(); });
  await evidence.step('E2E-003', 'E2E-003-02', "Enter last name", async () => { await search.enterLastName("Davis"); });
  await evidence.assert('E2E-003', 'E2E-003-02', "Entered query is retained", async () => { await expect(search.lastName).toHaveValue("Davis"); });
  await evidence.step('E2E-003', 'E2E-003-03', "Find owners", async () => { await search.findOwners(); });
  await evidence.assert('E2E-003', 'E2E-003-03', "Owners list contains Betty and Harold Davis", async () => { await expect(list.rows).toHaveCount(2); await expect(list.rows).toContainText(["Betty Davis", "Harold Davis"]); });
});

test('E2E-004 Search with no matches', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-004', 'E2E-004-01', "Open owner search", async () => { await search.open(); });
  await evidence.assert('E2E-004', 'E2E-004-01', "Search form is visible", async () => { await expect(search.heading).toBeVisible(); });
  await evidence.step('E2E-004', 'E2E-004-02', "Enter last name", async () => { await search.enterLastName("NoSuchOwnerUnfindable"); });
  await evidence.assert('E2E-004', 'E2E-004-02', "Entered query is retained", async () => { await expect(search.lastName).toHaveValue("NoSuchOwnerUnfindable"); });
  await evidence.step('E2E-004', 'E2E-004-03', "Find owners", async () => { await search.findOwners(); });
  await evidence.assert('E2E-004', 'E2E-004-03', "Not found error is shown", async () => { await expect(search.heading).toBeVisible(); await expect(search.errors).toContainText("has not been found"); });
});

test('E2E-005 Trim whitespace around search query', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-005', 'E2E-005-01', "Open owner search", async () => { await search.open(); });
  await evidence.assert('E2E-005', 'E2E-005-01', "Search form is visible", async () => { await expect(search.heading).toBeVisible(); });
  await evidence.step('E2E-005', 'E2E-005-02', "Enter last name", async () => { await search.enterLastName("  Franklin  "); });
  await evidence.assert('E2E-005', 'E2E-005-02', "Entered query is retained", async () => { await expect(search.lastName).toHaveValue("  Franklin  "); });
  await evidence.step('E2E-005', 'E2E-005-03', "Find owners", async () => { await search.findOwners(); });
  await evidence.assert('E2E-005', 'E2E-005-03', "Franklin owner detail is shown after trimming", async () => { await expect(detail.ownerTable).toContainText("George Franklin"); });
});

test('E2E-006 Parameterless owner list and owner detail link', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-006', 'E2E-006-01', "Open parameterless owners route", async () => { await list.open(); });
  await evidence.assert('E2E-006', 'E2E-006-01', "Five owner rows appear", async () => { await expect(list.rows).toHaveCount(5); });
  await evidence.step('E2E-006', 'E2E-006-02', "Open first owner from result link", async () => { await list.openFirstOwner(); });
  await evidence.assert('E2E-006', 'E2E-006-02', "Owner Information is visible", async () => { await expect(detail.heading).toBeVisible(); });
});

test('E2E-007 Use all owner pagination controls', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-007', 'E2E-007-01', "Open owner list", async () => { await list.open(); });
  await evidence.assert('E2E-007', 'E2E-007-01', "First page has five rows", async () => { await expect(list.rows).toHaveCount(5); });
  const initialNames = await list.names();
  await evidence.step('E2E-007', 'E2E-007-02', "Go to next owner page", async () => { await list.turnPage("Next"); });
  await evidence.assert('E2E-007', 'E2E-007-02', "Second page shows different owners", async () => { await expect(list.url()).toContain("page=2"); await expect(await list.names()).not.toEqual(initialNames); });
  await evidence.step('E2E-007', 'E2E-007-03', "Go to previous owner page", async () => { await list.turnPage("Previous"); });
  await evidence.assert('E2E-007', 'E2E-007-03', "First page rows restored", async () => { await expect(list.url()).toContain("page=1"); await expect(await list.names()).toEqual(initialNames); });
  await evidence.step('E2E-007', 'E2E-007-04', "Go to last owner page", async () => { await list.turnPage("Last"); });
  await evidence.assert('E2E-007', 'E2E-007-04', "Last page contains one to five owners", async () => { await expect(list.url()).toMatch(/page=\d+/); await expect(await list.rows.count()).toBeGreaterThan(0); await expect(await list.rows.count()).toBeLessThanOrEqual(5); });
  await evidence.step('E2E-007', 'E2E-007-05', "Go to first owner page", async () => { await list.turnPage("First"); });
  await evidence.assert('E2E-007', 'E2E-007-05', "First page rows restored", async () => { await expect(await list.names()).toEqual(initialNames); });
  await evidence.step('E2E-007', 'E2E-007-06', "Go to numbered owner page", async () => { await list.turnPage("2"); });
  await evidence.assert('E2E-007', 'E2E-007-06', "Numbered second page is shown", async () => { await expect(list.url()).toContain("page=2"); await expect(await list.names()).not.toEqual(initialNames); });
});

test('E2E-008 Redirect invalid owner page 0', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-008', 'E2E-008-01', "Open out-of-range page with a search prefix", async () => { await list.open('?page=0&lastName=Davis'); });
  await evidence.assert('E2E-008', 'E2E-008-01', "Redirect to page one retains surname filter", async () => { await expect(list.url()).toContain("page=1"); await expect(list.url()).toContain("lastName=Davis"); await expect(list.rows).toHaveCount(2); });
});

test('E2E-009 Redirect invalid owner page 99999', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-009', 'E2E-009-01', "Open out-of-range page with a search prefix", async () => { await list.open('?page=99999&lastName=Davis'); });
  await evidence.assert('E2E-009', 'E2E-009-01', "Redirect to page one retains surname filter", async () => { await expect(list.url()).toContain("page=1"); await expect(list.url()).toContain("lastName=Davis"); await expect(list.rows).toHaveCount(2); });
});

test('E2E-010 Create a valid owner', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-010', 'E2E-010-01', "Open owner creation form", async () => { await form.openNew(); });
  await evidence.assert('E2E-010', 'E2E-010-01', "Owner form is visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-010', 'E2E-010-02', "Enter a unique valid owner", async () => { await form.enterOwner(data); });
  await evidence.assert('E2E-010', 'E2E-010-02', "Owner fields contain supplied values", async () => { for (const key of Object.keys(data) as (keyof typeof data)[]) await expect(form.fields[key]).toHaveValue(data[key]); });
  await evidence.step('E2E-010', 'E2E-010-03', "Save the generated owner", async () => { await form.submit(); });
  await evidence.assert('E2E-010', 'E2E-010-03', "Owner detail contains saved owner values", async () => { await expect(detail.heading).toBeVisible(); await expect(detail.ownerTable).toContainText(data.lastName); });
  await evidence.step('E2E-010', 'E2E-010-04', "Reload saved owner detail", async () => { await detail.open(detail.ownerId()); });
  await evidence.assert('E2E-010', 'E2E-010-04', "All owner values persist after reload", async () => { for (const value of Object.values(data)) await expect(detail.ownerTable).toContainText(value); });
});

test('E2E-011 Reject all blank owner fields', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-011', 'E2E-011-01', "Open owner form", async () => { await form.openNew(); });
  await evidence.assert('E2E-011', 'E2E-011-01', "Owner form visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-011', 'E2E-011-02', "Submit blank owner form", async () => { await form.submit(); });
  await evidence.assert('E2E-011', 'E2E-011-02', "All five fields show validation errors", async () => { await expect(form.errors).toHaveCount(5); for (const field of ["firstName","lastName","address","city","telephone"] as const) await expect(form.fieldError(field)).not.toBeEmpty(); });
});

test('E2E-012 Reject alphabetic telephone', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-012', 'E2E-012-01', "Open owner form", async () => { await form.openNew(); });
  await evidence.assert('E2E-012', 'E2E-012-01', "Owner form visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-012', 'E2E-012-02', "Enter alphabetic telephone", async () => { await form.enterOwner({...data, telephone:"abcdefghij"}); });
  await evidence.assert('E2E-012', 'E2E-012-02', "Invalid telephone entered", async () => { await expect(form.fields.telephone).toHaveValue("abcdefghij"); });
  await evidence.step('E2E-012', 'E2E-012-03', "Submit invalid telephone", async () => { await form.submit(); });
  await evidence.assert('E2E-012', 'E2E-012-03', "Telephone error requires ten digits", async () => { await expect(form.fieldError("telephone")).toContainText("10-digit"); });
});

test('E2E-013 Reject short and long telephone numbers', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-013', 'E2E-013-01', "Open owner form", async () => { await form.openNew(); });
  await evidence.assert('E2E-013', 'E2E-013-01', "Owner form visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-013', 'E2E-013-02', "Enter 9 digit telephone", async () => { await form.enterOwner({...data,telephone:'123456789'}); });
  await evidence.assert('E2E-013', 'E2E-013-02', "Telephone value retained", async () => { await expect(form.fields.telephone).toHaveValue('123456789'); });
  await evidence.step('E2E-013', 'E2E-013-03', "Submit 9 digit telephone", async () => { await form.submit(); });
  await evidence.assert('E2E-013', 'E2E-013-03', "Telephone error requires exactly ten digits", async () => { await expect(form.fieldError("telephone")).toContainText("10-digit"); });
  await evidence.step('E2E-013', 'E2E-013-04', "Enter 11 digit telephone", async () => { await form.enterOwner({...data,telephone:'12345678901'}); });
  await evidence.assert('E2E-013', 'E2E-013-04', "Telephone value retained", async () => { await expect(form.fields.telephone).toHaveValue('12345678901'); });
  await evidence.step('E2E-013', 'E2E-013-05', "Submit 11 digit telephone", async () => { await form.submit(); });
  await evidence.assert('E2E-013', 'E2E-013-05', "Telephone error requires exactly ten digits", async () => { await expect(form.fieldError("telephone")).toContainText("10-digit"); });
});

test('E2E-014 Reject oversized owner names address and city', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-014', 'E2E-014-01', "Open owner form", async () => { await form.openNew(); });
  await evidence.assert('E2E-014', 'E2E-014-01', "Owner form visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-014', 'E2E-014-02', "Enter values exceeding each maximum", async () => { await form.enterOwner({...data,firstName:"F".repeat(31),lastName:"L".repeat(31),address:"A".repeat(256),city:"C".repeat(81)}); });
  await evidence.assert('E2E-014', 'E2E-014-02', "Oversized values entered", async () => { await expect(form.fields.firstName).toHaveValue("F".repeat(31)); await expect(form.fields.lastName).toHaveValue("L".repeat(31)); await expect(form.fields.address).toHaveValue("A".repeat(256)); await expect(form.fields.city).toHaveValue("C".repeat(81)); });
  await evidence.step('E2E-014', 'E2E-014-03', "Submit oversized values", async () => { await form.submit(); });
  await evidence.assert('E2E-014', 'E2E-014-03', "All four maximum-length violations are displayed", async () => { await expect(form.errors).toHaveCount(4); for (const field of ["firstName","lastName","address","city"] as const) await expect(form.fieldError(field)).toContainText("size must be between"); });
});

test('E2E-015 Accept exact maximum owner field lengths', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  const boundary = {...data,firstName:"F".repeat(30),lastName:("Boundary"+randomUUID().replaceAll("-", "")).slice(0,30),address:"A".repeat(255),city:"C".repeat(80)};
  await evidence.step('E2E-015', 'E2E-015-01', "Open owner form", async () => { await form.openNew(); });
  await evidence.assert('E2E-015', 'E2E-015-01', "Owner form visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-015', 'E2E-015-02', "Enter maximum valid field lengths", async () => { await form.enterOwner(boundary); });
  await evidence.assert('E2E-015', 'E2E-015-02', "Each input preserves the boundary value", async () => { for (const key of Object.keys(boundary) as (keyof typeof boundary)[]) await expect(form.fields[key]).toHaveValue(boundary[key]); });
  await evidence.step('E2E-015', 'E2E-015-03', "Save boundary length owner", async () => { await form.submit(); });
  await evidence.assert('E2E-015', 'E2E-015-03', "Boundary values persisted", async () => { await expect(detail.heading).toBeVisible(); for (const value of Object.values(boundary)) await expect(detail.ownerTable).toContainText(value); });
});

test('E2E-016 Edit a generated owner and verify persistence', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-016', 'E2E-016-01', "Open owner creation form", async () => { await form.openNew(); });
  await evidence.assert('E2E-016', 'E2E-016-01', "Owner form is visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-016', 'E2E-016-02', "Enter a unique valid owner", async () => { await form.enterOwner(data); });
  await evidence.assert('E2E-016', 'E2E-016-02', "Owner fields contain supplied values", async () => { for (const key of Object.keys(data) as (keyof typeof data)[]) await expect(form.fields[key]).toHaveValue(data[key]); });
  await evidence.step('E2E-016', 'E2E-016-03', "Save the generated owner", async () => { await form.submit(); });
  await evidence.assert('E2E-016', 'E2E-016-03', "Owner detail contains saved owner values", async () => { await expect(detail.heading).toBeVisible(); await expect(detail.ownerTable).toContainText(data.lastName); });
  await evidence.step('E2E-016', 'E2E-016-04', "Open generated owner edit form", async () => { await detail.openEdit(); });
  await evidence.assert('E2E-016', 'E2E-016-04', "Existing values are prefilled", async () => { for (const key of Object.keys(data) as (keyof typeof data)[]) await expect(form.fields[key]).toHaveValue(data[key]); });
  const updated = {...data,firstName:"Updated",address:"99 New Street",city:"New City",telephone:"9876543210"};
  await evidence.step('E2E-016', 'E2E-016-05', "Enter updated owner values", async () => { await form.enterOwner(updated); });
  await evidence.assert('E2E-016', 'E2E-016-05', "Updated values retained", async () => { for (const key of Object.keys(updated) as (keyof typeof updated)[]) await expect(form.fields[key]).toHaveValue(updated[key]); });
  await evidence.step('E2E-016', 'E2E-016-06', "Save owner update", async () => { await form.submit(); });
  await evidence.assert('E2E-016', 'E2E-016-06', "Updated values displayed", async () => { await expect(detail.heading).toBeVisible(); for (const value of Object.values(updated)) await expect(detail.ownerTable).toContainText(value); });
  await evidence.step('E2E-016', 'E2E-016-07', "Reload updated owner", async () => { await detail.open(detail.ownerId()); });
  await evidence.assert('E2E-016', 'E2E-016-07', "Updated values survive reload", async () => { for (const value of Object.values(updated)) await expect(detail.ownerTable).toContainText(value); });
});

test('E2E-017 Reject invalid update without persisting it', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-017', 'E2E-017-01', "Open owner creation form", async () => { await form.openNew(); });
  await evidence.assert('E2E-017', 'E2E-017-01', "Owner form is visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-017', 'E2E-017-02', "Enter a unique valid owner", async () => { await form.enterOwner(data); });
  await evidence.assert('E2E-017', 'E2E-017-02', "Owner fields contain supplied values", async () => { for (const key of Object.keys(data) as (keyof typeof data)[]) await expect(form.fields[key]).toHaveValue(data[key]); });
  await evidence.step('E2E-017', 'E2E-017-03', "Save the generated owner", async () => { await form.submit(); });
  await evidence.assert('E2E-017', 'E2E-017-03', "Owner detail contains saved owner values", async () => { await expect(detail.heading).toBeVisible(); await expect(detail.ownerTable).toContainText(data.lastName); });
  const ownerId = detail.ownerId();
  await evidence.step('E2E-017', 'E2E-017-04', "Open owner edit form", async () => { await detail.openEdit(); });
  await evidence.assert('E2E-017', 'E2E-017-04', "Edit form visible", async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-017', 'E2E-017-05', "Blank every owner field", async () => { await form.enterOwner({firstName:"",lastName:"",address:"",city:"",telephone:""}); });
  await evidence.assert('E2E-017', 'E2E-017-05', "All fields blank", async () => { for (const field of Object.values(form.fields)) await expect(field).toHaveValue(""); });
  await evidence.step('E2E-017', 'E2E-017-06', "Submit invalid update", async () => { await form.submit(); });
  await evidence.assert('E2E-017', 'E2E-017-06', "Every owner field is invalid", async () => { await expect(form.errors).toHaveCount(5); });
  await evidence.step('E2E-017', 'E2E-017-07', "Reload persisted owner", async () => { await detail.open(ownerId); });
  await evidence.assert('E2E-017', 'E2E-017-07', "Original owner values remain saved", async () => { for (const value of Object.values(data)) await expect(detail.ownerTable).toContainText(value); });
});

test('E2E-018 Missing owner renders error screen', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-018', 'E2E-018-01', "Open nonexistent owner", async () => { await detail.open(2147483647); });
  await evidence.assert('E2E-018', 'E2E-018-01', "Error screen displays Something happened", async () => { await expect(detail.errorHeading).toBeVisible(); });
});

test('E2E-019 Open Add Owner link from search', async ({ page, evidence }) => {
  const search = new OwnerSearchPage(page);
  const list = new OwnerListPage(page);
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-019', 'E2E-019-01', "Open owner search", async () => { await search.open(); });
  await evidence.assert('E2E-019', 'E2E-019-01', "Find Owners visible", async () => { await expect(search.heading).toBeVisible(); });
  await evidence.step('E2E-019', 'E2E-019-02', "Follow Add Owner link", async () => { await search.addOwner(); });
  await evidence.assert('E2E-019', 'E2E-019-02', "Blank owner creation form visible", async () => { await expect(form.heading).toBeVisible(); for (const field of Object.values(form.fields)) await expect(field).toHaveValue(""); });
});

test('E2E-056 Reject alphabetic telephone when editing generated owner', async ({ page, evidence }) => {
  const form = new OwnerFormPage(page);
  const detail = new OwnerDetailsPage(page);
  const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-056', 'E2E-056-01', 'Open owner creation form', async () => { await form.openNew(); });
  await evidence.assert('E2E-056', 'E2E-056-01', 'Owner form is visible', async () => { await expect(form.heading).toBeVisible(); });
  await evidence.step('E2E-056', 'E2E-056-02', 'Enter unique valid owner', async () => { await form.enterOwner(data); });
  await evidence.assert('E2E-056', 'E2E-056-02', 'All owner fields retain input', async () => { for (const key of Object.keys(data) as (keyof typeof data)[]) await expect(form.fields[key]).toHaveValue(data[key]); });
  await evidence.step('E2E-056', 'E2E-056-03', 'Save generated owner', async () => { await form.submit(); });
  await evidence.assert('E2E-056', 'E2E-056-03', 'Saved owner detail appears', async () => { await expect(detail.heading).toBeVisible(); await expect(detail.ownerTable).toContainText(data.lastName); });
  const ownerId = detail.ownerId();
  await evidence.step('E2E-056', 'E2E-056-04', 'Open owner edit form', async () => { await detail.openEdit(); });
  await evidence.assert('E2E-056', 'E2E-056-04', 'Existing telephone is prefilled', async () => { await expect(form.fields.telephone).toHaveValue(data.telephone); });
  await evidence.step('E2E-056', 'E2E-056-05', 'Enter alphabetic telephone during edit', async () => { await form.enterOwner({...data, telephone: 'abcdefghij'}); });
  await evidence.assert('E2E-056', 'E2E-056-05', 'Alphabetic telephone is entered', async () => { await expect(form.fields.telephone).toHaveValue('abcdefghij'); });
  await evidence.step('E2E-056', 'E2E-056-06', 'Submit alphabetic telephone update', async () => { await form.submit(); });
  await evidence.assert('E2E-056', 'E2E-056-06', 'Telephone validation requires ten digits', async () => { await expect(form.fieldError('telephone')).toContainText('10-digit'); await expect(form.errors).toHaveCount(1); });
  await evidence.step('E2E-056', 'E2E-056-07', 'Reload owner after rejected edit', async () => { await detail.open(ownerId); });
  await evidence.assert('E2E-056', 'E2E-056-07', 'Previously saved telephone remains intact', async () => { await expect(detail.ownerTable).toContainText(data.telephone); await expect(detail.ownerTable).not.toContainText('abcdefghij'); });
});
