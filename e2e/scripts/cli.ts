import { readFileSync, writeFileSync } from 'node:fs';
import { loadSpec, discoveries, json, markdown, validateSpec } from './contracts';
import { analyze, implementationErrors } from './ast';
import { latestRun, validateRuntime } from './runtime';
const mode = process.argv[2];
const spec = loadSpec();
let errors: string[] = [];
if (mode === 'generate') writeFileSync('docs/e2e/test-specification.md', markdown(spec));
else if (mode === 'spec') {
  errors = validateSpec(spec, discoveries(), json('docs/e2e/state-model.json'));
  if (readFileSync('docs/e2e/test-specification.md', 'utf8') !== markdown(spec)) errors.push('YAML/Markdown drift: npm run e2e:generate-docs');
} else if (mode === 'pom') errors = analyze().errors;
else if (mode === 'implementation') errors = implementationErrors(spec);
else if (mode === 'coverage' || mode === 'evidence') {
  errors = [...validateSpec(spec, discoveries(), json('docs/e2e/state-model.json')), ...implementationErrors(spec)];
  errors.push(...validateRuntime(spec, latestRun(), mode === 'evidence'));
} else throw new Error(`Unknown validation ${mode}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`${mode}: passed (${spec.tests.length} tests, ${spec.tests.reduce((n, t) => n + t.actions.length, 0)} actions)`);
