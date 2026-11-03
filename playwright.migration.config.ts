import { defineConfig } from '@playwright/test';

const runId = process.env.E2E_RUN_ID;
if (!runId || !/^[\w.-]+$/.test(runId)) throw new Error('A valid E2E_RUN_ID is required');

export default defineConfig({
  testDir: './e2e/tests', fullyParallel: false, workers: 1,
  timeout: 60_000, expect: { timeout: 8_000 }, retries: 1,
  outputDir: `e2e/evidence/run-${runId}/playwright`,
  reporter: [['./e2e/support/reporter.ts'], ['list'],
    ['html', { outputFolder: `e2e/evidence/run-${runId}/html`, open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8080', browserName: 'chromium', headless: true,
    viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC',
    reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: './mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8080',
    url: 'http://127.0.0.1:8080', reuseExistingServer: false, timeout: 240_000,
    stdout: 'pipe', stderr: 'pipe',
    env: { MAVEN_OPTS: process.env.MAVEN_OPTS ?? '-Xmx384m', JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS ?? '-Xmx512m' } },
});
