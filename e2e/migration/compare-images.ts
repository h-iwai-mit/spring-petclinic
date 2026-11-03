import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { PNG } from 'pngjs';
import { artifactRoot, artifactSide, failOnErrors, findFiles, finish, locateE2eRun, requireDirectory, resultPath, type ComparisonResult } from './common';

interface ImageRecord { key: string; path: string }
interface MaskRegion { x: number; y: number; width: number; height: number; reason: string }

const screenshotMasks: Record<string, MaskRegion[]> = {
  'E2E-043/attempt-0/E2E-043-09/after': [
    { x: 400, y: 350, width: 300, height: 70, reason: 'Chromium native date range tooltip has nondeterministic visibility' },
  ],
  'E2E-044/attempt-0/E2E-044-09/after': [
    { x: 400, y: 350, width: 300, height: 70, reason: 'Chromium native date range tooltip has nondeterministic visibility' },
  ],
};

function numberSetting(name: string, fallback: number): number {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`);
  return value;
}

function images(root: string): { records: ImageRecord[]; errors: string[] } {
  const errors = requireDirectory(root, 'E2E image');
  if (errors.length) return { records: [], errors };
  let run: string;
  try { run = locateE2eRun(root); }
  catch (error) { return { records: [], errors: [String(error)] }; }
  const records: ImageRecord[] = [];
  for (const path of findFiles(run, file => /\/(?:before|after)\.png$/.test(file.replaceAll('\\', '/')))) {
    const name = relative(run, path).replaceAll('\\', '/');
    const match = name.match(/^(E2E-\d{3})\/attempt-(\d+)\/(E2E-\d{3}-[\w-]+)\/(before|after)\.png$/);
    if (!match) { errors.push(`Unexpected screenshot path: ${name}`); continue; }
    records.push({ key: `${match[1]}/attempt-${match[2]}/${match[3]}/${match[4]}`, path });
  }
  if (!records.length) errors.push(`No before/after screenshots under ${run}`);
  const keys = new Set<string>();
  for (const record of records) {
    if (keys.has(record.key)) errors.push(`Duplicate screenshot key: ${record.key}`);
    keys.add(record.key);
  }
  return { records: records.sort((a, b) => a.key.localeCompare(b.key)), errors };
}

export function compareImages(baselineRoot = artifactSide('baseline', 'e2e'), candidateRoot = artifactSide('candidate', 'e2e'),
  diffRoot = join(artifactRoot(), 'results', 'image-diffs')): ComparisonResult {
  const maxDiffRatio = numberSetting('MIGRATION_IMAGE_MAX_DIFF_RATIO', 0);
  const pixelThreshold = numberSetting('MIGRATION_IMAGE_PIXEL_THRESHOLD', 0);
  const baseline = images(baselineRoot), candidate = images(candidateRoot);
  const errors = [...baseline.errors, ...candidate.errors];
  const before = new Map(baseline.records.map(item => [item.key, item]));
  const after = new Map(candidate.records.map(item => [item.key, item]));
  const comparisons: Record<string, unknown>[] = [];
  for (const [key, expected] of before) {
    const actual = after.get(key);
    if (!actual) { errors.push(`Candidate is missing screenshot: ${key}`); continue; }
    try {
      const left = PNG.sync.read(readFileSync(expected.path));
      const right = PNG.sync.read(readFileSync(actual.path));
      if (left.width !== right.width || left.height !== right.height) {
        errors.push(`Screenshot dimensions changed for ${key}: ${left.width}x${left.height} -> ${right.width}x${right.height}`);
        comparisons.push({ key, diffPixels: null, diffRatio: 1, threshold: maxDiffRatio, status: 'failed',
          baselineDimensions: [left.width, left.height], candidateDimensions: [right.width, right.height] });
        continue;
      }
      const diff = new PNG({ width: left.width, height: left.height });
      let diffPixels = 0;
      const masks = screenshotMasks[key] ?? [];
      for (let offset = 0; offset < left.data.length; offset += 4) {
        const pixel = offset / 4, x = pixel % left.width, y = Math.floor(pixel / left.width);
        const masked = masks.some(mask => x >= mask.x && x < mask.x + mask.width && y >= mask.y && y < mask.y + mask.height);
        let delta = 0;
        for (let channel = 0; channel < 4; channel++) delta = Math.max(delta, Math.abs(left.data[offset + channel] - right.data[offset + channel]) / 255);
        const changed = !masked && delta > pixelThreshold;
        if (changed) diffPixels++;
        const gray = Math.round((left.data[offset] + left.data[offset + 1] + left.data[offset + 2]) / 3);
        diff.data[offset] = changed ? 255 : gray;
        diff.data[offset + 1] = changed ? 0 : gray;
        diff.data[offset + 2] = changed ? 0 : gray;
        diff.data[offset + 3] = 255;
      }
      const diffRatio = diffPixels / (left.width * left.height);
      const status = diffRatio <= maxDiffRatio ? 'passed' : 'failed';
      const diffPath = join(diffRoot, `${key}.diff.png`);
      mkdirSync(dirname(diffPath), { recursive: true });
      writeFileSync(diffPath, PNG.sync.write(diff));
      const [testId, attempt, actionId, screenshotType] = key.split('/');
      comparisons.push({ testId, attempt, actionId, screenshotType, diffPixels, diffRatio,
        threshold: maxDiffRatio, pixelThreshold, status, masks, baselineImage: expected.path, candidateImage: actual.path, diffImage: diffPath });
      if (status === 'failed') errors.push(`Screenshot difference exceeds threshold for ${key}: ${diffRatio} > ${maxDiffRatio}`);
    }
    catch (error) { errors.push(`Cannot compare screenshot ${key}: ${String(error)}`); }
  }
  for (const key of after.keys()) if (!before.has(key)) errors.push(`Candidate has unexpected screenshot: ${key}`);
  if (!comparisons.length) errors.push('Image comparison contains no paired screenshots');
  return { kind: 'image-comparison', status: errors.length ? 'failed' : 'passed', errors,
    threshold: maxDiffRatio, pixelThreshold, compared: comparisons.length,
    differences: comparisons.filter(item => Number(item.diffPixels) > 0).length,
    outOfTolerance: comparisons.filter(item => item.status === 'failed').length, comparisons };
}

if (require.main === module) {
  try {
    const result = finish(compareImages(), resultPath('image-comparison.json'));
    failOnErrors(result);
  }
  catch (error) {
    const result: ComparisonResult = { kind: 'image-comparison', status: 'failed', errors: [String(error)] };
    finish(result, resultPath('image-comparison.json')); process.exitCode = 1;
  }
}
