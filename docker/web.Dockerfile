# The web app.
#
# The mock is off: this image exists to talk to the Java service, and the
# production build refuses to be made with the mock on.
FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ENV VITE_USE_MOCK=false
RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
RUN npm install --no-audit --no-fund --omit=dev serve

EXPOSE 3100
CMD ["npx", "serve", "--single", "--listen", "3100", "dist"]
