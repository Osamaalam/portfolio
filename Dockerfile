# =========================================================
# Stage 1: Install Node.js Dependencies
# =========================================================
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# =========================================================
# Stage 2: Build the Next.js Application
# =========================================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DOCKER_BUILD=true
RUN npm run build

# =========================================================
# Stage 3: Lightweight Production Runner (Node + Python ML)
# =========================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install Python 3, pip, venv, and critical OpenCV graphics dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up an isolated, secure Python Virtual Environment inside /opt/venv
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install lightweight CPU-only PyTorch (keeps image slim) and Ultralytics
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip3 install --no-cache-dir ultralytics

# Copy Next.js production files & assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy pre-downloaded, verified model assets (very important!)
COPY --from=builder /app/mobileclip_blt.ts ./mobileclip_blt.ts

EXPOSE 3000
CMD ["node", "server.js"]
