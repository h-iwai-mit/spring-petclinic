import { AsyncLocalStorage } from 'node:async_hooks';
import { expect as playwrightExpect } from '@playwright/test';
import { appendFileSync } from 'node:fs';
export const assertionContext = new AsyncLocalStorage<{ path: string; testId: string; actionId: string }>();
const safe = (value: unknown): unknown => {
  if (value instanceof RegExp) return String(value);
  if (typeof value === 'function') return '[function]';
  if (value === undefined) return '[undefined]';
  try { return JSON.parse(JSON.stringify(value, (_, v) => v instanceof RegExp ? String(v) : v)); }
  catch { return String(value); }
};
async function observe(subject: any, matcher: string, args: unknown[]) {
  try {
    if (matcher === 'toHaveURL' && typeof subject?.url === 'function') return subject.url();
    if (matcher === 'toHaveAttribute' && typeof subject?.getAttribute === 'function') return await subject.getAttribute(String(args[0]), { timeout: 1000 });
    if (matcher === 'toHaveCount' && typeof subject?.count === 'function') return await subject.count();
    if (['toBeVisible', 'toBeHidden'].includes(matcher) && typeof subject?.isVisible === 'function') return await subject.isVisible();
    if (['toHaveValue','toHaveValues'].includes(matcher) && typeof subject?.inputValue === 'function') return await subject.inputValue({ timeout: 1000 });
    if (typeof subject?.allTextContents === 'function') return await subject.allTextContents();
    return safe(subject);
  } catch (error) { return { observationError: String(error) }; }
}
function wrapMatchers(matchers: any, subject: unknown, negate = false): any {
  return new Proxy(matchers, { get(target, property, receiver) {
    if (['resolves','rejects'].includes(String(property))) throw new Error('Promise matcher chains require explicit instrumentation before use');
    const value = Reflect.get(target, property, receiver);
    if (property === 'not') return wrapMatchers(value, subject, !negate);
    if (typeof value !== 'function' || !String(property).startsWith('to')) return value;
    return async (...args: unknown[]) => {
      const context = assertionContext.getStore();
      if (!context) throw new Error('Playwright expect must run inside evidence.assert');
      const timestamp = new Date().toISOString();
      let status = 'passed', error: unknown;
      try { return await Reflect.apply(value, target, args); }
      catch (failure) { status = 'failed'; error = failure; throw failure; }
      finally {
        appendFileSync(context.path, JSON.stringify({ testId: context.testId, actionId: context.actionId,
          matcher: String(property), negated: negate, expected: args.map(safe),
          actual: await observe(subject, String(property), args), status, timestamp,
          error: error ? String(error) : undefined }) + '\n');
      }
    };
  } });
}
export const expect: typeof playwrightExpect = new Proxy(playwrightExpect, {
  get(target, property, receiver) {
    if (['soft','poll','configure','extend'].includes(String(property))) throw new Error('This expect variant requires evidence instrumentation before use');
    return Reflect.get(target, property, receiver);
  },
  apply(target, thisArg, args) { return wrapMatchers(Reflect.apply(target, thisArg, args), args[0]); }
});
