---
name: java-to-kotlin-migration
description: Migrate Spring PetClinic production Java to Kotlin while preserving Spring Boot, JPA, unchanged Java JUnit and Playwright behavior, with mechanical baseline parity verification.
---

Read `AGENTS.md`, `docs/migration/baseline.md`, `docs/migration/inventory.yaml`, and the current Git status first. Use the immutable `origin/develop` SHA recorded in the baseline document; never refresh it during a migration. Preserve user changes and work only on the dedicated feature branch. Use an isolated worktree for the Java baseline so candidate changes cannot leak into it.

Inventory every `src/main/**/*.java` file before conversion and mechanically reconcile the inventory with the filesystem. Each entry must retain its original path, package, responsibility, dependencies, Java JUnit coverage, E2E feature mapping, Kotlin destination, migration status, and verification result. Completion requires zero production Java files, a Kotlin destination for every inventory entry, and zero pending entries. Renaming Java files, hiding them outside source roots, excluding them from compilation, or calling them from Kotlin is not migration.

Keep Spring Boot and its major version, Maven, routes, bean names and scopes, dependency injection, exception behavior, database schema, templates and observable behavior unchanged. Configure Kotlin compilation before Java test compilation with compatible `kotlin-stdlib`, `kotlin-reflect`, `kotlin-maven-plugin`, the Spring compiler plugin and JPA/no-arg support where the current model requires it. Do not update unrelated dependencies.

Treat Java interoperability as a public contract. Preserve package and class names, JVM method signatures, JavaBean getters/setters, public no-arg constructors, overloaded methods, static constants and entry points, checked-exception declarations when callers depend on them, and mutable collection behavior. Use `@JvmStatic`, `@JvmField`, `@JvmOverloads`, explicit accessors or backing fields only where needed for parity. Kotlin default arguments do not create Java overloads. Do not change existing Java JUnit sources to accommodate Kotlin.

For JPA, preserve entity/table/column/join/fetch/cascade/order and ID-generation mappings exactly. Entities and mapped superclasses need proxy-compatible openness and no-arg construction. Apply validation and persistence annotations at the correct field/getter use-site so Hibernate and Jakarta Validation keep the same access strategy. Avoid `data class` for entities: generated equality, hashing, copying and string rendering change lazy-loading and identity semantics. Preserve nullable uninitialized state, initialization order, lazy collections and final-vs-mutable collection behavior.

When Java emits a constraint in both `RuntimeVisibleAnnotations` and `RuntimeVisibleTypeAnnotations`, Kotlin field annotations alone can change Bean Validation error ordering. Use `-Xemit-jvm-type-annotations`, annotate the Kotlin property type where parity requires it, and compare the resulting class with `javap -v`; E2E validation text and ordering are part of the observable contract.

Migrate in dependency order: build support, shared model, owner/pet/visit, veterinarian, system/configuration, then application/runtime hints and package documentation. Keep unrelated feature areas in separate assignments. After each stable unit, inspect the diff and run the smallest relevant compile/JUnit set before the full sequential verification. Never report an uncompiled intermediate state as successful.

Run the unchanged Java JUnit suite on both the fixed Java baseline and Kotlin candidate. Save machine-readable class/case names, pass/fail/error/skip status, duration and failure details. A candidate-only failure is a migration regression. Do not delete, disable, filter or loosen tests, and do not change production expectations to match a failure.

Reuse the unchanged Playwright TypeScript suite and canonical E2E specification. Follow `.agents/skills/e2e-automation/SKILL.md`: one browser worker, every operation wrapped in evidence, every expected result asserted, and every action retaining readable full-page before/after PNGs, execution metadata, assertions and chronological logs. Reset or isolate database state between baseline and candidate. Compare identical test IDs, action IDs, transitions, displayed content, validation and persistence results.

Pair screenshots by test ID, action ID, attempt and `before`/`after` type. Fix Chromium, viewport, device scale factor, locale, timezone, fonts, OS, data, animations and capture timing. Save baseline image, candidate image, diff image and JSON containing `testId`, `actionId`, `screenshotType`, `diffPixels`, `diffRatio`, `threshold` and `status`. Investigate every excess difference. Mask only a documented nondeterministic region; never mask a whole page or relax a threshold to obtain success.

Make generated E2E data deterministic without editing scenario expectations. Fix `crypto.randomUUID()` for both runs and request reduced motion before capture. A browser-native validation tooltip may be masked only by an action-specific rectangle recorded with its reason. Establish a small measured focus/caret raster allowance before comparison (this migration uses at most 0.0005 at 1280x900); any larger difference must be investigated and fixed rather than absorbed into the threshold.

Verification is fail-closed. `migration:verify` must require source completeness, Maven verify, JUnit parity, E2E parity, image parity, E2E coverage, evidence integrity and a final report. Missing, stale, empty, corrupt or identity-mismatched baseline/candidate inputs must produce a nonzero exit. Add negative tests for missing baseline, malformed reports, missing actions and corrupt images. A green subset is not a complete result.

When a regression occurs, inspect compilation errors, Surefire XML, trace, per-step screenshots, assertions and logs; fix the Kotlin implementation while preserving the contract. Keep failed attempts. If the same cause fails three times, stop repeating it and revise the approach. Never weaken assertions, validation, evidence requirements, coverage requirements or image thresholds.

Environment lessons from this migration are mandatory:

- Use the repository JDK/toolchain target (Java 17 here) and verify the active runtime before Maven. A newer ambient JDK is not evidence of compatibility; select the configured Temurin 17 toolchain for reproducible baseline/candidate runs.
- Preserve the managed environment's inherited HTTP/HTTPS proxy and CA trust. Do not unset the proxy, disable TLS verification or replace trust settings to work around dependency-download failures. Diagnose policy/readiness and retry through the supported proxy.
- Maven/Testcontainers and Chromium are sequential. Docker layers, databases, traces and screenshots can exhaust disk; inspect capacity first, use bounded heaps, retain required evidence, and remove only explicitly identified disposable artifacts. Do not rebuild or delete the development container.
- An absent baseline SHA, Surefire report, E2E action, assertion log, before/after image or comparison result is a hard failure. Never interpret zero discovered inputs as zero differences.
- Toolchain or environment failures remain recorded failures/blockers until rerun successfully. Never disable a test, change an expected result or relax a validator to compensate.

Record progress and restart commands in `docs/migration/migration-report.md`. Commit only intended source, configuration and compact summaries; do not commit large traces or screenshot trees. Push only the feature branch without force. Create a ready PR only after all mandatory checks exit zero; otherwise preserve work in a Draft PR with exact blockers and do not merge it.
