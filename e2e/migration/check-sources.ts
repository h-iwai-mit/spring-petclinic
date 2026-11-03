import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import YAML from 'yaml';
import { artifactRoot, failOnErrors, findFiles, finish, resultPath, type ComparisonResult } from './common';

type InventoryEntry = Record<string, unknown>;

function entries(document: any): InventoryEntry[] {
  const value = Array.isArray(document) ? document : document?.files ?? document?.sources ?? document?.inventory ?? document?.entries;
  if (!Array.isArray(value)) throw new Error('Inventory must contain a files array');
  return value;
}

function field(entry: InventoryEntry, names: string[]): string | undefined {
  for (const name of names) if (typeof entry[name] === 'string') return entry[name] as string;
  return undefined;
}

export function checkSources(projectRoot = resolve('.'), inventoryPath = resolve('docs/migration/inventory.yaml')): ComparisonResult {
  const errors: string[] = [];
  const productionJava = findFiles(resolve(projectRoot, 'src/main'), path => path.endsWith('.java'))
    .map(path => relative(projectRoot, path).replaceAll('\\', '/'));
  const productionKotlin = findFiles(resolve(projectRoot, 'src/main'), path => path.endsWith('.kt'))
    .map(path => relative(projectRoot, path).replaceAll('\\', '/'));
  if (productionJava.length) errors.push(`Production Java sources remain: ${productionJava.join(', ')}`);
  if (!existsSync(inventoryPath)) errors.push(`Missing migration inventory: ${inventoryPath}`);
  let inventory: InventoryEntry[] = [];
  if (existsSync(inventoryPath)) {
    try { inventory = entries(YAML.parse(readFileSync(inventoryPath, 'utf8'))); }
    catch (error) { errors.push(`Invalid migration inventory: ${String(error)}`); }
  }
  if (!inventory.length) errors.push('Migration inventory contains no source entries');
  const javaPaths = new Set<string>();
  const kotlinPaths = new Set<string>();
  for (const [index, entry] of inventory.entries()) {
    const javaPath = field(entry, ['javaPath', 'javaFile', 'java_file', 'java', 'source', 'sourcePath', 'path']);
    const kotlinPath = field(entry, ['kotlinPath', 'kotlinFile', 'kotlin_file', 'kotlin', 'target', 'targetPath']);
    const status = field(entry, ['status', 'migrationStatus', 'migration_status']);
    const label = javaPath ?? `entry ${index + 1}`;
    if (!javaPath?.startsWith('src/main/') || !javaPath.endsWith('.java')) errors.push(`Invalid Java inventory path: ${label}`);
    else if (javaPaths.has(javaPath)) errors.push(`Duplicate Java inventory path: ${javaPath}`);
    else javaPaths.add(javaPath);
    if (!kotlinPath?.startsWith('src/main/') || !kotlinPath.endsWith('.kt')) errors.push(`Invalid Kotlin inventory path for ${label}`);
    else {
      if (kotlinPaths.has(kotlinPath)) errors.push(`Duplicate Kotlin inventory path: ${kotlinPath}`);
      kotlinPaths.add(kotlinPath);
      if (!existsSync(resolve(projectRoot, kotlinPath))) errors.push(`Missing Kotlin source for ${label}: ${kotlinPath}`);
    }
    if (!status || !['migrated', 'verified', 'complete', 'completed'].includes(status.toLowerCase())) errors.push(`Unmigrated inventory status for ${label}: ${status ?? 'missing'}`);
  }
  for (const kotlinPath of productionKotlin) if (!kotlinPaths.has(kotlinPath)) errors.push(`Kotlin source absent from inventory: ${kotlinPath}`);
  return {
    kind: 'migration-source-completeness', status: errors.length ? 'failed' : 'passed', errors,
    inventoryPath: relative(projectRoot, inventoryPath), javaSourceCount: productionJava.length,
    kotlinSourceCount: productionKotlin.length, inventoryCount: inventory.length, unmigratedCount: errors.filter(x => x.includes('Unmigrated')).length,
  };
}

if (require.main === module) {
  const result = finish(checkSources(), resultPath('source-comparison.json'));
  failOnErrors(result);
}
