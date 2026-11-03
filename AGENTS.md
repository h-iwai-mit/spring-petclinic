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
