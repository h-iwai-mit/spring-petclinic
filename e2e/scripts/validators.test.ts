import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { PNG } from 'pngjs';
import { validateSpec, markdown, type Spec, type Model, type Discovery } from './contracts';
import { analyze, implementationErrors } from './ast';
import { validateRuntime } from './runtime';

const baseSpec: Spec = {
  version: 1,
  pages: [{ pageId: 'owner-search' }],
  tests: [{ testId: 'E2E-001', pageId: 'owner-search', preconditions: ['Running application'],
    pageObject: 'e2e/pages/owner-pages.ts', testFile: 'e2e/tests/owners.spec.ts', actions: [{
      actionId: 'E2E-001-01', pageId: 'owner-search', pageObject: 'e2e/pages/owner-pages.ts',
      operation: 'Open search', expected: 'Search heading visible', sourceState: 'start', targetState: 'ready',
      sourceRefs: ['MVC-002'], evidence: { before: true, after: true },
    }] }],
};
const baseFound: Discovery[] = [{ discoveryId: 'MVC-002', pageId: 'owner-search', label: 'Open search',
  sourceRefs: ['src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java:initFindForm'], classification: 'target' }];
const baseModel: Model = { initialState: 'start', states: [{ stateId: 'start', pageId: 'owner-search' }, { stateId: 'ready', pageId: 'owner-search' }],
  transitions: [{ transitionId: 'TR-001', testId: 'E2E-001', actionId: 'E2E-001-01', sourceState: 'start', targetState: 'ready' }] };
const copy = <T>(value: T): T => structuredClone(value);
function specErrors(change: (s: Spec, d: Discovery[], m: Model) => void) {
  const s = copy(baseSpec), d = copy(baseFound), m = copy(baseModel); change(s, d, m); return validateSpec(s, d, m);
}
function temporary(body: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'petclinic-validator-'));
  try { body(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('valid specification passes schema, references, and reachability', () => assert.deepEqual(validateSpec(baseSpec, baseFound, baseModel), []));
test('missing mandatory expected criterion fails schema', () => assert.ok(specErrors(s => { delete (s.tests[0].actions[0] as any).expected; }).some(e => e.includes('schema'))));
test('duplicate test IDs fail', () => assert.ok(specErrors(s => s.tests.push(copy(s.tests[0]))).some(e => e.includes('Duplicate test'))));
test('duplicate action IDs fail', () => assert.ok(specErrors(s => s.tests[0].actions.push(copy(s.tests[0].actions[0]))).some(e => e.includes('Duplicate action'))));
test('duplicate discovery and state IDs fail', () => assert.ok(specErrors((s, d, m) => { d.push(copy(d[0])); m.states.push(copy(m.states[0])); }).filter(e => e.includes('Duplicate')).length >= 2));
test('unknown page and state references fail', () => {
  const errors = specErrors(s => { s.tests[0].pageId = 'missing'; s.tests[0].actions[0].targetState = 'missing'; });
  assert.ok(errors.some(e => e.includes('Unknown page'))); assert.ok(errors.some(e => e.includes('Unknown state')));
});
test('unknown discovery reference fails', () => assert.ok(specErrors(s => { s.tests[0].actions[0].sourceRefs = ['NO-SUCH-ID']; }).some(e => e.includes('Unknown discovery'))));
test('unclassified and uncovered discoveries fail', () => {
  assert.ok(specErrors((s, d) => { d[0].classification = 'incomplete'; }).some(e => e.includes('Unclassified')));
  assert.ok(specErrors((s, d) => { d.push({ ...d[0], discoveryId: 'MVC-EXTRA' }); }).some(e => e.includes('Uncovered discovery')));
});
test('exclusion without reason fails', () => assert.ok(specErrors((s, d) => { d[0].classification = 'excluded'; }).some(e => e.includes('Missing exclusion reason'))));
test('unreachable state and unmatched transition fail', () => {
  assert.ok(specErrors((s, d, m) => { m.states.push({ stateId: 'island', pageId: 'owner-search' }); }).some(e => e.includes('Unreachable state')));
  assert.ok(specErrors((s, d, m) => { m.transitions[0].testId = 'E2E-999'; }).some(e => e.includes('Unmatched transition')));
});
test('unimplemented test and action IDs fail', () => {
  const errors = implementationErrors(baseSpec, { tests: [], steps: [], assertions: [], errors: [] });
  assert.ok(errors.some(e => e.includes('Unimplemented test'))); assert.ok(errors.some(e => e.includes('Unimplemented action')));
});

function astErrors(code: string) {
  let result: string[] = [];
  temporary(dir => { const path = join(dir, 'sample.spec.ts'); writeFileSync(path, `import { OwnerFormPage } from '../pages/owner-pages';\n${code}`); result = analyze([path]).errors; });
  return result;
}
test('POM AST catches direct locators and mutations', () => {
  assert.ok(astErrors('page.getByRole("button").click();').length >= 2);
  assert.ok(astErrors('page["locator"]("input")["fill"]("bad");').length >= 2);
});
test('POM AST catches destructured operation aliases', () => assert.ok(astErrors('const { click: trigger } = page; trigger();').length > 0));
test('POM AST catches bound operation aliases and computed access', () => {
  assert.ok(astErrors('const trigger = page.click; trigger("button");').length > 0);
  assert.ok(astErrors('const method = "click"; page[method]("button");').length > 0);
});

function evidenceFixture(dir: string) {
  const s = copy(baseSpec), t = s.tests[0], a = t.actions[0];
  const td = join(dir, t.testId, 'attempt-0'), ad = join(td, a.actionId);
  mkdirSync(ad, { recursive: true });
  const timestamp = new Date().toISOString();
  const save = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
  save(join(dir, 'run.json'), { status: 'passed', results: [{ testId: t.testId, file: t.testFile, retry: 0, status: 'passed', expectedStatus: 'passed' }] });
  save(join(td, 'test-result.json'), { testId: t.testId, retry: 0, status: 'passed' });
  const matcher = { testId: t.testId, actionId: a.actionId, matcher: 'toBeVisible', negated: false, expected: [], actual: true, timestamp, status: 'passed' };
  writeFileSync(join(td, 'matcher-details.jsonl'), JSON.stringify(matcher) + '\n');
  save(join(td, 'expect-results.json'), [{ assertionId: 'E2E-001-expect-1', ...matcher, reporterActionId: a.actionId, durationMs: 1 }]);
  save(join(td, 'assertions.json'), [{ assertionId: a.actionId + '-assert-1', testId: t.testId, actionId: a.actionId, expected: a.expected, actual: 'visible', timestamp, status: 'passed' }]);
  save(join(ad, 'execution.json'), { testId: t.testId, actionId: a.actionId, retry: 0, operation: a.operation, timestamp, durationMs: 1, status: 'passed', before: true, after: true });
  const png = new PNG({ width: 2, height: 2 }); png.data.fill(255);
  for (const f of ['before.png', 'after.png']) writeFileSync(join(ad, f), PNG.sync.write(png));
  const logs = ['test-start', 'action-start', 'action-end', 'assertion-start', 'assertion-end', 'test-end'].map(event => ({
    event, testId: t.testId, actionId: event.startsWith('test') ? undefined : a.actionId, timestamp, durationMs: 1,
    status: event.endsWith('start') ? 'running' : 'passed',
  }));
  const saveLog = () => writeFileSync(join(td, 'execution.log'), logs.map(x => JSON.stringify(x)).join('\n') + '\n'); saveLog();
  return { s, td, ad, save, logs, saveLog };
}
test('complete valid evidence fixture passes including PNG decoding', () => temporary(dir => { const { s } = evidenceFixture(dir); assert.deepEqual(validateRuntime(s, dir), []); }));
test('missing before screenshot and missing action record fail', () => temporary(dir => {
  const { s, ad } = evidenceFixture(dir); rmSync(join(ad, 'before.png')); rmSync(join(ad, 'execution.json'));
  const errors = validateRuntime(s, dir); assert.ok(errors.some(e => e.includes('before.png'))); assert.ok(errors.some(e => e.includes('execution.json')));
}));
test('corrupt PNG fails even with successful operation', () => temporary(dir => {
  const { s, ad } = evidenceFixture(dir); writeFileSync(join(ad, 'after.png'), 'not an image');
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Unreadable image')));
}));
test('wrong operation identity fails', () => temporary(dir => {
  const { s, ad, save } = evidenceFixture(dir); save(join(ad, 'execution.json'), { testId: 'E2E-999', actionId: 'other', retry: 0, status: 'passed' });
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Wrong evidence identity')));
}));
test('failed assertion prevents success despite passed reporter result', () => temporary(dir => {
  const { s, td, save } = evidenceFixture(dir); save(join(td, 'assertions.json'), [{ assertionId: 'a', testId: 'E2E-001', actionId: 'E2E-001-01', expected: 'visible', actual: 'hidden', status: 'failed', timestamp: new Date().toISOString() }]);
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Failed/invalid assertion')));
}));
test('failed assertion log contradicting successful assertion fails', () => temporary(dir => {
  const { s, logs, saveLog } = evidenceFixture(dir); logs.find(l => l.event === 'assertion-end')!.status = 'failed'; saveLog();
  assert.ok(validateRuntime(s, dir).length > 0);
}));
test('failed action log contradicting successful action fails', () => temporary(dir => {
  const { s, logs, saveLog } = evidenceFixture(dir); logs.find(l => l.event === 'action-end')!.status = 'failed'; saveLog();
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Failed action log')));
}));
test('reporter and test-result identity contradiction fails', () => temporary(dir => {
  const { s, td, save } = evidenceFixture(dir); save(join(td, 'test-result.json'), { testId: 'E2E-001', retry: 0, status: 'failed' });
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Reporter/evidence contradiction')));
}));
test('unexecuted specification IDs fail', () => temporary(dir => {
  const { s, save } = evidenceFixture(dir); save(join(dir, 'run.json'), { status: 'passed', results: [] });
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Unexecuted test')));
}));
test('CLI returns nonzero for generated Markdown drift', () => temporary(dir => {
  const s = copy(baseSpec); s.tests[0].testFile = 'e2e/tests/fake.spec.ts'; s.tests[0].pageObject = 'e2e/pages/fake.ts'; s.tests[0].actions[0].pageObject = 'e2e/pages/fake.ts';
  for (const path of ['docs/e2e', 'e2e/pages', 'e2e/tests']) mkdirSync(join(dir, path), { recursive: true });
  writeFileSync(join(dir, 'e2e/pages/fake.ts'), ''); writeFileSync(join(dir, 'e2e/tests/fake.spec.ts'), '');
  writeFileSync(join(dir, 'docs/e2e/specification.yaml'), YAML.stringify(s));
  writeFileSync(join(dir, 'docs/e2e/state-model.json'), JSON.stringify(baseModel));
  writeFileSync(join(dir, 'docs/e2e/discovery-test.json'), JSON.stringify({ actions: baseFound }));
  copyFileSync('docs/e2e/specification.schema.json', join(dir, 'docs/e2e/specification.schema.json'));
  writeFileSync(join(dir, 'docs/e2e/test-specification.md'), markdown(s) + 'unauthorized manual edit\n');
  const result = spawnSync(process.execPath, ['--import', resolve('node_modules/tsx/dist/loader.mjs'), resolve('e2e/scripts/cli.ts'), 'spec'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Markdown drift/);
}));

test('nonexistent discovery source file fails', () => {
  assert.ok(specErrors((s, d) => { d[0].sourceRefs = ['src/main/java/MissingController.java:missing']; }).length > 0);
});
test('missing individual expect results fails', () => temporary(dir => {
  const { s, td } = evidenceFixture(dir); rmSync(join(td, 'expect-results.json'));
  assert.ok(validateRuntime(s, dir).length > 0);
}));
test('failed individual expect cannot be hidden by passing assertion group', () => temporary(dir => {
  const { s, td, save } = evidenceFixture(dir);
  save(join(td, 'expect-results.json'), [{ assertionId: 'E2E-001-expect-1', testId: 'E2E-001', actionId: 'E2E-001-01', expected: 'toBeVisible', actual: 'hidden', timestamp: new Date().toISOString(), durationMs: 1, status: 'failed', error: 'hidden' }]);
  assert.ok(validateRuntime(s, dir).length > 0);
}));
test('individual expect action identity mismatch fails', () => temporary(dir => {
  const { s, td, save } = evidenceFixture(dir);
  save(join(td, 'expect-results.json'), [{ assertionId: 'wrong', testId: 'E2E-001', actionId: 'E2E-999-01', expected: 'toBeVisible', actual: true, timestamp: new Date().toISOString(), durationMs: 1, status: 'passed' }]);
  assert.ok(validateRuntime(s, dir).length > 0);
}));
test('timestamps contradicting chronological log order fail', () => temporary(dir => {
  const { s, logs, saveLog } = evidenceFixture(dir);
  logs[1].timestamp = '2099-01-01T00:00:00.000Z'; saveLog();
  assert.ok(validateRuntime(s, dir).length > 0);
}));
test('action end before action start fails', () => temporary(dir => {
  const { s, logs, saveLog } = evidenceFixture(dir);
  [logs[1], logs[2]] = [logs[2], logs[1]]; saveLog();
  assert.ok(validateRuntime(s, dir).length > 0);
}));

test('missing raw matcher details fails', () => temporary(dir => {
  const { s, td } = evidenceFixture(dir); rmSync(join(td, 'matcher-details.jsonl'));
  assert.ok(validateRuntime(s, dir).some(e => e.includes('matcher-details')));
}));
test('raw matcher count different from reporter count fails', () => temporary(dir => {
  const { s, td } = evidenceFixture(dir); writeFileSync(join(td, 'matcher-details.jsonl'), '');
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Matcher/reporter inconsistency')));
}));
test('raw matcher argument mismatch with reporter fails', () => temporary(dir => {
  const { s, td } = evidenceFixture(dir);
  const path = join(td, 'matcher-details.jsonl');
  const raw = JSON.parse(readFileSync(path, 'utf8')); raw.expected = ['altered argument'];
  writeFileSync(path, JSON.stringify(raw) + '\n');
  assert.ok(validateRuntime(s, dir).some(e => e.includes('Matcher/reporter inconsistency')));
}));

test('declared POM class must match implemented business operation', () => {
  const s = copy(baseSpec); s.tests[0].actions[0].pageObject += '#OwnerSearchPage';
  const errors = implementationErrors(s, { tests: [{ testId: 'E2E-001', file: 'e2e/tests/owners.spec.ts' }],
    steps: [{ testId: 'E2E-001', actionId: 'E2E-001-01', file: 'e2e/tests/owners.spec.ts', pageObjects: ['e2e/pages/owner-pages.ts#OwnerFormPage'] }],
    assertions: [{ testId: 'E2E-001', actionId: 'E2E-001-01', file: 'e2e/tests/owners.spec.ts' }], errors: [] });
  assert.ok(errors.some(e => e.includes('POM reference mismatch')));
});
