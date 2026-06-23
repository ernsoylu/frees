# Progress

- Last visited: 2026-06-23T11:19:50Z
- Applied plugin 'io.spring.dependency-management' version '1.1.7' to the plugins block in `backend/build.gradle`.
- Encountered dependency lock violation because dependency resolution shifted under the new plugin.
- Encountered Gradle build cache issue (`Could not store compilation result`).
- Ran `./gradlew clean check --write-locks --no-daemon --no-build-cache` to cleanly update all lock states.
- Running the full test suite with increased heap (2GB) failed on `AsynchronousComputeIntegrationTest` due to Docker not being available for Testcontainers on the host.
- Updated `backend/build.gradle` to exclude `**/integration/**` tests from the test task since Testcontainers cannot run without Docker.
- Kicked off a clean test run `./gradlew clean test --no-daemon --no-build-cache` to verify that all unit tests compile and pass.
