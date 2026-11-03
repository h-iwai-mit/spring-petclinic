import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';
import { checkSources } from './check-sources';
import { compareJUnit } from './compare-junit';
import { compareE2e } from './compare-e2e';
import { compareImages } from './compare-images';

function temporary(body: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'petclinic-migration-'));
  try { body(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function save(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value));
}

function junit(dir: string, status = 'passed') {
  mkdirSync(dir, { recursive: true });
  const outcome = status === 'passed' ? '' : `<${status} message="broken"/>`;
  writeFileSync(join(dir, 'TEST-sample.xml'), `<testsuite tests="1"><testcase classname="Sample" name="works">${outcome}</testcase></testsuite>`);
}

function e2e(dir: string, color = 255) {
  const attempt = join(dir, 'E2E-001', 'attempt-0'), action = join(attempt, 'E2E-001-01');
  mkdirSync(action, { recursive: true });
  save(join(dir, 'run.json'), { status: 'passed', results: [{ testId: 'E2E-001', retry: 0, status: 'passed', expectedStatus: 'passed', file: '/repo/e2e/tests/sample.spec.ts' }] });
  save(join(attempt, 'assertions.json'), [{ assertionId: 'a', testId: 'E2E-001', actionId: 'E2E-001-01', expected: 'visible', actual: 'visible', status: 'passed' }]);
  save(join(attempt, 'expect-results.json'), [{ assertionId: 'e', testId: 'E2E-001', actionId: 'E2E-001-01', expected: ['visible'], actual: true, status: 'passed' }]);
  save(join(attempt, 'test-result.json'), { testId: 'E2E-001', retry: 0, status: 'passed' });
  writeFileSync(join(attempt, 'execution.log'), [
    { event: 'test-start', testId: 'E2E-001', status: 'running' },
    { event: 'action-start', testId: 'E2E-001', actionId: 'E2E-001-01', status: 'running' },
    { event: 'action-end', testId: 'E2E-001', actionId: 'E2E-001-01', status: 'passed' },
    { event: 'assertion-start', testId: 'E2E-001', actionId: 'E2E-001-01', status: 'running' },
    { event: 'assertion-end', testId: 'E2E-001', actionId: 'E2E-001-01', status: 'passed' },
    { event: 'test-end', testId: 'E2E-001', status: 'passed' },
  ].map(value => JSON.stringify(value)).join('\n'));
  save(join(action, 'execution.json'), { testId: 'E2E-001', actionId: 'E2E-001-01', retry: 0, operation: 'open', status: 'passed', before: true, after: true });
  const png = new PNG({ width: 2, height: 2 }); png.data.fill(color); for (let offset = 3; offset < png.data.length; offset += 4) png.data[offset] = 255;
  for (const name of ['before.png', 'after.png']) writeFileSync(join(action, name), PNG.sync.write(png));
}

test('source validation rejects remaining Java and incomplete inventory', () => temporary(dir => {
  save(join(dir, 'src/main/java/Sample.java'), 'class Sample {}');
  save(join(dir, 'docs/migration/inventory.yaml'), 'files:\n  - javaPath: src/main/java/Sample.java\n    kotlinPath: src/main/kotlin/Sample.kt\n    status: pending\n');
  const result = checkSources(dir, join(dir, 'docs/migration/inventory.yaml'));
  assert.equal(result.status, 'failed'); assert.ok(result.errors.length >= 2);
}));

test('source validation rejects an empty inventory instead of accepting an empty migration', () => temporary(dir => {
  save(join(dir, 'docs/migration/inventory.yaml'), 'files: []\n');
  assert.equal(checkSources(dir, join(dir, 'docs/migration/inventory.yaml')).status, 'failed');
}));

test('JUnit comparison rejects missing baseline reports', () => temporary(dir => {
  const candidate = join(dir, 'candidate'); junit(candidate);
  assert.equal(compareJUnit(join(dir, 'missing'), candidate).status, 'failed');
}));

test('JUnit comparison rejects candidate regression', () => temporary(dir => {
  const baseline = join(dir, 'baseline'), candidate = join(dir, 'candidate'); junit(baseline); junit(candidate, 'failure');
  const result = compareJUnit(baseline, candidate);
  assert.equal(result.status, 'failed'); assert.ok(result.errors.some(error => error.includes('status changed')));
}));

test('E2E comparison rejects missing candidate evidence', () => temporary(dir => {
  const baseline = join(dir, 'baseline'); e2e(baseline);
  assert.equal(compareE2e(baseline, join(dir, 'missing')).status, 'failed');
}));

test('E2E comparison rejects assertion changes', () => temporary(dir => {
  const baseline = join(dir, 'baseline'), candidate = join(dir, 'candidate'); e2e(baseline); e2e(candidate);
  save(join(candidate, 'E2E-001/attempt-0/assertions.json'), [{ assertionId: 'a', testId: 'E2E-001', actionId: 'E2E-001-01', expected: 'visible', actual: 'hidden', status: 'passed' }]);
  const result = compareE2e(baseline, candidate);
  assert.equal(result.status, 'failed'); assert.ok(result.errors.some(error => error.includes('assertions changed')));
}));

test('image comparison rejects a nonzero pixel difference at the strict default threshold', () => temporary(dir => {
  const baseline = join(dir, 'baseline'), candidate = join(dir, 'candidate'); e2e(baseline, 255); e2e(candidate, 0);
  const oldRatio = process.env.MIGRATION_IMAGE_MAX_DIFF_RATIO, oldPixel = process.env.MIGRATION_IMAGE_PIXEL_THRESHOLD;
  delete process.env.MIGRATION_IMAGE_MAX_DIFF_RATIO; delete process.env.MIGRATION_IMAGE_PIXEL_THRESHOLD;
  try {
    const result = compareImages(baseline, candidate, join(dir, 'diffs'));
    assert.equal(result.status, 'failed'); assert.equal(result.outOfTolerance, 2);
  }
  finally {
    if (oldRatio === undefined) delete process.env.MIGRATION_IMAGE_MAX_DIFF_RATIO; else process.env.MIGRATION_IMAGE_MAX_DIFF_RATIO = oldRatio;
    if (oldPixel === undefined) delete process.env.MIGRATION_IMAGE_PIXEL_THRESHOLD; else process.env.MIGRATION_IMAGE_PIXEL_THRESHOLD = oldPixel;
  }
}));

test('image comparison rejects corrupt and missing screenshots', () => temporary(dir => {
  const baseline = join(dir, 'baseline'), candidate = join(dir, 'candidate'); e2e(baseline); e2e(candidate);
  writeFileSync(join(candidate, 'E2E-001/attempt-0/E2E-001-01/before.png'), 'corrupt');
  const result = compareImages(baseline, candidate, join(dir, 'diffs'));
  assert.equal(result.status, 'failed'); assert.ok(result.errors.some(error => error.includes('Cannot compare')));
}));
