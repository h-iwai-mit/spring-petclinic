import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { Navigation, HomePage } from '../pages/navigation';
import { VetsPage } from '../pages/vets-page';
import { ErrorPage } from '../pages/error-page';
import { OwnerFormPage, OwnerDetailsPage, OwnerSearchPage, ownerData } from '../pages/owner-pages';

test('E2E-050 Open home', async ({ page, evidence }) => {
  const home = new HomePage(page); const nav = new Navigation(page); const vets = new VetsPage(page);
  const error = new ErrorPage(page); const form = new OwnerFormPage(page); const detail = new OwnerDetailsPage(page);
  const search = new OwnerSearchPage(page); const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-050', 'E2E-050-01', "Open home", async () => { await home.open(); });
  await evidence.assert('E2E-050', 'E2E-050-01', "Welcome visible", async () => { await expect(home.heading).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-050', 'E2E-050-02', "Find Owners navigation", async () => { await nav.owners(); });
  await evidence.assert('E2E-050', 'E2E-050-02', "Search form visible", async () => { await expect(search.heading).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-050', 'E2E-050-03', "Veterinarians navigation", async () => { await nav.vets(); });
  await evidence.assert('E2E-050', 'E2E-050-03', "Veterinarians visible", async () => { await expect(vets.heading).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-050', 'E2E-050-04', "Home navigation", async () => { await nav.home(); });
  await evidence.assert('E2E-050', 'E2E-050-04', "Welcome visible", async () => { await expect(home.heading).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-050', 'E2E-050-05', "Brand home navigation", async () => { await nav.brandHome(); });
  await evidence.assert('E2E-050', 'E2E-050-05', "Brand returns home", async () => { await expect(home.heading).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-050', 'E2E-050-06', "Error navigation", async () => { await nav.error(); });
  await evidence.assert('E2E-050', 'E2E-050-06', "500 error rendered", async () => { await expect(error.heading).toBeVisible(); await expect(error.body).toContainText("internal server error"); }, async () => page.url());
  await evidence.step('E2E-050', 'E2E-050-07', "Recover from error", async () => { await nav.home(); });
  await evidence.assert('E2E-050', 'E2E-050-07', "Home navigation works on error page", async () => { await expect(home.heading).toBeVisible(); }, async () => page.url());
});

test('E2E-051 Open mobile home', async ({ page, evidence }) => {
  const home = new HomePage(page); const nav = new Navigation(page); const vets = new VetsPage(page);
  const error = new ErrorPage(page); const form = new OwnerFormPage(page); const detail = new OwnerDetailsPage(page);
  const search = new OwnerSearchPage(page); const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-051', 'E2E-051-01', "Open mobile home", async () => { await nav.mobileViewport(); await home.open(); });
  await evidence.assert('E2E-051', 'E2E-051-01', "Mobile menu initially collapsed", async () => { await expect(home.heading).toBeVisible(); await expect(nav.menu).toBeHidden(); }, async () => page.url());
  await evidence.step('E2E-051', 'E2E-051-02', "Expand mobile navigation", async () => { await nav.toggleMenu(); });
  await evidence.assert('E2E-051', 'E2E-051-02', "Menu expanded", async () => { await expect(nav.menu).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-051', 'E2E-051-03', "Collapse mobile navigation", async () => { await nav.toggleMenu(); });
  await evidence.assert('E2E-051', 'E2E-051-03', "Menu collapsed", async () => { await expect(nav.menu).toBeHidden(); }, async () => page.url());
  await evidence.step('E2E-051', 'E2E-051-04', "Reopen mobile navigation", async () => { await nav.toggleMenu(); });
  await evidence.assert('E2E-051', 'E2E-051-04', "Links available", async () => { await expect(nav.homeLink).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-051', 'E2E-051-05', "Use mobile owner link", async () => { await nav.owners(); });
  await evidence.assert('E2E-051', 'E2E-051-05', "Search available on mobile", async () => { await expect(search.heading).toBeVisible(); }, async () => page.url());
});

test('E2E-052 Open veterinarian list', async ({ page, evidence }) => {
  const home = new HomePage(page); const nav = new Navigation(page); const vets = new VetsPage(page);
  const error = new ErrorPage(page); const form = new OwnerFormPage(page); const detail = new OwnerDetailsPage(page);
  const search = new OwnerSearchPage(page); const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-052', 'E2E-052-01', "Open veterinarian list", async () => { await vets.open(); });
  await evidence.assert('E2E-052', 'E2E-052-01', "Five seeded vets with specialties and none; first disabled", async () => { await expect(vets.rows).toHaveCount(5); await expect(vets.rows).toContainText(["James Carter", "Helen Leary", "Linda Douglas", "Rafael Ortega", "Henry Stevens"]); await expect(vets.rows).toContainText(["none", "radiology", "dentistry surgery", "surgery", "radiology"]); await expect(vets.firstDisabled).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-052', 'E2E-052-02', "Next veterinarian page", async () => { await vets.next(); });
  await evidence.assert('E2E-052', 'E2E-052-02', "Last veterinarian page and last disabled", async () => { await expect(vets.rows).toHaveCount(1); await expect(vets.rows).toContainText(["Sharon Jenkins"]); await expect(vets.lastDisabled).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-052', 'E2E-052-03', "First veterinarian page", async () => { await vets.first(); });
  await evidence.assert('E2E-052', 'E2E-052-03', "First page restored", async () => { await expect(vets.rows).toHaveCount(5); }, async () => page.url());
  await evidence.step('E2E-052', 'E2E-052-04', "Last veterinarian page", async () => { await vets.last(); });
  await evidence.assert('E2E-052', 'E2E-052-04', "Last page shown", async () => { await expect(vets.rows).toHaveCount(1); }, async () => page.url());
  await evidence.step('E2E-052', 'E2E-052-05', "Previous veterinarian page", async () => { await vets.previous(); });
  await evidence.assert('E2E-052', 'E2E-052-05', "Previous page shown", async () => { await expect(vets.rows).toHaveCount(5); }, async () => page.url());
  await evidence.step('E2E-052', 'E2E-052-06', "Numbered veterinarian page", async () => { await vets.numbered(); });
  await evidence.assert('E2E-052', 'E2E-052-06', "Numbered page2 shown", async () => { await expect(vets.rows).toHaveCount(1); await expect(page).toHaveURL(/page=2/); }, async () => page.url());
});

test('E2E-053 Open low veterinarian page', async ({ page, evidence }) => {
  const home = new HomePage(page); const nav = new Navigation(page); const vets = new VetsPage(page);
  const error = new ErrorPage(page); const form = new OwnerFormPage(page); const detail = new OwnerDetailsPage(page);
  const search = new OwnerSearchPage(page); const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-053', 'E2E-053-01', "Open low veterinarian page", async () => { await vets.open("?page=0"); });
  await evidence.assert('E2E-053', 'E2E-053-01', "Invalid low page redirects1", async () => { await expect(page).toHaveURL(/vets.html\?page=1$/); await expect(vets.rows).toHaveCount(5); }, async () => page.url());
  await evidence.step('E2E-053', 'E2E-053-02', "Open high veterinarian page", async () => { await vets.open("?page=99999"); });
  await evidence.assert('E2E-053', 'E2E-053-02', "Invalid high page redirects1", async () => { await expect(page).toHaveURL(/vets.html\?page=1$/); await expect(vets.rows).toHaveCount(5); }, async () => page.url());
});

test('E2E-054 Open missing page', async ({ page, evidence }) => {
  const home = new HomePage(page); const nav = new Navigation(page); const vets = new VetsPage(page);
  const error = new ErrorPage(page); const form = new OwnerFormPage(page); const detail = new OwnerDetailsPage(page);
  const search = new OwnerSearchPage(page); const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-054', 'E2E-054-01', "Open missing page", async () => { await error.missingPage(); });
  await evidence.assert('E2E-054', 'E2E-054-01', "404 template rendered", async () => { await expect(error.heading).toBeVisible(); await expect(error.body).toContainText("requested page was not found"); }, async () => page.url());
  await evidence.step('E2E-054', 'E2E-054-02', "Open missing owner", async () => { await error.missingOwner(); });
  await evidence.assert('E2E-054', 'E2E-054-02', "Missing owner renders500", async () => { await expect(error.body).toContainText("internal server error"); }, async () => page.url());
  await evidence.step('E2E-054', 'E2E-054-03', "Open missing pet visit", async () => { await error.missingPetVisit(); });
  await evidence.assert('E2E-054', 'E2E-054-03', "Missing pet visit renders500", async () => { await expect(error.body).toContainText("internal server error"); }, async () => page.url());
  await evidence.step('E2E-054', 'E2E-054-04', "Open missing pet edit", async () => { await error.missingPetEdit(); });
  await evidence.assert('E2E-054', 'E2E-054-04', "Missing pet edit renders500", async () => { await expect(error.body).toContainText("internal server error"); }, async () => page.url());
  await evidence.step('E2E-054', 'E2E-054-05', "Open malformed owner ID", async () => { await error.malformedId(); });
  await evidence.assert('E2E-054', 'E2E-054-05', "400 general error template rendered", async () => { await expect(error.heading).toBeVisible(); await expect(error.body).toContainText("unexpected error"); }, async () => page.url());
});

test('E2E-055 Open owner for timed flash dismissal', async ({ page, evidence }) => {
  const home = new HomePage(page); const nav = new Navigation(page); const vets = new VetsPage(page);
  const error = new ErrorPage(page); const form = new OwnerFormPage(page); const detail = new OwnerDetailsPage(page);
  const search = new OwnerSearchPage(page); const data = ownerData(randomUUID().slice(0, 8));
  await evidence.step('E2E-055', 'E2E-055-01', "Open owner for timed flash dismissal", async () => { await form.openNew(); });
  await evidence.assert('E2E-055', 'E2E-055-01', "Owner form ready", async () => { await expect(form.heading).toBeVisible(); }, async () => page.url());
  await evidence.step('E2E-055', 'E2E-055-02', "Enter fresh owner", async () => { await form.enterOwner(data); });
  await evidence.assert('E2E-055', 'E2E-055-02', "Owner data retained", async () => { await expect(form.fields.firstName).toHaveValue(data.firstName); }, async () => page.url());
  await evidence.step('E2E-055', 'E2E-055-03', "Create owner for flash expiry", async () => { await form.submit(); });
  await evidence.assert('E2E-055', 'E2E-055-03', "Creation flash visible", async () => { await expect(detail.message).toContainText("New Owner Created"); }, async () => page.url());
  await evidence.step('E2E-055', 'E2E-055-04', "Wait for automatic flash dismissal", async () => { await nav.expireFlash(); });
  await evidence.assert('E2E-055', 'E2E-055-04', "Success flash hides after3seconds", async () => { await expect(detail.message).toBeHidden(); }, async () => page.url());
});
