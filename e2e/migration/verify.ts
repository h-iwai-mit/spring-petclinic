import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkSources } from './check-sources';
import { compareJUnit } from './compare-junit';
import { compareE2e } from './compare-e2e';
import { compareImages } from './compare-images';
import { validateCandidateEvidence, validateEvidence } from './validate-evidence';
import { artifactRoot, artifactSide, findFiles, finish, resultPath, type ComparisonResult, writeJson } from './common';

interface Stage { name: string; status: 'passed' | 'failed'; details?: unknown }

function snapshotCandidateJUnit(): string[] {
  const root = artifactRoot(), destination = artifactSide('candidate', 'junit');
  if (!(destination === join(root, 'candidate', 'junit') || destination.startsWith(`${root}${sep}`))) {
    return [`Refusing to replace candidate JUnit outside artifact root: ${destination}`];
  }
  rmSync(destination, { recursive: true, force: true });
  const sources = [resolve('target/surefire-reports'), resolve('target/failsafe-reports')];
  let copied = 0;
  for (const source of sources) for (const file of findFiles(source, path => /^TEST-.*\.xml$/.test(basename(path)))) {
    const target = join(destination, basename(source), relative(source, file));
    mkdirSync(dirname(target), { recursive: true }); copyFileSync(file, target); copied++;
  }
  return copied ? [] : ['Maven produced no candidate JUnit XML reports'];
}

function record(result: ComparisonResult, filename: string, stages: Stage[]): void {
  finish(result, resultPath(filename));
  stages.push({ name: result.kind, status: result.status, details: { errors: result.errors.length } });
}

function markdown(stages: Stage[], status: string): string {
  return `# Migration verification report\n\n` +
    `Overall status: **${status}**\n\n` +
    `Artifact root: \`${artifactRoot()}\`\n\n` +
    `| Stage | Status |\n| --- | --- |\n${stages.map(stage => `| ${stage.name} | ${stage.status} |`).join('\n')}\n\n` +
    `Machine-readable details are in \`results/*.json\`; image diffs are in \`results/image-diffs/\`.\n`;
}

async function main() {
  const stages: Stage[] = [];
  record(checkSources(), 'source-comparison.json', stages);

  console.log('[migration] ./mvnw -B verify');
  const maven = spawnSync('./mvnw', ['-B', 'verify'], { stdio: 'inherit', env: process.env });
  const mavenStatus = maven.status === 0 ? 'passed' : 'failed';
  stages.push({ name: 'maven-verify', status: mavenStatus, details: { exitCode: maven.status } });
  const snapshotErrors = maven.status === 0 ? snapshotCandidateJUnit() : ['Candidate JUnit snapshot skipped because Maven verify failed'];
  if (snapshotErrors.length) stages.push({ name: 'candidate-junit-snapshot', status: 'failed', details: snapshotErrors });
  else stages.push({ name: 'candidate-junit-snapshot', status: 'passed' });

  try { record(compareJUnit(), 'junit-comparison.json', stages); }
  catch (error) { record({ kind: 'junit-comparison', status: 'failed', errors: [String(error)] }, 'junit-comparison.json', stages); }
  try { record(compareE2e(), 'e2e-comparison.json', stages); }
  catch (error) { record({ kind: 'e2e-comparison', status: 'failed', errors: [String(error)] }, 'e2e-comparison.json', stages); }
  try { record(compareImages(), 'image-comparison.json', stages); }
  catch (error) { record({ kind: 'image-comparison', status: 'failed', errors: [String(error)] }, 'image-comparison.json', stages); }
  try { record(validateEvidence('baseline'), 'baseline-evidence-comparison.json', stages); }
  catch (error) { record({ kind: 'baseline-evidence-completeness', status: 'failed', errors: [String(error)] }, 'baseline-evidence-comparison.json', stages); }
  try { record(validateCandidateEvidence(), 'evidence-comparison.json', stages); }
  catch (error) { record({ kind: 'candidate-evidence-completeness', status: 'failed', errors: [String(error)] }, 'evidence-comparison.json', stages); }

  const status = stages.every(stage => stage.status === 'passed') ? 'passed' : 'failed';
  const report = { kind: 'migration-verification', status, artifactRoot: artifactRoot(), stages };
  writeJson(resultPath('migration-report.json'), report);
  const reportMarkdown = resultPath('migration-report.md'); mkdirSync(dirname(reportMarkdown), { recursive: true });
  writeFileSync(reportMarkdown, markdown(stages, status));
  console.log(`[migration] ${status.toUpperCase()}: ${reportMarkdown}`);
  if (status !== 'passed') process.exitCode = 1;
}

main().catch(error => {
  console.error(error); process.exitCode = 1;
});
