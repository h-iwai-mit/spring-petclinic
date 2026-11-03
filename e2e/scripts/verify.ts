import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
async function main() {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  process.env.E2E_RUN_ID = runId;
  const dir = join('e2e/evidence', `run-${runId}`); mkdirSync(dir, { recursive: true });
  const stages: { stage: string; status: string; exitCode: number | null; timestamp: string; durationMs: number }[] = [];
  const commands: [string, string[]][] = [
    ['npx', ['tsc', '--noEmit']], ['npm', ['run', 'e2e:test-validators']],
    ['npm', ['run', 'e2e:validate-spec']], ['npm', ['run', 'e2e:check-implementation']],
    ['npm', ['run', 'e2e:check-pom']], ['npm', ['run', 'e2e:test']],
    ['npm', ['run', 'e2e:check-coverage']], ['npm', ['run', 'e2e:check-evidence']],
    ['npm', ['run', 'e2e:report']]
  ];
  for (const [command, args] of commands) {
    const label = `${command} ${args.join(' ')}`, start = Date.now();
    console.log(`\n[verify] ${label}`);
    writeFileSync('docs/e2e/progress.json', JSON.stringify({ status: 'in-progress', runId, currentStage: label, completedStages: stages, resume: 'npm run e2e:verify' }, null, 2) + '\n');
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(command, args, { env: process.env });
      for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
        process.stdout.write(chunk); appendFileSync(join(dir, 'verification.log'), chunk);
      });
      child.on('error', reject); child.on('close', resolve);
    });
    stages.push({ stage: label, status: exitCode === 0 ? 'passed' : 'failed', exitCode,
      timestamp: new Date(start).toISOString(), durationMs: Date.now() - start });
    writeFileSync(join(dir, 'verification.json'), JSON.stringify({ runId, stages, status: exitCode === 0 ? 'running' : 'failed' }, null, 2));
    if (exitCode !== 0) {
      writeFileSync('docs/e2e/progress.json', JSON.stringify({ status: 'incomplete', runId, failedStage: label, exitCode, completedStages: stages, resume: 'Inspect run evidence and fix failures; npm run e2e:verify' }, null, 2) + '\n');
      process.exitCode = exitCode ?? 1; return;
    }
  }
  writeFileSync(join(dir, 'verification.json'), JSON.stringify({ runId, stages, status: 'passed' }, null, 2));
  console.log(`[verify] ALL PASSED: ${dir}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
