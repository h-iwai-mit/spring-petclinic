import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export type ComparisonStatus = 'passed' | 'failed';

export interface ComparisonResult {
  kind: string;
  status: ComparisonStatus;
  errors: string[];
  [key: string]: unknown;
}

export function artifactRoot(): string {
  return resolve(process.env.MIGRATION_ARTIFACT_ROOT ?? 'migration-artifacts');
}

export function artifactSide(side: 'baseline' | 'candidate', area: 'junit' | 'e2e'): string {
  const override = process.env[`MIGRATION_${side.toUpperCase()}_${area.toUpperCase()}`];
  return resolve(override ?? join(artifactRoot(), side, area));
}

export function resultPath(name: string): string {
  return join(artifactRoot(), 'results', name);
}

export function readJson<T = any>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function finish(result: ComparisonResult, output: string): ComparisonResult {
  writeJson(output, result);
  if (result.status === 'failed') {
    for (const error of result.errors) console.error(error);
  }
  else console.log(`${result.kind}: passed`);
  return result;
}

export function failOnErrors(result: ComparisonResult): void {
  if (result.errors.length) result.status = 'failed';
  if (result.status === 'failed') process.exitCode = 1;
}

export function requireDirectory(path: string, label: string): string[] {
  if (!existsSync(path)) return [`Missing ${label} directory: ${path}`];
  try {
    if (!readdirSync(path).length) return [`Empty ${label} directory: ${path}`];
  }
  catch {
    return [`Invalid ${label} directory: ${path}`];
  }
  return [];
}

export function findFiles(root: string, accept: (path: string) => boolean): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && accept(path)) found.push(path);
    }
  };
  visit(root);
  return found.sort();
}

export function locateE2eRun(path: string): string {
  if (existsSync(join(path, 'run.json'))) return path;
  const latest = join(path, 'latest.json');
  if (existsSync(latest)) {
    const value = readJson(latest);
    if (typeof value?.runId !== 'string' || !/^[\w.-]+$/.test(value.runId)) throw new Error(`Invalid run ID in ${latest}`);
    const named = join(path, `run-${value.runId}`);
    if (!existsSync(join(named, 'run.json'))) throw new Error(`Missing run referenced by ${latest}`);
    return named;
  }
  const runs = existsSync(path) ? readdirSync(path, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('run-') && existsSync(join(path, entry.name, 'run.json')))
    .map(entry => join(path, entry.name)) : [];
  if (runs.length !== 1) throw new Error(`Expected exactly one E2E run under ${path}, found ${runs.length}`);
  return runs[0];
}

export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}
