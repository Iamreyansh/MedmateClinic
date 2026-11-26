# The API.
#
# Built on the JDK the service is written for, and run as a user that is not
# root. The migrations are the service's own: it brings its schemas up to date
# when it starts, so the image needs nothing but the jar and a database.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 medmate
COPY --from=build /build/target/medmate-clinic-api-*.jar /app/medmate-clinic-api.jar
USER medmate
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/medmate-clinic-api.jar"]
