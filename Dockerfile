FROM node:26.8.1-alpine3.24 AS frontend
WORKDIR /app

COPY web/package.json web/pnpm-lock.yaml* web/pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.npm \
  npm install -g pnpm@11.24.0
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

COPY web/ .

RUN CI=true pnpm build

FROM golang:1.27.0-alpine3.24 AS build
ARG VERSION=dev

WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
COPY --from=frontend /app/dist ./static/dist

RUN --mount=type=cache,target=/go/pkg/mod \
  --mount=type=cache,target=/root/.cache/go-build \
  CGO_ENABLED=0 go build -trimpath \
  -ldflags "-s -w -X github.com/nimap-dev/nimap/internal/config.Version=${VERSION:-dev}" \
  -o ./nimap ./cmd/nimap

FROM alpine:3.24 AS runner

RUN addgroup --system --gid 1001 gorun
RUN adduser --system --uid 1001 gorun

COPY --from=build --chown=gorun:gorun /src/nimap /nimap

USER gorun
EXPOSE 8080
ENTRYPOINT ["/nimap"]
