---
name: e2e-automation
description: Build and extend this PetClinic Playwright E2E suite with structured discoveries, stable specifications, Page Objects, per-operation evidence, and mechanical coverage verification.
---

Read repository AGENTS.md and docs/e2e/progress.json first. Resume outstanding IDs; preserve successful artifacts and failed attempts.

Discover routes/validators, templates/static scripts, and actual browser states independently. When delegation is available, assign research and isolated feature files to separate agents. Keep package/config, canonical YAML, evidence contracts, and reconciliation under one integrator. Serialize browser execution: concurrent discovery and tests caused renderer crashes here.

Persist findings in docs/e2e/discovery-*.json with unique discoveryId, pageId, label, exact controller/template/URL sourceRefs, and target/excluded classification. Explain every exclusion. Reconcile findings across sources; do not omit a behavior because it lacks a validation annotation. For example, blank visit date is permitted and has a positive behavioral test.

Maintain docs/e2e/specification.yaml as the sole canonical specification, including stable test IDs, ordered unique action IDs, preconditions, operation, expected result, source/target states, sourceRefs, POM and test file. Draft JSON files were bootstrap inputs only; edit canonical YAML for future work. Update the state model independently and validate reachability and edge correspondence. Generate Markdown using npm run e2e:generate-docs; never edit generated tables.

Implement page locators and low-level UI actions only in e2e/pages. Expose business operations and read-only observable locators. Keep Playwright expect in tests, within evidence.assert. Wrap every navigation, field-entry business operation, submit and timer advance in evidence.step. Composite field entry may represent one explicit business operation; do not hide multiple page transitions in it. Each action needs its own successful expectation and before/after images.

Use the common fixture/Evidence API and reporter. Preserve operation errors, screenshot failures, all individual expect results, and chronological logs; attach them to HTML reports. Retries have separate directories. Never catch assertion failures to continue as success. Evidence format validation proves file/identity/result consistency, not screenshot semantic correctness.

Run owner search first for new environments, then affected suites sequentially, then npm run e2e:verify. Use traces and before/after images to diagnose failures. Known implementation traps: redirect IDs may include ;jsessionid; native visit-date min blocks submit before server validation; server-validation scenarios explicitly bypass native validation in POM; search labels and icon links require stable IDs/title locators. Observe flash dismissal with Locator.waitFor rather than clock.runFor: the existing timer exception propagates through the clock API. Preserve the pageerror event; do not catch or suppress it. Existing owner flash script can throw on an absent counterpart element; record the defect without suppressing error evidence or changing app code.

Verification is fail-closed: schema/references, AST POM policy, implemented IDs/actions, state transitions, executed actions, passing assertions, decoded before/after PNGs, logs and report agreement. Run negative validator tests before trusting new checks. Do not delete missing cases, exclude failing behavior, regenerate expectations from actual failures, or substitute a subset run for full coverage. Report flakiness and application defects separately. After three failures with the same cause, revise the approach and preserve the diagnosis.

Update progress, coverage matrix and execution report from the latest full run. Completion requires the AGENTS.md mechanical conditions and a zero exit from npm run e2e:verify. Otherwise record the exact blocker, outstanding IDs and restart command.

Run Maven/MySQL integration verification and browser E2E verification sequentially as well. Concurrent Maven, Testcontainers and Chromium exhausted this Codespace and caused renderer crashes; keep failed artifacts and rerun with bounded JVM heaps.

For Bootstrap mobile menu toggles, wait for the `.collapsing` class to clear before and after clicking. Visibility alone becomes true during expansion, and a second toggle is ignored until the transition finishes. Keep synchronization in the shared Navigation POM; do not add fixed sleeps or weaken the collapsed-state assertion.
