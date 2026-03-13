FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG EXPO_PUBLIC_APP_ENV=stage
ARG EXPO_PUBLIC_API_BASE_URL_STAGE=http://app.localhost
ENV EXPO_PUBLIC_APP_ENV=$EXPO_PUBLIC_APP_ENV
ENV EXPO_PUBLIC_API_BASE_URL_STAGE=$EXPO_PUBLIC_API_BASE_URL_STAGE
ENV EXPO_PUBLIC_API_BASE_URL_PROD=$EXPO_PUBLIC_API_BASE_URL_STAGE

RUN npx expo export --platform web

FROM nginx:1.27-alpine AS runner
COPY k8s/local/mobile-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

