## 2026-06-23T10:59:53Z

You are the Initial Codebase Explorer. Your task is to investigate the existing Java backend codebase to prepare for refactoring the Spring Boot application into a decoupled asynchronous system using RabbitMQ and Redis.
Specifically:
1. Examine `com.frees.backend.api.SolveController` and `com.frees.backend.api.OptimizeController`. Map out their request formats, the mathematical solvers they invoke, and their dependency trees.
2. Check how calculations are performed and what shared state/caches (like `SolveContextCache`) exist in `com.frees.backend.api`.
3. Analyze the existing backend test suite, particularly `SolveControllerTest.java` and other controller or integration tests, to see how requests/responses are currently verified.
4. Document the gradle build dependencies (in `build.gradle`) and current configuration (`application.properties`).
Write your findings to a handoff file `handoff.md` in your working directory, which is `/home/eren/dev/frEES/.agents/teamwork_preview_explorer_initial/`. Include absolute paths to key files.
