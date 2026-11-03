# Repository Guidelines

## Project Structure & Module Organization

This is a Spring Boot PetClinic application. Production Java code is under `src/main/java/org/springframework/samples/petclinic`, organized by domain (`owner`, `vet`, `model`, and `system`). Templates, messages, database schemas/data, and static assets are under `src/main/resources`; SCSS sources are in `src/main/scss`. Tests mirror the production packages under `src/test/java`. Deployment and development configuration lives in `docker-compose.yml`, `k8s/`, and `.devcontainer/`.

## Build, Test, and Development Commands

Use the Maven wrapper so builds use the repository-pinned Maven version:

- `./mvnw verify` — compile, run checks and tests, and verify the project.
- `./mvnw test` — run the JUnit Platform test suite.
- `./mvnw spring-boot:run` — start the application locally (normally at `http://localhost:8080`).
- `./mvnw spring-javaformat:apply` — apply the configured Java formatting.

The project targets Java 17. Database-specific integration tests may require Docker and the services described by `docker-compose.yml`.

## Coding Style & Naming Conventions

Use four-space indentation, standard Java naming (PascalCase classes, camelCase methods/fields), and package names based on the domain structure. Keep controllers, repositories, entities, and validators in their appropriate domain package. Run `./mvnw spring-javaformat:apply` before submitting Java changes; Checkstyle and nohttp enforce formatting and prohibited HTTP patterns. Name test classes with a `Tests` suffix and test methods after the behavior they verify.

## Testing Guidelines

Tests use JUnit 5 and Spring Boot test support. Add unit or MVC tests beside the affected package; use integration tests for application-context, database, or end-to-end behavior. Run `./mvnw test` locally, and use `./mvnw verify` before review. Keep tests deterministic and avoid committing generated output such as `target/` or `build/`.

## Commit & Pull Request Guidelines

Recent commits use short, descriptive subject lines (for example, `Persist Codespaces development environment settings`). Write commits in the imperative mood and keep each commit focused. Pull requests should explain the user-visible or maintenance change, identify relevant tests run, and call out configuration or database impacts. Include screenshots for template or styling changes and link an issue when one exists.

## Security & Configuration Tips

Do not commit credentials, tokens, or local database files. Keep environment-specific secrets outside tracked properties files, and review changes to `application-*.properties`, Docker, Kubernetes, and devcontainer configuration carefully.

## Browser E2E automation

- `docs/e2e/specification.yaml` is the only maintained test specification. Preserve stable test IDs and globally unique action IDs. Update discoveries with source evidence; classify every discovery as target or excluded with a concrete reason. Never remove unimplemented cases to improve coverage.
- Generate Markdown with `npm run e2e:generate-docs`. Keep `docs/e2e/state-model.json` aligned with actual ordered source/target UI states. Every target discovery and model transition requires an implemented, executed action and successful assertions.
- Use Page Objects under `e2e/pages` for locators and business UI operations. Common navigation belongs in a component. Tests use the evidence fixture, business APIs and Playwright expect; no direct locators, mutations or fixed sleeps. TypeScript AST validation enforces these rules.
- Wrap every operation, including setup navigation and form entry, in `evidence.step(testId, actionId, operation, callback)`. Record every expected result with `evidence.assert`. The reporter also records individual Playwright expect results. Each operation requires readable full-page before/after PNGs, execution.json, assertions and timestamped logs. Preserve failures and retries in separate attempt directories.
- `npm ci && npx playwright install --with-deps chromium` prepares a Codespace; do not rebuild the Dev Container. `npm run e2e:verify` typechecks, tests validators, validates specification/references/implementation/POM, executes Chromium, validates runtime coverage/images/logs and generates reports. It must exit zero before completion.
- Run browser suites sequentially with workers=1; parallel browser discovery caused renderer crashes in this Codespace. Parallelize source research and isolated file edits instead. Do not change application code to make tests pass, mutate seed owners, or send application data externally.
- Parse numeric IDs from redirect URL path segments before matrix parameters such as `;jsessionid`; validate the number before reuse. Search labels and mobile navigation lack accessible names; use the existing stable IDs/classes inside POM. Icon navigation is reliably addressed by title.
- Pin TypeScript 5.9 for the compiler AST API used by validators; the installed TypeScript 7 package has no compiler API. Avoid upgrading without adapting and testing AST analysis.
- Analyze failures from trace, before/after images and assertion logs. Fix the implementation or record an application defect; never weaken expected results. After three identical failures reconsider the approach. Keep `docs/e2e/progress.json` and execution report current so an interrupted session resumes from outstanding IDs.
- Completion requires zero incomplete discoveries, full target discovery/spec/test/action/transition correspondence, all required assertions passing, complete evidence, current generated docs and `npm run e2e:verify` exit0. This bounds coverage to the discovered set; it does not prove absence of unknown operations.

Run Maven/MySQL integration verification and browser E2E verification sequentially as well. Concurrent Maven, Testcontainers and Chromium exhausted this Codespace and caused renderer crashes; keep failed artifacts and rerun with bounded JVM heaps.

For Bootstrap mobile menu toggles, wait for the `.collapsing` class to clear before and after clicking. Visibility alone becomes true during expansion, and a second toggle is ignored until the transition finishes. Keep synchronization in the shared Navigation POM; do not add fixed sleeps or weaken the collapsed-state assertion.

## Java-to-Kotlin migration

- Read `.agents/skills/java-to-kotlin-migration/SKILL.md`, `docs/migration/baseline.md`, and `docs/migration/inventory.yaml` before migration work. Keep the recorded `origin/develop` SHA immutable and isolate its Java build and evidence from the candidate branch.
- Production code belongs under `src/main/kotlin`; completion requires zero Java sources under `src/main`. Keep existing `src/test/java` tests unchanged. Do not retain, hide, exclude or call a production Java implementation from Kotlin.
- Preserve Spring Boot, Maven, package/class/JVM API names, MVC routes, beans, JPA mappings, validation, schema, exceptions, JavaBean properties and Thymeleaf behavior. Entities are not data classes; preserve no-arg/proxy support, nullable initialization, overloads and mutable collections required by Java callers.
- Run source checks, Maven/JUnit parity, unchanged Playwright E2E, action coverage, evidence integrity and before/after screenshot comparison mechanically. Missing baseline or candidate data is failure, not an empty successful comparison. Never disable tests, loosen assertions/validation, mask whole pages or raise thresholds to obtain green results.
- Preserve Java type-use validation metadata with `-Xemit-jvm-type-annotations` when `javap -v` shows it on the baseline; missing type annotations can reorder rendered constraint messages even when JUnit stays green. Use deterministic UUID data and reduced motion for image parity, and document every narrow native-browser mask and measured raster tolerance.
- Use the repository Java 17 toolchain. Preserve managed proxy and CA trust for downloads. Run Maven/Testcontainers and Chromium sequentially, monitor Docker/disk capacity, and do not rebuild the Dev Container. Record toolchain, network, capacity and baseline blockers until a successful rerun replaces them.
- Keep migration commits scoped and push only the feature branch without force. A normal PR requires every mandatory check to pass; use a Draft PR with explicit blockers when environmental constraints prevent complete verification.
