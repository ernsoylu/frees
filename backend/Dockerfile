# Build stage: compile the Spring Boot fat jar with the Gradle wrapper.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Cache the Gradle distribution and dependencies as separate layers.
COPY gradlew settings.gradle build.gradle gradle.lockfile ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon bootJar

# Runtime stage: JRE plus the CoolProp native library for fluid properties.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
COPY native/libCoolProp.so /opt/coolprop/libCoolProp.so
ENV COOLPROP_LIBRARY=/opt/coolprop/libCoolProp.so
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
