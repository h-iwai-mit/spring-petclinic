# Java Baseline

This document fixes the immutable Java comparison point used by the Java-to-Kotlin migration. Candidate work must not update this reference.

## Source

- Remote: `origin`
- Base branch: `develop`
- Baseline commit: `2b017679254ee77030d4a798ecc034a532eb8d0b`
- Candidate branch: `feature/java-to-kotlin-migration`
- Baseline isolation: a detached Git worktree at the fixed commit

## Environment

| Component | Fixed value |
| --- | --- |
| Spring Boot | 4.1.0 |
| Java target | 17 |
| Runtime JDK | Eclipse Temurin 17.0.17 |
| Maven | 3.9.16 (Maven Wrapper) |
| Node.js | 24.22.1 |
| npm | 11.9.0 |
| Playwright | 1.64.1 |
| Chromium | 155.0.8059.79 (system browser) |
| OS | Linux |
| Browser workers | 1 |
| E2E specification | 49 tests / 299 actions |

The baseline and candidate must use the same Chromium executable, viewport, device scale factor, locale, timezone, fonts, sequential worker setting, seed database state, and animation/screenshot timing rules. Test and evidence output must be stored separately so that neither run can contaminate the other.

## Initial environment observations

- The managed execution environment was initially reported as `starting`; work waited for the environment to become ready before repository inspection.
- The repository's default remote fetch refspec fetched only `main`, so the first general `git fetch origin --prune` did not create `origin/develop`. `git ls-remote --heads origin` confirmed that `develop` existed at the fixed SHA, after which it was fetched explicitly as `develop:refs/remotes/origin/develop`.
- These setup observations are not application test failures. Any baseline Maven, JUnit, E2E, coverage, evidence-integrity, or screenshot result must be retained separately and must not be reclassified as a migration regression.
- Missing baseline evidence or a failed baseline command must never be treated as a successful or empty comparison. The actual command result and remediation are recorded with the generated baseline evidence and final migration report.

## Baseline verification contract

Run Maven verification and browser verification sequentially, preserving the test name, status, skip state, assertion log, execution log, and every action's readable `before.png` and `after.png`. The fixed baseline consists of:

1. `./mvnw verify`
2. the existing Java JUnit suite and Surefire XML results
3. the unchanged Playwright TypeScript E2E suite
4. E2E specification/action/transition coverage validation
5. evidence and image completeness validation

Baseline artifacts are immutable comparison inputs. They are generated outside tracked source and are not committed when large; committed reports contain their checksums, summary, and reproduction commands.
