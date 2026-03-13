FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_URL=http://api-gateway:8080
ARG AUTH_SERVICE_URL=http://api-gateway:8080
ARG NUMEROLOGY_SERVICE_URL=http://api-gateway:8080/api/numerology
ENV BACKEND_URL=$BACKEND_URL
ENV AUTH_SERVICE_URL=$AUTH_SERVICE_URL
ENV NUMEROLOGY_SERVICE_URL=$NUMEROLOGY_SERVICE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV BACKEND_URL=http://api-gateway:8080
ENV AUTH_SERVICE_URL=http://api-gateway:8080
ENV NUMEROLOGY_SERVICE_URL=http://api-gateway:8080/api/numerology
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
