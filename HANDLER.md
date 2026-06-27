# Project Handler

## Project Overview
- Next.js interactive portfolio and AI simulation hub.
- Main objective: Showcase production-grade autonomous AI agents, document intelligence (OCR), and semantic search (RAG) capabilities with high-tech UI design.
- Current development stage: Feature Complete (v1.0).

---

## Current Architecture
- Next.js 16.2.6 (App Router)
- Modular structure with dedicated sandbox routes:
  - `/rag`: Client-side hybrid RAG pipeline.
  - `/agents`: Autonomous multi-agent orchestrator sandbox.
  - `/vision`: Multi-engine AI vision & layout segmenter.
- Backend API routes: `src/app/api/...`
- Python Integration: `src/scripts/yolo_ocr.py` for YOLOv11 segmentation.
- Global security and rate limiting: `src/lib/globalLimiter.ts`

---

## Technologies
- Framework: Next.js 16.2 (App Router)
- Styling: Tailwind CSS v4, custom global CSS (`globals.css`)
- AI SDK/APIs: Google Gemini (direct REST via Axios), Ultralytics YOLOv11
- Backend API: Node.js (Next.js API Routes)
- Containerization: Docker (multi-stage standalone builds)
- Deployment: GitHub Container Registry (GHCR)

---

## Features Completed

### Autonomous Multi-Agent Orchestrator
- Interactive simulator with 3 enterprise scenario presets (Engineering, Marketing, Operations).
- Fully autonomous workflow loops with self-reflection and Human-in-the-Loop (HITL) manual intervention gates.
- Intelligent preset caching for 0ms latency on default scenarios.

### Multi-Engine AI OCR & Segmentation
- Hybrid document intelligence pipeline:
  - Tesseract.js (Client-side)
  - Gemini 3.1 Flash-Lite (Multimodal Q&A)
  - YOLOv11 Instance Segmentation (Server-side Python)
- Real-time canvas segmenter drawing glowing masks/polygons on images.

### Enterprise Security & Theming
- Multi-layer IP-based and global API rate limiting (IP-level + Global Website budget).
- Premium, high-contrast Day/Night themes with specificity-locking for high-tech simulator panels.

---

## Current Progress

Completed:
- All core playgrounds (RAG, Agents, OCR).
- Full integration of local YOLOv11 Python pipeline.
- Backend IP rate limiting and API protection.
- Docker multi-stage container optimization.

Working:
- None.

Pending:
- Live production deployment monitoring.

---

## Current State

What works:
- All sandboxes, pipelines, and API integrations are fully functional.
- The UI properly transitions between Day/Night themes with robust styling overrides.
- Multi-engine OCR is fully integrated with Python segmentation and vision Q&A.

Known limitations:
- Initial YOLO run may trigger a one-time dependency download (e.g., `mobileclip_blt.ts`).

---

## Decisions Made

- Use `output: "standalone"` only when building with Docker (controlled via `DOCKER_BUILD` env var) to maintain compatibility with `npm run start`.
- Route Python YOLO inference through `spawn` to avoid output buffer limitations.
- Fallback to mock data if Gemini API calls fail, to ensure 100% playground uptime.
- Use `axios` instead of native `fetch` inside Next.js routes to avoid deadlocks.

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
- `src/scripts/yolo_ocr.py`: Python YOLO segmenter.
- `src/lib/globalLimiter.ts`: IP-based rate limiter logic.
- `globals.css`: Theme overrides and neon aesthetics.

---

## API Endpoints

- `/api/vision/process`: Processes image uploads using selected engines (Gemini/YOLOe).
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

1. Monitor API credit consumption via the dashboard.
2. Consider caching static assets on a CDN if traffic spikes.
3. Add further YOLO detection targets.

---

## Resume Instructions for Next AI Session

1. Read `HANDLER.md` and `AGENTS.md`.
2. Ensure Docker is running if modifying the Python vision pipeline.
3. Continue from the "Next Recommended Tasks".
4. Do not alter current theme CSS variables unless explicitly requested.

---

## Session Summary

Date: 2026-06-26
Successfully implemented and fully integrated the Multi-Engine AI OCR and YOLOv11 segmentation sandbox. Completed robust rate-limiting, fixed image/canvas visibility issues, unified navigation layouts, and packaged the application for containerized production deployment.
