import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyze } from './ast';

// Resolve actual method declarations in an isolated miniature POM, rather than
// matching the business method's name or copying application implementation.
const directory = mkdtempSync(join(tmpdir(), 'petclinic-pom-policy-'));
after(() => rmSync(directory, { recursive: true, force: true }));
mkdirSync(join(directory, 'pages'));
mkdirSync(join(directory, 'tests'));
writeFileSync(join(directory, 'pages', 'sample.ts'), `
export class SamplePage {
  private input = { async fill(value: string) {}, async inputValue() { return 'read'; } };
  async rename() { await this.input.fill('changed'); }
  async saveBusinessChange() { await this.rename(); }
  async readValue() { return this.input.inputValue(); }
  private browser = { async evaluate(callback: any) {} };
  async readValidity() { return this.browser.evaluate((input: any) => input.validity.rangeUnderflow); }
  async mutateInBrowser() { return this.browser.evaluate((input: any) => { input.value = 'changed'; }); }
  async disguisedBrowserMutation() { return this.browser.evaluate((input: any) => input.click().value); }
  type = 'dog';
  heading = 'Example';
}
`);
const samples: Record<string, string> = {
  'valid-wrapped-operation': `await evidence.step('E2E-001','E2E-001-01','rename',async()=>{ await sample.saveBusinessChange(); });`,
  'invalid-unwrapped-operation': `await sample.saveBusinessChange();`,
  'invalid-operation-in-assertion': `await evidence.assert('E2E-001','E2E-001-01','rename',async()=>{ await sample.saveBusinessChange(); });`,
  'invalid-destructured-business-alias': `const { saveBusinessChange: execute } = sample; await execute();`,
  'invalid-conditional-swallow': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ try { await expect(sample.heading).toBe('Other'); } catch(error) { if (Date.now()) return; throw error; } });`,
  'invalid-swallowed-rejection-handler': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ await expect(sample.heading).toBe('Other').then(()=>{},()=>{}); });`,
  'valid-noncallable-type-property': `await evidence.assert('E2E-001','E2E-001-01','value',async()=>{ await expect(sample.type).toBe('dog'); });`,
  'valid-readonly-evaluate-helper': `const underflow = await sample.readValidity();`,
  'invalid-evaluate-mutation-helper': `await sample.mutateInBrowser();`,
  'invalid-disguised-evaluate-mutation': `await sample.disguisedBrowserMutation();`,
  'valid-read-helper': `const actual = await sample.readValue();`,
  'invalid-bound-business-alias': `const execute = sample.rename.bind(sample); await execute();`,
  'invalid-referenced-business-alias': `const execute = sample.saveBusinessChange; await execute();`,
  'invalid-unawaited-scalar-expect': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ expect(true).toBe(true); });`,
  'invalid-unawaited-negated-expect': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ expect(true).not.toBe(false); });`,
  'invalid-unawaited-matcher-object-alias': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ const matcher = expect(true); matcher.toBe(true); });`,
  'invalid-unawaited-matcher-function-alias': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ const verify = expect(true).toBe; verify(true); });`,
  'valid-awaited-matcher-object-alias': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ const matcher = expect(true); await matcher.toBe(true); });`,
  'valid-awaited-scalar-expect': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ await expect(true).toBe(true); });`,
  'valid-returned-scalar-expect': `await evidence.assert('E2E-001','E2E-001-01','scalar',()=>{ return expect(true).toBe(true); });`,
  'valid-implicitly-returned-scalar-expect': `await evidence.assert('E2E-001','E2E-001-01','scalar',()=>expect(true).toBe(true));`,
  'valid-returned-negated-expect': `await evidence.assert('E2E-001','E2E-001-01','scalar',()=>expect(true).not.toBe(false));`,
  'invalid-return-to-unawaited-nested-callback': `await evidence.assert('E2E-001','E2E-001-01','scalar',async()=>{ [1].map(()=>expect(true).toBe(true)); });`,
  'invalid-unawaited-evidence-assertion': `evidence.assert('E2E-001','E2E-001-01','scalar',()=>expect(true).toBe(true));`,
  'invalid-unawaited-evidence-step': `evidence.step('E2E-001','E2E-001-01','rename',async()=>{ await sample.rename(); });`,
  'valid-returned-evidence-assertion': `test('E2E-001 example',()=>evidence.assert('E2E-001','E2E-001-01','scalar',()=>expect(true).toBe(true)));`,
  'valid-wrapped-expect': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ await expect(sample.heading).toBe('Example'); });`,
  'invalid-unwrapped-expect': `await expect(sample.heading).toBe('Example');`,
  'invalid-expect-in-step': `await evidence.step('E2E-001','E2E-001-01','rename',async()=>{ await expect(sample.heading).toBe('Example'); });`,
  'invalid-imported-expect-alias': `import { expect as verify } from 'unresolved-fixtures'; await verify(sample.heading).toBe('Example');`,
  'invalid-local-expect-alias': `const verify = expect; await verify(sample.heading).toBe('Example');`,
  'invalid-swallowed-assertion': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ try { await expect(sample.heading).toBe('Other'); } catch(error) {} });`,
  'valid-rethrown-assertion': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ try { await expect(sample.heading).toBe('Example'); } catch(error) { throw error; } });`,
  'invalid-swallowed-assertion-promise': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ await expect(sample.heading).toBe('Other').catch(()=>{}); });`,
  'invalid-swallowed-evidence-promise': `await evidence.assert('E2E-001','E2E-001-01','visible',async()=>{ await expect(sample.heading).toBe('Other'); }).catch(()=>{});`,
  'invalid-direct-locator': `await page.getByRole('button').click();`,
  'invalid-destructured-raw-alias': `const { click: execute } = page; await execute();`,
  'invalid-bound-raw-alias': `const execute = page.click.bind(page); await execute();`,
  'invalid-computed-raw-alias': `const method = 'click'; await page[method]();`,
};
const paths = Object.entries(samples).map(([name, code]) => {
  const file = join(directory, 'tests', name + '.spec.ts');
  writeFileSync(file, `import { SamplePage } from '../pages/sample';
const sample = new SamplePage();
${code}\n`);
  return file;
});
const result = analyze(paths);
for (const name of Object.keys(samples)) {
  test(`AST policy ${name}`, () => {
    const errors = result.errors.filter(error => error.startsWith(join(directory, 'tests', name + '.spec.ts')));
    if (name.startsWith('valid-')) assert.deepEqual(errors, []);
    else assert.ok(errors.length > 0, `Unsafe fixture was accepted: ${name}`);
  });
}
