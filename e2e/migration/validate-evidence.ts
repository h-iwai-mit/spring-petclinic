import { join } from 'node:path';
import { loadSpec } from '../scripts/contracts';
import { validateRuntime } from '../scripts/runtime';
import { artifactSide, failOnErrors, finish, locateE2eRun, type ComparisonResult, resultPath } from './common';

export function validateEvidence(side: 'baseline' | 'candidate', root = artifactSide(side, 'e2e')): ComparisonResult {
  const errors: string[] = [];
  let runDir: string | undefined;
  try {
    runDir = locateE2eRun(root);
    errors.push(...validateRuntime(loadSpec(), runDir, true));
  }
  catch (error) { errors.push(String(error)); }
  return { kind: `${side}-evidence-completeness`, status: errors.length ? 'failed' : 'passed', errors, runDir };
}

export const validateCandidateEvidence = (root = artifactSide('candidate', 'e2e')) => validateEvidence('candidate', root);

if (require.main === module) {
  const result = finish(validateCandidateEvidence(), resultPath('evidence-comparison.json'));
  failOnErrors(result);
}
