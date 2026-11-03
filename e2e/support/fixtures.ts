import { test as base } from '@playwright/test';
import { Evidence } from './evidence';
export const test = base.extend<{ evidence: Evidence }>({
  evidence: [async ({ page }, use, info) => {
    const id = info.title.match(/\bE2E-\d{3}\b/)?.[0];
    if (!id) throw new Error('Every test requires a stable test ID');
    const evidence = new Evidence(page, info, id);
    page.on('console', msg => { if (msg.type() === 'error') { evidence.browserError(msg.text()); info.annotations.push({ type: 'console-error', description: msg.text() }); } });
    page.on('pageerror', error => { evidence.browserError(String(error)); info.annotations.push({ type: 'page-error', description: String(error) }); });
    try { await use(evidence); } finally { await evidence.finish(); }
  }, { auto: true }]
});
export { expect } from './assertions';
