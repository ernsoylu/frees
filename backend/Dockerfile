# Build stage: compile the Spring Boot fat jar with the Gradle wrapper.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Cache the Gradle distribution and dependencies as separate layers.
COPY gradlew settings.gradle build.gradle gradle.lockfile ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon bootJar

# Runtime stage: JRE plus the CoolProp native library for fluid properties and
# the SUNDIALS IDA stack (variable-order BDF DAE integrator + KLU sparse) used
# by the two-phase/refrigeration solver core (Phase S1). SUNDIALS comes from the
# Ubuntu repo (v6, which has the SUNContext API the JNA binding targets); the
# binding finds libsundials_ida.so via the normal loader path.
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsundials-dev \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/build/libs/*.jar app.jar
COPY native/libCoolProp.so /opt/coolprop/libCoolProp.so
ENV COOLPROP_LIBRARY=/opt/coolprop/libCoolProp.so
RUN useradd --system --no-create-home --uid 10001 frees
USER frees
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
