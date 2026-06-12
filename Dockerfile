# ── Stage 1: build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build          # → /app/frontend/dist


# ── Stage 2: build backend ────────────────────────────────────────────────────
FROM rust:1.82-alpine AS backend-builder

# musl-dev for static linking on Alpine
RUN apk add --no-cache musl-dev

WORKDIR /app/backend

# Cache dependency layer — copy manifests first, then source
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo 'fn main(){}' > src/main.rs && cargo build --release && rm -rf src

COPY backend/src ./src
# Touch main.rs so cargo knows it changed after the dummy build above
RUN touch src/main.rs && cargo build --release


# ── Stage 3: final runtime image ─────────────────────────────────────────────
FROM alpine:3.20

WORKDIR /app

COPY --from=backend-builder /app/backend/target/release/showdown-backend ./showdown-backend
COPY --from=frontend-builder /app/frontend/dist ./dist

ENV PORT=8080
ENV STATIC_DIR=/app/dist

EXPOSE 8080

CMD ["./showdown-backend"]
