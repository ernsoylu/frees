# Build stage: compile the Spring Boot fat jar with the Gradle wrapper.
# Pinned to the noble (24.04 LTS) variant to match the runtime stage and keep
# the toolchain off the drifting `:21-jdk` tag.
FROM eclipse-temurin:21-jdk-noble AS build
WORKDIR /app

# Cache the Gradle distribution and dependencies as separate layers.
COPY gradlew settings.gradle build.gradle gradle.lockfile ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon bootJar

# Runtime stage: JRE plus the CoolProp native library for fluid properties and
# the SUNDIALS IDA stack (variable-order BDF DAE integrator + KLU sparse) used
# by the two-phase/refrigeration solver core (Phase S1).
#
# The base is PINNED to the noble (Ubuntu 24.04 LTS) variant ON PURPOSE. The
# floating `:21-jre` tag drifted to Ubuntu 26.04, which ships SUNDIALS v7 whose
# `libsundials_core.so` is linked against OpenMPI. The JNA binding pre-loads
# `sundials_core`, so that load pulled libmpi, whose constructor calls
# MPI_Comm_dup() before MPI_INIT() and ABORTS the JVM on the first IDA solve —
# crashing the compute node (and, via RabbitMQ redelivery, every replica). 24.04
# ships SUNDIALS v6, which has the SUNContext API the binding targets AND links
# no MPI into any library the binding loads. See the build-time guard below,
# which fails the build if a future base bump reintroduces an MPI-linked SUNDIALS.
FROM eclipse-temurin:21-jre-noble
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsundials-dev \
    && rm -rf /var/lib/apt/lists/* \
    # Guard: abort the build if any SUNDIALS library the JNA binding loads
    # (see SundialsIda.load) transitively links MPI. An MPI-linked build aborts
    # the JVM at native load time, so it must never ship. The parallel-nvector
    # libs (which legitimately link MPI) are intentionally NOT in this list —
    # the binding never loads them.
    && for base in sundials_core sundials_ida sundials_nvecserial \
                   sundials_sunmatrixdense sundials_sunlinsoldense \
                   sundials_sunmatrixsparse sundials_sunlinsolklu; do \
         for so in /usr/lib/*/lib${base}.so*; do \
           [ -e "$so" ] || continue; \
           if ldd "$so" 2>/dev/null | grep -qiE 'libmpi|libopenmpi'; then \
             echo "FATAL: $so links MPI — SUNDIALS regressed to an MPI build that aborts the JVM on IDA. Keep the base on a SUNDIALS v6 (MPI-free) release."; \
             exit 1; \
           fi; \
         done; \
       done
COPY --from=build /app/build/libs/*.jar app.jar
COPY native/libCoolProp.so /opt/coolprop/libCoolProp.so
ENV COOLPROP_LIBRARY=/opt/coolprop/libCoolProp.so
RUN useradd --system --no-create-home --uid 10001 frees
USER frees
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
