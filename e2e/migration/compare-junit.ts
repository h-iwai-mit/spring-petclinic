import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { artifactSide, failOnErrors, findFiles, finish, requireDirectory, resultPath, type ComparisonResult } from './common';

type TestStatus = 'passed' | 'failed' | 'error' | 'skipped';
interface TestCase { key: string; classname: string; name: string; status: TestStatus; source: string; message?: string }

const decode = (value: string) => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w.-]+)\s*=\s*(["'])(.*?)\2/gs)) result[match[1]] = decode(match[3]);
  return result;
}

export function readJUnit(root: string): { cases: TestCase[]; errors: string[] } {
  const errors = requireDirectory(root, 'JUnit');
  const files = findFiles(root, path => /^TEST-.*\.xml$/.test(basename(path)));
  if (!files.length) errors.push(`No JUnit TEST-*.xml reports under ${root}`);
  const cases: TestCase[] = [];
  for (const file of files) {
    const xml = readFileSync(file, 'utf8');
    const matches = [...xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)];
    if (!matches.length && /<testsuite\b/.test(xml) && !/tests="0"/.test(xml)) errors.push(`No parseable test cases in ${file}`);
    for (const match of matches) {
      const attrs = attributes(match[1]);
      const body = match[2] ?? '';
      if (!attrs.classname || !attrs.name) { errors.push(`JUnit test missing classname/name in ${file}`); continue; }
      let status: TestStatus = 'passed';
      if (/<failure\b/.test(body)) status = 'failed';
      else if (/<error\b/.test(body)) status = 'error';
      else if (/<skipped\b/.test(body)) status = 'skipped';
      const detail = body.match(/<(?:failure|error|skipped)\b([^>]*)>/)?.[1];
      cases.push({ key: `${attrs.classname}#${attrs.name}`, classname: attrs.classname, name: attrs.name, status,
        source: basename(file), message: detail ? attributes(detail).message : undefined });
    }
  }
  const seen = new Set<string>();
  for (const item of cases) {
    if (seen.has(item.key)) errors.push(`Duplicate JUnit test identity: ${item.key}`);
    seen.add(item.key);
  }
  return { cases: cases.sort((a, b) => a.key.localeCompare(b.key)), errors };
}

export function compareJUnit(baselineRoot = artifactSide('baseline', 'junit'), candidateRoot = artifactSide('candidate', 'junit')): ComparisonResult {
  const baseline = readJUnit(baselineRoot), candidate = readJUnit(candidateRoot);
  const errors = [...baseline.errors, ...candidate.errors];
  const before = new Map(baseline.cases.map(item => [item.key, item]));
  const after = new Map(candidate.cases.map(item => [item.key, item]));
  for (const [key, expected] of before) {
    const actual = after.get(key);
    if (!actual) errors.push(`Candidate is missing JUnit test: ${key}`);
    else if (actual.status !== expected.status) errors.push(`JUnit status changed for ${key}: ${expected.status} -> ${actual.status}`);
  }
  for (const key of after.keys()) if (!before.has(key)) errors.push(`Candidate has unexpected JUnit test: ${key}`);
  for (const item of baseline.cases) if (item.status !== 'passed') errors.push(`Baseline JUnit is not passing: ${item.key} (${item.status})`);
  for (const item of candidate.cases) if (item.status !== 'passed') errors.push(`Candidate JUnit is not passing: ${item.key} (${item.status})`);
  const summary = (items: TestCase[]) => ({ total: items.length, passed: items.filter(x => x.status === 'passed').length,
    failed: items.filter(x => x.status === 'failed').length, errors: items.filter(x => x.status === 'error').length,
    skipped: items.filter(x => x.status === 'skipped').length });
  return { kind: 'junit-comparison', status: errors.length ? 'failed' : 'passed', errors,
    baseline: summary(baseline.cases), candidate: summary(candidate.cases),
    tests: candidate.cases.map(item => ({ key: item.key, baseline: before.get(item.key)?.status ?? 'missing', candidate: item.status })) };
}

if (require.main === module) {
  const result = finish(compareJUnit(), resultPath('junit-comparison.json'));
  failOnErrors(result);
}
