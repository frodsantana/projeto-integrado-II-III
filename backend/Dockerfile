FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY backend/.mvn ./backend/.mvn
COPY backend/mvnw ./backend/mvnw
COPY backend/pom.xml ./backend/pom.xml
COPY backend/src ./backend/src
WORKDIR /workspace/backend
RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/backend/target/academico-api-0.1.0-SNAPSHOT.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]