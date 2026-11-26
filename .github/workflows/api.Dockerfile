# The API image, built from the jar the workflow compiled.
#
# The backend owns `backend/Dockerfile`, which builds the service from source.
# CI compiles the jar on the runner first — so the integration test has already
# run against the same code — and this image carries it.
FROM eclipse-temurin:21-jre

WORKDIR /app
COPY backend/target/medmate-clinic-api-1.0.0.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
