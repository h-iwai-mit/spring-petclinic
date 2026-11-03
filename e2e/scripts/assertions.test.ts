import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertionContext, expect } from '../support/assertions';

async function withRecords(body: (path: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'petclinic-matcher-'));
  const path = join(dir, 'matcher-details.jsonl');
  try { await body(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const records = (path: string) => readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const context = (path: string, actionId = 'E2E-001-01') => ({ path, testId: 'E2E-001', actionId });

test('successful scalar assertion records evaluated expected and actual values', async () => {
  await withRecords(async path => {
    const dynamicValue = `Owner-${2 + 3}`;
    await assertionContext.run(context(path), async () => { await expect(dynamicValue).toBe('Owner-5'); });
    const [entry] = records(path);
    assert.equal(entry.testId, 'E2E-001'); assert.equal(entry.actionId, 'E2E-001-01');
    assert.equal(entry.matcher, 'toBe'); assert.deepEqual(entry.expected, ['Owner-5']);
    assert.equal(entry.actual, dynamicValue); assert.equal(entry.status, 'passed'); assert.equal(entry.negated, false);
    assert.ok(Number.isFinite(Date.parse(entry.timestamp))); assert.equal(entry.error, undefined);
  });
});

test('failed assertion rejects and retains failure expectation, actual and error', async () => {
  await withRecords(async path => {
    await assert.rejects(assertionContext.run(context(path), async () => { await expect(3).toBe(4); }), /toBe/);
    const [entry] = records(path);
    assert.equal(entry.status, 'failed'); assert.deepEqual(entry.expected, [4]); assert.equal(entry.actual, 3);
    assert.match(entry.error, /toBe/);
  });
});

test('negated expectation records negation and supplied mismatch value', async () => {
  await withRecords(async path => {
    await assertionContext.run(context(path), async () => { await expect('saved').not.toBe('rejected'); });
    const [entry] = records(path);
    assert.equal(entry.negated, true); assert.deepEqual(entry.expected, ['rejected']); assert.equal(entry.actual, 'saved'); assert.equal(entry.status, 'passed');
  });
});

test('failed negation remains failed and rejects', async () => {
  await withRecords(async path => {
    await assert.rejects(assertionContext.run(context(path), async () => { await expect(5).not.toBe(5); }));
    const [entry] = records(path); assert.equal(entry.status, 'failed'); assert.equal(entry.negated, true); assert.equal(entry.actual, 5);
  });
});

test('matcher execution outside Evidence context rejects without producing success evidence', async () => {
  await withRecords(async path => {
    await assert.rejects(async () => { await expect(true).toBe(true); }, /inside evidence.assert/);
    assert.equal(existsSync(path), false);
  });
});

test('multiple matcher arguments and regex arguments remain inspectable', async () => {
  await withRecords(async path => {
    await assertionContext.run(context(path), async () => {
      await expect('Alpha123').toMatch(/^Alpha\d+$/);
      await expect(1.1234).toBeCloseTo(1.12, 2);
      await expect({ nested: [1, 2] }).toEqual({ nested: [1, 2] });
    });
    const entries = records(path);
    assert.deepEqual(entries[0].expected, ['/^Alpha\\d+$/']);
    assert.deepEqual(entries[1].expected, [1.12, 2]); assert.equal(entries[1].actual, 1.1234);
    assert.deepEqual(entries[2].expected, [{ nested: [1, 2] }]); assert.deepEqual(entries[2].actual, { nested: [1, 2] });
  });
});

test('concurrent async contexts retain their own action IDs and output files', async () => {
  await withRecords(async first => withRecords(async second => {
    await Promise.all([
      assertionContext.run(context(first, 'E2E-001-01'), async () => { await Promise.resolve(); await expect('first').toBe('first'); }),
      assertionContext.run(context(second, 'E2E-001-02'), async () => { await Promise.resolve(); await expect('second').toBe('second'); }),
    ]);
    assert.equal(records(first)[0].actionId, 'E2E-001-01'); assert.equal(records(first)[0].actual, 'first');
    assert.equal(records(second)[0].actionId, 'E2E-001-02'); assert.equal(records(second)[0].actual, 'second');
  }));
});

test('unsupported expect variants reject instead of silently bypassing evidence', () => {
  for (const variant of ['soft', 'poll', 'configure', 'extend']) {
    assert.throws(() => (expect as any)[variant], /instrumentation/);
  }
});
