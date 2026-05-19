# ===== Build stage =====
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Dependencies cachen
COPY go.mod go.sum* ./
RUN go mod download || true

# Source kopieren
COPY . .

# Statisches Binary bauen (API + Seed-Script)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/seed-creators ./cmd/seed-creators

# ===== Runtime stage =====
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -g 1000 app && \
    adduser -D -u 1000 -G app app

WORKDIR /app

COPY --from=builder /app/api /app/api
COPY --from=builder /app/seed-creators /app/seed-creators
COPY --chown=app:app migrations /app/migrations

USER app

EXPOSE 8080

CMD ["/app/api"]
