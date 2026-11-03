import type { Reporter, TestCase, TestResult, FullResult, TestStep } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
export default class RunReporter implements Reporter {
  private results: object[] = [];
  private expects = new Map<string, object[]>();
  onStepEnd(test: TestCase, result: TestResult, step: TestStep) {
    if (step.category !== 'expect') return;
    const testId = test.title.match(/\bE2E-\d{3}\b/)?.[0];
    const key = `${test.id}-${result.retry}`;
    const records = this.expects.get(key) ?? [];
    let parent = step.parent;
    let actionId: string | undefined;
    while (parent && !actionId) { actionId = parent.title.match(/E2E-\d{3}-[\w-]+/)?.[0]; parent = parent.parent; }
    records.push({ assertionId: `${testId}-expect-${records.length + 1}`, testId, actionId,
      expected: step.title, actual: (step.error as any)?.matcherResult?.actual ?? null,
      status: step.error ? 'failed' : 'passed', timestamp: step.startTime.toISOString(),
      durationMs: step.duration, error: step.error?.message });
    this.expects.set(key, records);
  }
  onTestEnd(test: TestCase, result: TestResult) {
    const testId = test.title.match(/\bE2E-\d{3}\b/)?.[0];
    const dir = join('e2e/evidence', `run-${process.env.E2E_RUN_ID}`, testId ?? 'unknown', `attempt-${result.retry}`);
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, 'expect-results.json');
    const detailsPath = join(dir, 'matcher-details.jsonl');
    const details = existsSync(detailsPath) ? readFileSync(detailsPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
    const records = this.expects.get(`${test.id}-${result.retry}`) ?? [];
    const merged = records.map((record: any, index) => ({ ...record, description: record.expected, reporterActionId: record.actionId, ...details[index] }));
    writeFileSync(path, JSON.stringify(merged, null, 2));
    result.attachments.push({ name: 'individual-expect-results', path, contentType: 'application/json' });
    this.results.push({ testId, title: test.title,
      file: test.location.file, retry: result.retry, status: result.status, expectedStatus: test.expectedStatus,
      durationMs: result.duration, errors: result.errors.map(e => e.message), annotations: test.annotations,
      stdout: result.stdout.map(x => x.toString()), stderr: result.stderr.map(x => x.toString()),
      steps: result.steps.map(s => ({ title: s.title, durationMs: s.duration, error: s.error?.message })) });
  }
  onEnd(result: FullResult) {
    const dir = join('e2e/evidence', `run-${process.env.E2E_RUN_ID}`); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'run.json'), JSON.stringify({ runId: process.env.E2E_RUN_ID,
      timestamp: new Date().toISOString(), status: result.status, results: this.results }, null, 2));
    writeFileSync('e2e/evidence/latest.json', JSON.stringify({ runId: process.env.E2E_RUN_ID }));
  }
}
