import { test, type Page, type TestInfo } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertionContext } from './assertions';

export class Evidence {
  readonly dir: string;
  private assertions: Record<string, unknown>[] = [];
  private actions = new Set<string>();
  private lastAction?: string;
  browserError(error: string) { this.log('browser-error', this.lastAction, 'observed', 0, error); }
  constructor(private page: Page, private info: TestInfo, readonly testId: string) {
    this.dir = join('e2e/evidence', `run-${process.env.E2E_RUN_ID}`, testId, `attempt-${info.retry}`);
    mkdirSync(this.dir, { recursive: true });
    this.log('test-start', undefined, 'running', 0);
    this.saveAssertions();
  }
  private log(event: string, actionId: string | undefined, status: string, durationMs: number, error?: string) {
    appendFileSync(join(this.dir, 'execution.log'), JSON.stringify({ event, testId: this.testId, actionId,
      timestamp: new Date().toISOString(), durationMs, status, error }) + '\n');
  }
  private saveAssertions() { writeFileSync(join(this.dir, 'assertions.json'), JSON.stringify(this.assertions, null, 2)); }
  private check(testId: string, actionId: string) {
    if (testId !== this.testId || !/^[\w-]+$/.test(actionId)) throw new Error('Evidence ID mismatch');
  }
  async step(testId: string, actionId: string, operation: string, body: () => Promise<unknown>) {
    this.check(testId, actionId);
    if (this.actions.has(actionId)) throw new Error(`Repeated action ${actionId}`);
    this.actions.add(actionId);
    this.lastAction = actionId;
    return test.step(`${testId} / ${actionId}: ${operation}`, async () => {
      const dir = join(this.dir, actionId); mkdirSync(dir, { recursive: true });
      const started = Date.now();
      const record: Record<string, unknown> = { testId, actionId, operation, timestamp: new Date().toISOString(),
        retry: this.info.retry, status: 'running', before: false, after: false };
      this.log('action-start', actionId, 'running', 0);
      let failure: unknown;
      let result: unknown;
      try {
        await this.page.screenshot({ path: join(dir, 'before.png'), fullPage: true }); record.before = true;
        result = await body(); record.status = 'passed';
      } catch (error) { failure = error; record.status = 'failed'; record.error = String(error); }
      finally {
        try { await this.page.screenshot({ path: join(dir, 'after.png'), fullPage: true }); record.after = true; }
        catch (error) { record.status = 'failed'; record.evidenceError = String(error); failure ??= error; }
        record.durationMs = Date.now() - started;
        writeFileSync(join(dir, 'execution.json'), JSON.stringify(record, null, 2));
        this.log('action-end', actionId, String(record.status), Number(record.durationMs), failure ? String(failure) : undefined);
        for (const file of ['before.png', 'after.png', 'execution.json']) {
          try { await this.info.attach(`${actionId}/${file}`, { path: join(dir, file) }); }
          catch (error) { failure ??= error; }
        }
      }
      if (failure) { this.log('error', actionId, 'failed', Date.now() - started, String(failure)); throw failure; }
      return result;
    });
  }
  async assert(testId: string, actionId: string, expected: string, body: () => Promise<unknown>, actual?: () => Promise<unknown>) {
    this.check(testId, actionId);
    if (!this.actions.has(actionId)) throw new Error(`Assertion without action ${actionId}`);
    const started = Date.now();
    const record: Record<string, unknown> = { assertionId: `${actionId}-assert-${this.assertions.length + 1}`,
      testId, actionId, expected, actual: null, timestamp: new Date().toISOString(), status: 'running' };
    this.log('assertion-start', actionId, 'running', 0);
    try { await assertionContext.run({ path: join(this.dir, 'matcher-details.jsonl'), testId, actionId }, () => test.step(`${testId} / ${actionId} assert: ${expected}`, body)); record.status = 'passed'; }
    catch (error) { record.status = 'failed'; record.error = String(error); this.log('error', actionId, 'failed', Date.now() - started, String(error)); throw error; }
    finally {
      if (!actual) { actual = async () => ({ url: this.page.url(), title: await this.page.title() }); }
      if (actual) { try { record.actual = await actual(); } catch (error) { record.actualError = String(error); } }
      record.durationMs = Date.now() - started;
      this.assertions.push(record); this.saveAssertions();
      this.log('assertion-end', actionId, String(record.status), Number(record.durationMs), record.error as string | undefined);
    }
  }
  async finish() {
    this.log('test-end', undefined, this.info.status ?? 'unknown', this.info.duration);
    writeFileSync(join(this.dir, 'test-result.json'), JSON.stringify({ testId: this.testId, retry: this.info.retry,
      status: this.info.status, expectedStatus: this.info.expectedStatus, durationMs: this.info.duration }, null, 2));
    for (const file of ['assertions.json', 'execution.log', 'test-result.json', 'matcher-details.jsonl']) await this.info.attach(file, { path: join(this.dir, file) });
  }
}
