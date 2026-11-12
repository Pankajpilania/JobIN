FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json

RUN npm ci --workspace=apps/api --include-workspace-root=false

COPY apps/api ./apps/api

RUN npm run db:generate --workspace=apps/api \
  && npm run build --workspace=apps/api

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /workspace

ARG TARGETARCH
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl poppler-utils tesseract-ocr curl \
  && case "$TARGETARCH" in \
    amd64) TECTONIC_ARCH="x86_64"; TECTONIC_SHA256="60b13a0826ae7ad9ce34b4a2df06bff2cfcfa6dda8a915477c0cbb84e1a4a902" ;; \
    arm64) TECTONIC_ARCH="aarch64"; TECTONIC_SHA256="f9aa39017dbd51f111fdb93dda222178cbe51c8193508fc567b523cc74fff9c1" ;; \
    *) echo "Unsupported Docker architecture for Tectonic: $TARGETARCH" >&2; exit 1 ;; \
  esac \
  && curl --proto '=https' --tlsv1.2 -fsSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.16.9/tectonic-0.16.9-${TECTONIC_ARCH}-unknown-linux-musl.tar.gz" -o /tmp/tectonic.tar.gz \
  && echo "$TECTONIC_SHA256  /tmp/tectonic.tar.gz" | sha256sum -c - \
  && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin tectonic \
  && chmod 0755 /usr/local/bin/tectonic \
  && rm -f /tmp/tectonic.tar.gz \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY apps/api/prisma ./apps/api/prisma

RUN npm ci --omit=dev --workspace=apps/api --include-workspace-root=false \
  && npm run db:generate --workspace=apps/api \
  && npm cache clean --force \
  && chown -R node:node /workspace

COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist

RUN printf '%s\n' \
  '\documentclass[10pt,a4paper]{article}' \
  '\usepackage[margin=0.65in]{geometry}' \
  '\usepackage[T1]{fontenc}' \
  '\usepackage[utf8]{inputenc}' \
  '\usepackage{xcolor}' \
  '\usepackage{enumitem}' \
  '\usepackage{titlesec}' \
  '\usepackage{needspace}' \
  '\usepackage{fancyhdr}' \
  '\usepackage[colorlinks=true]{hyperref}' \
  '\usepackage{helvet}' \
  '\begin{document}' \
  'JobIN resume template prewarm.' \
  '\end{document}' > /tmp/jobin-resume-prewarm.tex \
  && mkdir -p /home/node/.cache \
  && chown -R node:node /home/node/.cache /tmp/jobin-resume-prewarm.tex

ENV HOME=/home/node
USER node
WORKDIR /workspace/apps/api

RUN tectonic --untrusted --outdir /tmp /tmp/jobin-resume-prewarm.tex \
  && rm -f /tmp/jobin-resume-prewarm.tex /tmp/jobin-resume-prewarm.pdf

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start:prod"]
