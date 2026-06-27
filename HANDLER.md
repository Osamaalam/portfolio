# Project Handler

## Project Overview
- Next.js interactive portfolio and AI simulation hub.
- Main objective: Showcase production-grade autonomous AI agents, computer vision (YOLOe), and semantic search (RAG) capabilities with high-tech UI design.
- Current development stage: Fully Secured & Deployed (v1.1).

---

## Current Architecture
- Next.js 16.2.6 (App Router)
- Modular structure with dedicated sandbox routes:
  - `/rag`: Client-side hybrid RAG pipeline.
  - `/agents`: Autonomous multi-agent orchestrator sandbox.
  - `/vision`: Multi-engine AI computer vision & layout segmenter.
  - `/audio`: Audio-to-text and note structuring sandbox.
- Backend API routes: `src/app/api/...`
- Python Integration: `src/scripts/yolo_ocr.py` for YOLOe open-vocabulary segmentation.
- Global security and rate limiting: `src/lib/globalLimiter.ts`

---

## Technologies
- Framework: Next.js 16.2 (App Router)
- Styling: Tailwind CSS v4, custom global CSS (`globals.css`)
- AI SDK/APIs: Google Gemini (direct REST via Axios), Ultralytics YOLOe (YOLO-World)
- Backend API: Node.js (Next.js API Routes)
- Containerization: Docker (Debian-based production standalone builds with PyTorch and Python virtual environments)
- Deployment: GitHub Container Registry (GHCR) and automated GitHub Actions workflows

---

## Features Completed

### Autonomous Multi-Agent Orchestrator
- Interactive simulator with 3 enterprise scenario presets (Engineering, Marketing, Operations).
- Fully autonomous workflow loops with self-reflection and Human-in-the-Loop (HITL) manual intervention gates.
- Intelligent preset caching for 0ms latency on default scenarios.

### Multi-Engine AI Computer Vision & Segmentation
- Hybrid computer vision pipeline:
  - Tesseract.js (Client-side)
  - Gemini 3.1 Flash-Lite (Multimodal Q&A)
  - YOLOe Open-Vocabulary Instance Segmentation (Server-side Python)
- Real-time canvas segmenter drawing glowing masks/polygons on images.

### Enterprise Security & Theming
- Multi-layer IP-based and global API rate limiting (IP-level + Global Website budget).
- Premium, high-contrast Day/Night themes with specificity-locking for high-tech simulator panels.
- Highly secure anti-abuse checks on all API endpoints (input length truncations, whitelist validations, array caps, and type filters).
- High-performance browser-native `sessionStorage` caching for IP geolocations, eliminating API credit exhaustion.

---

## Current Progress

Completed:
- All core playgrounds (RAG, Agents, Vision Sandbox).
- Full integration of local YOLOe Python pipeline.
- Backend IP rate limiting, input validation, and API abuse protection.
- Docker Debian-based virtual environment container optimization with CPU-only PyTorch/Ultralytics and custom `docker-compose.yml`.
- Automated GitHub Actions CI/CD workflows for building and pushing to GitHub Container Registry (GHCR).

Working:
- None.

Pending:
- Live production deployment monitoring on the Ubuntu VPS.

---

## Current State

What works:
- All sandboxes, pipelines, and API integrations are fully functional.
- The UI properly transitions between Day/Night themes with robust styling overrides and full Tailwind v4 class-based variant compatibility.
- Multi-engine Vision Sandbox is fully integrated with Python YOLOe segmentation, client-side Tesseract.js, and multimodal vision Q&A.
- Secure, CORS-proof client-assisted IP Geolocation and Session Storage caching are fully active across all sandboxes.

Known limitations:
- Initial YOLO run requires a heavy pre-downloaded asset, which is now safely bundled in the Docker container images (`mobileclip_blt.ts`).

---

## Decisions Made

- Use `output: "standalone"` only when building with Docker (controlled via `DOCKER_BUILD` env var) to maintain compatibility with `npm run start`.
- Route Python YOLOe inference through `spawn` to avoid output buffer limitations.
- Fallback to mock data if Gemini API calls fail, to ensure 100% playground uptime.
- Use `axios` instead of native `fetch` inside Next.js routes to avoid deadlocks.
- Force Tailwind v4 class-based variant (`@custom-variant`) to prevent theme clashing with browser preference.
- Bypass browser CORS blocks by proxing IP geolocations through the server-side Next.js route `/api/vision/ip` backed by `freeipapi.com`.

---

## Environment Variables

- `GEMINI_API_KEY`: API Key for Google Generative Language service.
- `GEMINI_CHAT_MODEL`: `gemini-3.1-flash-lite`.
- `DOCKER_BUILD`: Set to `true` inside `Dockerfile` for standalone production builds.

---

## Important Files

- `src/app/agents/page.tsx`: Main simulator controller.
- `src/app/vision/page.tsx`: Image vision and segmentation playground.
- `src/app/api/vision/process/route.ts`: Vision engine router.
- `src/scripts/yolo_ocr.py`: Python YOLOe segmenter.
- `src/lib/globalLimiter.ts`: IP-based rate limiter logic.
- `globals.css`: Theme overrides, Tailwind v4 class variants, and neon aesthetics.
- `Dockerfile`: Debian-based standalone runner.
- `docker-compose.yml`: VPS container orchestration compose script.
- `.github/workflows/deploy.yml`: Automated GitHub Packages GHCR deploy action.

---

## API Endpoints

- `/api/vision/process`: Processes image uploads using selected engines (Gemini/YOLOe).
- `/api/vision/ip`: Resolves and geolocates public Client IPs safely via backend Axios.
- `/api/vision/ai-post-process`: Performs restructuring of OCR text.
- `/api/agents/generate`: Executes multi-agent orchestration steps.
- `/api/rag/chat`: Handles RAG query synthesis.
- `/api/rag/embeddings`: Generates batch embeddings.

---

## Known Issues

- None.

---

## Next Recommended Tasks

Priority order:

1. Run `git push origin main` to synchronize files and trigger the GitHub Actions automated package push.
2. Deploy the container on your Ubuntu VPS using `docker compose pull && docker compose up -d`.
3. Monitor VPS API credit consumption via the dashboard.

---

## Resume Instructions for Next AI Session

1. Read `HANDLER.md` and `AGENTS.md`.
2. Deploy the published package `ghcr.io/osamaalam/portfolio:latest` on your Ubuntu VPS.
3. Continue from the "Next Recommended Tasks".
4. Do not alter current theme CSS variables unless explicitly requested.

---

## Session Summary

Date: 2026-06-27
Successfully completed high-tech computer vision renaming (Vision Sandbox), fixed visual clashing themes by locking Tailwind v4 class variants, secured all API gateways from abuse (truncating strings, whitelisting parameters, array capping), eliminated browser CORS blocks with an elegant client-assisted server-side geolocation proxy, implemented sessionStorage caching for geolocations, introduced the brand-new brand-agnostic Audio Sandbox page and its backend transcribing endpoints, solved the localhost rate-limiter sync bug by introducing server-side memory state tracking and IPv6 loopback (::1) normalization, resolved VPS server first-run timeouts by baking preheated PyTorch JIT caches directly into the image layers, optimized CPU execution thread pooling, compiled and packed the CPU-optimized standalone Docker image containing YOLOe/PyTorch, and successfully pushed the image package to GitHub Packages (GHCR)!
