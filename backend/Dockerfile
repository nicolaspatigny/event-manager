FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN --mount=type=secret,id=gradle_properties,target=/root/.gradle/gradle.properties \
    --mount=type=secret,id=java_truststore,target=/etc/ssl/certs/java/cacerts \
    bash gradlew bootJar --no-daemon
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /app/build/libs/backend-0.0.1-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","app.jar"]
