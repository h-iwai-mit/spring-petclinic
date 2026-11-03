import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { json, type Spec } from './contracts';
export function latestRun() {
  if (process.env.E2E_RUN_ID) {
    if (!/^[\w.-]+$/.test(process.env.E2E_RUN_ID)) throw new Error('Invalid run ID');
    return join('e2e/evidence', `run-${process.env.E2E_RUN_ID}`);
  }
  if (!existsSync('e2e/evidence/latest.json')) throw new Error('No completed run: run npm run e2e:test');
  const { runId } = json('e2e/evidence/latest.json');
  if (typeof runId !== 'string' || !/^[\w.-]+$/.test(runId)) throw new Error('Invalid run ID');
  return join('e2e/evidence', `run-${runId}`);
}
export function validateRuntime(spec: Spec, runDir: string, images = true): string[] {
  const errors: string[] = [];
  const fail = (s: string) => errors.push(s);
  if (!existsSync(join(runDir, 'run.json'))) return ['Missing run.json'];
  const run = json(join(runDir, 'run.json'));
  if (run.status !== 'passed') fail(`Run failed: ${run.status}`);
  const ids = new Set(spec.tests.map(t => t.testId));
  for (const r of run.results) if (!ids.has(r.testId)) fail(`Unknown runtime test ${r.testId}`);
  for (const t of spec.tests) {
    const runs = run.results.filter((r: any) => r.testId === t.testId).sort((a: any, b: any) => a.retry - b.retry);
    if (!runs.length) { fail(`Unexecuted test ${t.testId}`); continue; }
    const result = runs.at(-1);
    if (result.status !== 'passed' || result.expectedStatus !== 'passed') fail(`Failed test ${t.testId}`);
    if (!String(result.file).endsWith(t.testFile)) fail(`Runtime test file mismatch ${t.testId}`);
    const dir = join(runDir, t.testId, `attempt-${result.retry}`);
    for (const f of ['assertions.json', 'execution.log', 'test-result.json', 'expect-results.json', 'matcher-details.jsonl']) if (!existsSync(join(dir, f))) fail(`Missing ${t.testId}/${f}`);
    if (!existsSync(join(dir, 'assertions.json')) || !existsSync(join(dir, 'execution.log'))) continue;
    const assertions = json(join(dir, 'assertions.json'));
    const individual = existsSync(join(dir, 'expect-results.json')) ? json(join(dir, 'expect-results.json')) : [];
    if (!individual.length || individual.some((a: any) => a.testId !== t.testId || !a.assertionId || !a.expected || !('actual' in a) || a.status !== 'passed' || !Number.isFinite(Date.parse(a.timestamp)) || !t.actions.some(x => x.actionId === a.actionId))) fail(`Invalid individual expect results ${t.testId}`);
    if (new Set(individual.map((a: any) => a.assertionId)).size !== individual.length) fail(`Duplicate individual expect ID ${t.testId}`);
    if (existsSync(join(dir, 'matcher-details.jsonl'))) {
      const details = readFileSync(join(dir, 'matcher-details.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      if (details.length !== individual.length || details.some((d: any, index: number) => {
        const a = individual[index];
        return !a || !d.matcher || !Array.isArray(d.expected) || !('actual' in d) || a.testId !== d.testId || a.actionId !== d.actionId || a.reporterActionId !== d.actionId || a.matcher !== d.matcher || JSON.stringify(a.expected) !== JSON.stringify(d.expected) || JSON.stringify(a.actual) !== JSON.stringify(d.actual) || a.status !== d.status;
      })) fail(`Matcher/reporter inconsistency ${t.testId}`);
    }
    const logs = readFileSync(join(dir, 'execution.log'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
    if (logs[0]?.event !== 'test-start' || logs.at(-1)?.event !== 'test-end' || logs.at(-1)?.status !== 'passed') fail(`Incomplete test log ${t.testId}`);
    if (logs.some((l, i) => i > 0 && Date.parse(l.timestamp) < Date.parse(logs[i - 1].timestamp))) fail(`Nonchronological log ${t.testId}`);
    if (logs.some(l => l.testId !== t.testId || !Number.isFinite(Date.parse(l.timestamp)) || !Number.isFinite(l.durationMs))) fail(`Log identity/timing mismatch ${t.testId}`);
    if (new Set(assertions.map((a: any) => a.assertionId)).size !== assertions.length) fail(`Duplicate assertion ID ${t.testId}`);
    if (assertions.some((a: any) => a.testId !== t.testId || a.status !== 'passed' || !a.expected || !a.assertionId || !('actual' in a) || !Number.isFinite(Date.parse(a.timestamp)) || !t.actions.some(x => x.actionId === a.actionId))) fail(`Failed/invalid assertion ${t.testId}`);
    if (existsSync(join(dir, 'test-result.json'))) {
      const r = json(join(dir, 'test-result.json'));
      if (r.testId !== t.testId || r.retry !== result.retry || r.status !== result.status) fail(`Reporter/evidence contradiction ${t.testId}`);
    }
    const expectedIds = new Set(t.actions.map(a => a.actionId));
    if (existsSync(dir)) for (const f of readdirSync(dir, { withFileTypes: true })) if (f.isDirectory() && !expectedIds.has(f.name)) fail(`Unspecified executed action ${f.name}`);
    for (const a of t.actions) {
      const ad = join(dir, a.actionId);
      for (const f of ['before.png', 'after.png', 'execution.json']) if (!existsSync(join(ad, f))) fail(`Missing evidence ${a.actionId}/${f}`);
      if (existsSync(join(ad, 'execution.json'))) {
        const r = json(join(ad, 'execution.json'));
        if (r.testId !== t.testId || r.actionId !== a.actionId || r.retry !== result.retry) fail(`Wrong evidence identity ${a.actionId}`);
        if (r.status !== 'passed' || r.before !== true || r.after !== true || r.error || r.evidenceError) fail(`Failed action/evidence ${a.actionId}`);
        if (r.operation !== a.operation) fail(`Operation/spec mismatch ${a.actionId}`);
        if (!r.operation || !Number.isFinite(r.durationMs) || !Number.isFinite(Date.parse(r.timestamp))) fail(`Incomplete execution ${a.actionId}`);
      }
      if (images) for (const f of ['before.png','after.png']) if (existsSync(join(ad, f))) {
        try { const png = PNG.sync.read(readFileSync(join(ad, f))); if (png.width < 1 || png.height < 1) throw new Error('Empty PNG'); }
        catch { fail(`Unreadable image ${a.actionId}/${f}`); }
      }
      if (!assertions.some((x: any) => x.actionId === a.actionId && x.status === 'passed')) fail(`Unasserted action ${a.actionId}`);
      for (const event of ['action-start', 'action-end', 'assertion-start', 'assertion-end']) {
        if (!logs.some(l => l.event === event && l.actionId === a.actionId)) fail(`Missing log ${event} ${a.actionId}`);
      }
      if (logs.some(l => l.actionId === a.actionId && ['action-end','assertion-end'].includes(l.event) && l.status !== 'passed')) fail(`Log/result contradiction ${a.actionId}`);
      if (!individual.some((x: any) => x.actionId === a.actionId && x.status === 'passed')) fail(`Missing individual expect ${a.actionId}`);
      const actionStart = logs.findIndex(l => l.event === 'action-start' && l.actionId === a.actionId);
      const actionEnd = logs.findIndex(l => l.event === 'action-end' && l.actionId === a.actionId);
      const assertionStart = logs.findIndex(l => l.event === 'assertion-start' && l.actionId === a.actionId);
      if (actionStart < 0 || actionEnd <= actionStart || assertionStart <= actionEnd) fail(`Invalid event order ${a.actionId}`);
      const end = logs.find(l => l.event === 'action-end' && l.actionId === a.actionId);
      if (end?.status !== 'passed') fail(`Failed action log ${a.actionId}`);
    }
  }
  return errors;
}
