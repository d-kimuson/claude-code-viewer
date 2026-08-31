# syntax=docker/dockerfile:1.7

FROM node:24-slim AS base
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable pnpm && apt-get update && apt-get install -y git openssh-client && rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN chmod +x scripts/docker-entrypoint.sh
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm build && pnpm prune --prod --ignore-scripts

# @replit/ruspty (used for the in-app terminal) ships no linux-arm64-gnu
# prebuild on npm. Its optional sandbox module uses x86_64-only ptrace
# register layouts (see vendor/ruspty/src/lib.rs patch), so on arm64 we
# vendor + build it from source instead. amd64 keeps using the upstream
# @replit/ruspty-linux-x64-gnu prebuild as before (this stage is a no-op).
ARG TARGETARCH

FROM base AS ruspty-builder-amd64
RUN mkdir -p /out

FROM base AS ruspty-builder-arm64
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl build-essential ca-certificates git pkg-config python3 \
    && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"
WORKDIR /ruspty
COPY vendor/ruspty/ .
RUN npm install --no-audit --no-fund && npx napi build --platform --release \
    && mkdir -p /out && cp ruspty.linux-arm64-gnu.node /out/

FROM ruspty-builder-${TARGETARCH} AS ruspty-builder

FROM base AS runner
WORKDIR /app
ENV CCV_ENV=production \
    PORT=3400 \
    HOSTNAME=0.0.0.0 \
    PATH="/app/node_modules/.bin:${PATH}"
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY package.json pnpm-lock.yaml ./
COPY --from=ruspty-builder /out/ /tmp/ruspty-artifacts/
RUN if [ -n "$(ls -A /tmp/ruspty-artifacts 2>/dev/null)" ]; then \
      dest=$(find /app/node_modules/.pnpm -maxdepth 1 -type d -name '@replit+ruspty@*'); \
      cp /tmp/ruspty-artifacts/*.node "$dest/node_modules/@replit/ruspty/dist/"; \
    fi \
    && rm -rf /tmp/ruspty-artifacts
EXPOSE 3400
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
