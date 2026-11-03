import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { artifactSide, failOnErrors, finish, locateE2eRun, readJson, requireDirectory, resultPath, stable, type ComparisonResult } from './common';

interface Attempt { key: string; testId: string; retry: number; status: string; expectedStatus: string; file: string; actions: unknown[]; assertions: unknown[]; expects: unknown[]; logs: unknown[] }

function withoutVolatile(value: any): any {
  if (typeof value === 'string') return value.replace(/;jsessionid=[\w]+/g, ';jsessionid=<session>');
  if (Array.isArray(value)) return value.map(withoutVolatile);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (['timestamp', 'durationMs', 'stdout', 'stderr', 'steps', 'errors'].includes(key)) continue;
    result[key] = withoutVolatile(item);
  }
  return result;
}

function jsonLines(path: string): any[] {
  return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

export function readE2e(root: string): { runDir?: string; status?: string; attempts: Attempt[]; errors: string[] } {
  const errors = requireDirectory(root, 'E2E');
  if (errors.length) return { attempts: [], errors };
  let runDir: string;
  try { runDir = locateE2eRun(root); }
  catch (error) { return { attempts: [], errors: [String(error)] }; }
  const run = readJson<any>(join(runDir, 'run.json'));
  if (!Array.isArray(run.results)) errors.push(`Invalid E2E run results: ${join(runDir, 'run.json')}`);
  if (run.status !== 'passed') errors.push(`E2E run is not passing: ${run.status}`);
  const attempts: Attempt[] = [];
  for (const record of Array.isArray(run.results) ? run.results : []) {
    if (typeof record.testId !== 'string' || !/^E2E-\d{3}$/.test(record.testId) || !Number.isInteger(record.retry)) {
      errors.push(`Invalid E2E result identity in ${join(runDir, 'run.json')}`); continue;
    }
    const key = `${record.testId}/attempt-${record.retry}`;
    const dir = join(runDir, record.testId, `attempt-${record.retry}`);
    const required = ['assertions.json', 'expect-results.json', 'execution.log', 'test-result.json'];
    for (const name of required) if (!existsSync(join(dir, name))) errors.push(`Missing E2E evidence ${key}/${name}`);
    const actions: unknown[] = [];
    if (existsSync(dir)) for (const entry of readdirSync(dir, { withFileTypes: true }).filter(x => x.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const execution = join(dir, entry.name, 'execution.json');
      if (!existsSync(execution)) errors.push(`Missing E2E action execution ${key}/${entry.name}`);
      else actions.push(withoutVolatile(readJson(execution)));
    }
    const assertions = existsSync(join(dir, 'assertions.json')) ? withoutVolatile(readJson<any[]>(join(dir, 'assertions.json'))) : [];
    const expects = existsSync(join(dir, 'expect-results.json')) ? withoutVolatile(readJson<any[]>(join(dir, 'expect-results.json'))) : [];
    const logs = existsSync(join(dir, 'execution.log')) ? withoutVolatile(jsonLines(join(dir, 'execution.log'))) : [];
    if (!actions.length) errors.push(`E2E attempt has no actions: ${key}`);
    if (!assertions.length) errors.push(`E2E attempt has no assertions: ${key}`);
    const rawFile = String(record.file).replaceAll('\\', '/');
    const file = rawFile.includes('/e2e/tests/') ? `e2e/tests/${rawFile.split('/e2e/tests/').at(-1)}` : rawFile;
    attempts.push({ key, testId: record.testId, retry: record.retry, status: record.status,
      expectedStatus: record.expectedStatus, file, actions, assertions, expects, logs });
  }
  const keys = new Set<string>();
  for (const attempt of attempts) {
    if (keys.has(attempt.key)) errors.push(`Duplicate E2E attempt: ${attempt.key}`);
    keys.add(attempt.key);
    if (attempt.status !== 'passed' || attempt.expectedStatus !== 'passed') errors.push(`E2E attempt is not passing: ${attempt.key}`);
  }
  if (!attempts.length) errors.push('E2E comparison contains no attempts');
  return { runDir, status: run.status, attempts: attempts.sort((a, b) => a.key.localeCompare(b.key)), errors };
}

export function compareE2e(baselineRoot = artifactSide('baseline', 'e2e'), candidateRoot = artifactSide('candidate', 'e2e')): ComparisonResult {
  const baseline = readE2e(baselineRoot), candidate = readE2e(candidateRoot);
  const errors = [...baseline.errors, ...candidate.errors];
  const before = new Map(baseline.attempts.map(item => [item.key, item]));
  const after = new Map(candidate.attempts.map(item => [item.key, item]));
  for (const [key, expected] of before) {
    const actual = after.get(key);
    if (!actual) { errors.push(`Candidate is missing E2E attempt: ${key}`); continue; }
    for (const field of ['status', 'expectedStatus', 'file', 'actions', 'assertions', 'expects', 'logs'] as const) {
      if (stable(actual[field]) !== stable(expected[field])) errors.push(`E2E ${field} changed for ${key}`);
    }
  }
  for (const key of after.keys()) if (!before.has(key)) errors.push(`Candidate has unexpected E2E attempt: ${key}`);
  const actionCount = (items: Attempt[]) => items.reduce((total, item) => total + item.actions.length, 0);
  return { kind: 'e2e-comparison', status: errors.length ? 'failed' : 'passed', errors,
    baseline: { runDir: baseline.runDir, attempts: baseline.attempts.length, actions: actionCount(baseline.attempts) },
    candidate: { runDir: candidate.runDir, attempts: candidate.attempts.length, actions: actionCount(candidate.attempts) },
    attempts: candidate.attempts.map(item => ({ key: item.key, status: item.status, actionCount: item.actions.length })) };
}

if (require.main === module) {
  const result = finish(compareE2e(), resultPath('e2e-comparison.json'));
  failOnErrors(result);
}
