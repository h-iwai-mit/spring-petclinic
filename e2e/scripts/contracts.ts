import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv';
export interface Action {
  actionId: string; operation: string; expected: string; sourceState: string; targetState: string;
  sourceRefs: string[]; evidence: { before: true; after: true }; pageId: string; pageObject: string;
}
export interface Scenario { testId: string; pageId: string; preconditions: string[]; pageObject: string; testFile: string; actions: Action[] }
export interface Spec { version: number; pages: { pageId: string }[]; tests: Scenario[] }
export interface Discovery { discoveryId: string; pageId: string; label: string; sourceRefs: string[];
  classification: 'target' | 'excluded' | 'incomplete'; reason?: string }
export interface Model { initialState: string; states: { stateId: string; pageId: string }[];
  transitions: { transitionId: string; testId: string; actionId: string; sourceState: string; targetState: string }[] }
export const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
export const loadSpec = (): Spec => YAML.parse(readFileSync('docs/e2e/specification.yaml', 'utf8'));
export const discoveries = (): Discovery[] => readdirSync('docs/e2e').filter(f => /^discovery-.*\.json$/.test(f))
  .flatMap(f => json(join('docs/e2e', f)).actions);
function sourceExists(ref: string): boolean {
  const path = ref.split(':')[0];
  if (existsSync(path)) return true;
  const kotlinPath = path.replace(/^src\/main\/java\//, 'src/main/kotlin/').replace(/\.java$/, '.kt');
  return kotlinPath !== path && existsSync(kotlinPath);
}
export function markdown(spec: Spec): string {
  const cell = (value: unknown) => (Array.isArray(value) ? value.join('; ') : String(value)).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return '<!-- Generated from specification.yaml. Do not edit. -->\n# E2E試験仕様書\n\n' +
    '| 試験ID | ページ | アクション | 事前条件 | オペレーション | OK基準 | Page Object | テストファイル |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    spec.tests.flatMap(t => t.actions.map((a, i) => '| ' + [t.testId, a.pageId, `${i + 1}. ${a.actionId}`, t.preconditions,
      a.operation, a.expected, a.pageObject, t.testFile].map(cell).join(' | ') + ' |')).join('\n') + '\n';
}
export function validateSpec(spec: Spec, found: Discovery[], model: Model): string[] {
  const errors: string[] = [];
  const schema = json('docs/e2e/specification.schema.json');
  const validate = new Ajv({ allErrors: true }).compile(schema);
  if (!validate(spec)) return (validate.errors ?? []).map(e => `schema ${e.instancePath}: ${e.message}`);
  const unique = (ids: string[], kind: string) => { if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${kind}`); };
  const pages = new Set(spec.pages.map(p => p.pageId));
  const states = new Map(model.states.map(s => [s.stateId, s]));
  const refs = new Map(found.map(d => [d.discoveryId, d]));
  unique(spec.pages.map(p => p.pageId), 'page ID'); unique(spec.tests.map(t => t.testId), 'test ID');
  unique(spec.tests.flatMap(t => t.actions.map(a => a.actionId)), 'action ID');
  unique(found.map(d => d.discoveryId), 'discovery ID'); unique(model.states.map(s => s.stateId), 'state ID');
  unique(model.transitions.map(t => t.transitionId), 'transition ID');
  unique(model.transitions.map(t => t.actionId), 'transition action ID');
  for (const state of model.states) if (!pages.has(state.pageId)) errors.push(`Unknown state page ${state.pageId}`);
  for (const d of found) {
    if (!pages.has(d.pageId)) errors.push(`Unknown discovery page ${d.pageId}`);
    if (!d.sourceRefs.length) errors.push(`Missing discovery source ${d.discoveryId}`);
    for (const ref of d.sourceRefs) if (ref.startsWith('src/') && !sourceExists(ref)) errors.push(`Missing source file ${ref}`);
    if (d.classification === 'incomplete' || !['target', 'excluded'].includes(d.classification)) errors.push(`Unclassified ${d.discoveryId}`);
    if (d.classification === 'excluded' && !d.reason?.trim()) errors.push(`Missing exclusion reason ${d.discoveryId}`);
  }
  const used = new Set<string>();
  const actions = new Map<string, { testId: string; action: Action }>();
  for (const t of spec.tests) {
    if (!pages.has(t.pageId)) errors.push(`Unknown page ${t.pageId}`);
    if (!existsSync(t.testFile)) errors.push(`Missing test file ${t.testFile}`);
    for (const [index, a] of t.actions.entries()) {
      if (!a.actionId.startsWith(t.testId + '-')) errors.push(`Action/test ID mismatch ${a.actionId}`);
      if (a.sourceState !== (index === 0 ? model.initialState : t.actions[index - 1].targetState)) errors.push(`Discontinuous scenario state ${a.actionId}`);
      actions.set(a.actionId, { testId: t.testId, action: a });
      if (!pages.has(a.pageId)) errors.push(`Unknown action page ${a.pageId}`);
      if (!existsSync(a.pageObject.split('#')[0])) errors.push(`Missing POM ${a.pageObject}`);
      if (!states.has(a.sourceState) || !states.has(a.targetState)) errors.push(`Unknown state ${a.actionId}`);
      for (const ref of a.sourceRefs) { if (!refs.has(ref)) errors.push(`Unknown discovery ${ref}`); used.add(ref); }
    }
  }
  for (const d of found) if (d.classification === 'target' && !used.has(d.discoveryId)) errors.push(`Uncovered discovery ${d.discoveryId}: ${d.label}`);
  for (const tr of model.transitions) {
    const match = actions.get(tr.actionId);
    if (!states.has(tr.sourceState) || !states.has(tr.targetState)) errors.push(`Unknown transition state ${tr.transitionId}`);
    if (!match || match.testId !== tr.testId || match.action.sourceState !== tr.sourceState || match.action.targetState !== tr.targetState)
      errors.push(`Unmatched transition ${tr.transitionId}`);
  }
  for (const id of actions.keys()) if (!model.transitions.some(tr => tr.actionId === id)) errors.push(`Unmodeled action ${id}`);
  const reachable = new Set([model.initialState]);
  if (!states.has(model.initialState)) errors.push('Unknown initial state');
  let changed = true;
  while (changed) { changed = false; for (const t of model.transitions) if (reachable.has(t.sourceState) && !reachable.has(t.targetState)) { reachable.add(t.targetState); changed = true; } }
  for (const id of states.keys()) if (!reachable.has(id)) errors.push(`Unreachable state ${id}`);
  return errors;
}
