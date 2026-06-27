<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 Osama Alam's AI Portfolio Developer Guide (AGENTS.md)

This documentation serves as the **source of truth** for future AI agents, subagents, and developers working on this codebase. It documents the proprietary architectures, visual systems, and networking solutions implemented to maintain maximum performance, accessibility, and reliability.

---

## 🌗 1. The Theme System (Day & Night)

### How Theme State is Managed:
* The theme uses a class-list-based toggle on the root `<html>` element. 
* If Light Mode is active, the `.dark` class is removed. If Dark Mode is active, the `.dark` class is added.
* Theme state is stored and retrieved inside `localStorage` under the key **`portfolio-theme`** (`"light"` or `"dark"`).
* **Tailwind v4 Class-Variant Lock:** To prevent the browser's native dark mode system preferences from overriding and clashing with the manual Day/Night theme toggle, the Tailwind v4 custom class-variant is locked in `globals.css`:
  ```css
  @custom-variant dark (&:where(.dark, .dark *));
  ```
  This forces all `dark:` helper utilities to trigger **strictly** when the `.dark` class is present on the root element.
* To prevent rendering/hydration flashes under Next.js SSR, and automatically match system preferred color schemes on first visits, use this **smart state initializer**:
  ```typescript
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("portfolio-theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });
  ```

### Maintaining High Contrast for High-Tech Cards:
To preserve the futuristic, premium CLI terminal aesthetic, several panels (such as the main simulator console, the RAG logs console, the Node Inspector, and the RAG progress compiler) must **remain dark in both themes**.
* **The Hazard:** Global Day-Theme readability overrides (which have an `!important` flag and high specificity) will target neutral `text-zinc-` classes and force them to turn charcoal dark-grey, making them invisible on dark backgrounds.
* **The Solution:** Always wrap these high-tech containers in either the **`.sh-terminal`** or **`.sh-dark-card`** classes.
* **The Specificity Lock:** In `globals.css`, these classes are prefixed with `:root` to raise their specificity to `30`, overriding the Light Theme overrides and locking text to highly legible white/light-grey:
  ```css
  :root .sh-terminal .text-zinc-400,
  :root .sh-dark-card .text-zinc-400 {
    color: #a1a1aa !important; /* Locks light text on dark cards in Day Theme */
  }
  ```
* **Preserving Colors:** Similarly, diagnostic classes like `text-emerald-400` (success), `text-red-400` (errors), and `text-yellow-500` (warnings) are mathematically protected in `globals.css` with `:root` prefixes to stay bright and readable inside dark panels.

---

## 📡 2. Backend API Rules & Axios

Next.js (App Router) routes are located inside `src/app/api/.../route.ts`.

### ⚠️ Crucial: Always use Axios for External REST Endpoints
* **The Deadlock Issue:** Next.js heavily monkey-patches the global `fetch` API inside Node.js to inject its own server-side page caching and request routing layers. This patched `fetch` creates **deadlock hangs** when triggered inside Next.js API routes by third-party SDKs (such as `@google/genai` or `@azure/openai`), causing incoming requests to freeze indefinitely.
* **The Resolution:** **DO NOT** use the `@google/genai` SDK or raw `fetch` for backend API routes. Always perform direct REST API requests to Google's endpoints using **`axios`**!
* **Why Axios Works:** `axios` bypasses Node's `fetch` entirely and communicates using Node's raw native `http`/`https` socket adapters, completely side-stepping Next's caching loops.
* **Implementation Pattern (Embeddings API):**
  ```typescript
  import axios from "axios";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
  const response = await axios.post(url, {
    content: { parts: [{ text: text }] }
  }, {
    headers: { "Content-Type": "application/json" },
    timeout: 12000 // Always set a safe timeout!
  });
  ```

---

## 🧠 3. Advanced Client-Side RAG Architecture

The `/rag` page integrates a highly sophisticated hybrid RAG pipeline:

### Document Ingestion & Vectorizing:
* **Sandboxed Parsing:** PDF binary arrays are parsed page-by-page in pure JavaScript inside the browser using `pdfjs-dist` (loaded dynamically from cdnjs to avoid bundle bloating).
* **Sliding-Window Chunker:** Extracted text is compiled sequentially and recursively split into **350-character chunks with a 70-character sliding overlap**.
* **Batch Embedding:** Chunks are sent in parallel (`Promise.all`) via a secure POST request to `/api/rag/embeddings` to resolve real, 3072-dimensional vector coordinates (`gemini-embedding-2`), which are then cached strictly inside the browser's memory.

### Retrieval & Hallucination Rejection:
* **Stop-Words Filter:** Query terms are processed, splitting non-alphanumeric coordinates and filtering out conversational filler (e.g., *the, and, about, tell, me*).
* **True Cosine Similarity:** Computes actual dot products divided by vector magnitudes to ensure scores strictly range between `-1.0` and `1.0`.
* **Relevance Threshold (`0.28`):** If the highest-scoring matching chunk has a final score below `0.28`, the system registers it as irrelevant. It immediately cancels LLM API calls and cleanly outputs a strict rejection message to prevent hallucination.
* **Overview Query Bypass:** If the query contains high-level intents (e.g., *summarize, overview, what is this file*), the system bypasses the similarity threshold, slices the **first three introductory chunks** of the PDF, and forwards them to Gemini to synthesize an executive summary.

### Client UI Latency Telemetry:
* Every query is timed from input submission to response synthesis.
* The elapsed duration is printed inside the Behind-the-Scenes logs and displayed directly on the assistant's chat bubble: **`Osama's RAG Core (in 842ms)`**.

---

## 🚀 4. How to Run & Control the Server

### Standard Package Scripts:
* **Development Server:** `npm run dev`
* **Production Compilation:** `npm run build`
* **Production Start:** `npm run start` (serves compiled static assets)

### Windows Developer Visible Console (Windows OS):
To start the production Next.js server in a **fully visible, separate Command Prompt window** (so you can watch live `console.log` stdout, API latency handshakes, and debug tracing directly on your desktop), run this PowerShell command:
```powershell
# Stops any existing server on port 3000 and launches a visible log window
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force; Start-Process cmd.exe -ArgumentList "/k npm run start"
```

---

## 🔒 5. Environment & Security Compliance

* **`.env` Security:** Sensitive keys (like `GEMINI_API_KEY`) are stored in `.env` and kept strictly server-side. **NEVER** expose the API key to client-side page codes (i.e., do not prefix it with `NEXT_PUBLIC_`).
* **Non-Root Containerization:** The production `Dockerfile` uses a Debian-based standalone build configuration (`node:22-bookworm-slim`) optimized for CPU-only deployments. It installs native graphics packages (`libgl1-mesa-glx`) and builds an isolated, non-whitelisted Python virtual environment (`/opt/venv`) with CPU-optimized PyTorch and Ultralytics to prevent host OS leakage.

---

## 📦 6. Deployment, Version Control & Packaging

### Pushing Code to the Remote Repository:
* **Protocol:** The repository uses HTTPS (`https://github.com/Osamaalam/portfolio.git`).
* **Authentication constraint:** GitHub does not support standard password authentication over HTTPS for Git operations. Future non-interactive agents or subagents must prompt the user or instruct them to push manually from their local environment where SSH keys or Personal Access Tokens are pre-configured:
  ```bash
  git push origin main
  ```

### Packaging & Pushing Container Images:
* **Registry:** GitHub Container Registry (GHCR) at `ghcr.io`.
* **Package Target:** `ghcr.io/osamaalam/portfolio:latest`
* **Automated CI/CD Workflows:** The repository is configured with an automated GitHub Actions deployment workflow at `.github/workflows/deploy.yml`. When pushing to the `main` branch, a GitHub Runner automatically logs into GHCR, builds the standalone Docker image, and publishes it securely.
* **Manual Packaging Command:**
  To build and tag the CPU-optimized standalone image locally:
  ```bash
  docker build -t ghcr.io/osamaalam/portfolio:latest .
  ```
* **Manual Registry Push Command:**
  Ensure the host terminal is authenticated with `docker login ghcr.io` first, then run:
  ```bash
  docker push ghcr.io/osamaalam/portfolio:latest
  ```

---

## 👁️ 7. Multi-Engine AI Vision & YOLOe Open-Vocabulary Segmentation Sandbox

The `/vision` page integrates a highly sophisticated computer vision and multimodal pipeline:

### Multi-Engine Architectural Strategy:
* **Local Browser OCR (Tesseract.js):** Pulls raw text characters entirely locally in the browser's V8 thread. No server overheads.
* **Multimodal Vision Q&A (Gemini 3.1):** Leverages `gemini-3.1-flash-lite` to allow users to ask any custom question about the uploaded document (e.g. summarizing charts, describing photos).
* **Real-Time Open-Vocabulary Segmentation (YOLOe):** Spawns a Python `ultralytics` child process on the server to execute the `yoloe-11s-seg.pt` weights. Users type any target object class, and the backend dynamically filters coordinates, returning precise polygon coordinate masks that paint glowing overlays directly on the WebUI.
* **Input Sanitization & Abuse Prevention (Rule 8):**
  * **Size Cap:** Enforces a strict **2 MB image file size limit** on both client and backend API layers.
  * **File-Type Whitelist:** Only standard image MIME types (`jpeg`, `png`, `webp`) or extensions (`.jpg`, `.jpeg`, `.png`, `.webp`) are accepted.
  * **Target Sanitization:** Strips all non-alphanumeric, space, comma, or dash characters from the `targetObject` parameter and clips it to `50 characters` max to block shell-argument injections.
  * **Prompt Length Cap:** Restricts prompt sizes to `1,000 characters` on vision and post-processing APIs to protect token budgets.

### Stable Canvas Overlay Mathematics:
To prevent browser layout collapse, the image and canvas overlay use a pure CSS flexbox and relative wrapper:
```typescript
<div className="relative max-h-[340px] max-w-full flex items-center justify-center">
  <img ref={imageRef} src={imageUrl} className="max-h-[340px] max-w-full object-contain block" />
  <canvas ref={canvasRef} className="absolute pointer-events-auto cursor-crosshair" />
</div>
```
When `drawYoloDetections()` executes, it reads `img.clientWidth` and `img.clientHeight` and styles the canvas's properties (`width`, `height`, `top`, `left`) directly in the DOM. This aligns the masks with pixel-perfect accuracy on all browsers.

---

## 📡 8. CORS-Free Client-Assisted IP Geolocation & Session Caching

To prevent direct third-party geolocation calls from being blocked by browser CORS policies, the portfolio uses a secure, high-performance hybrid tracking architecture:

* **Client IP-Discovery:** The browser makes a fast client-side fetch to `https://api.ipify.org?format=json` (which is CORS-enabled and never blocked) to determine the user's true public IP address.
* **Server-Side Geolocation Proxy:** The browser relays the IP as a query parameter to `/api/vision/ip?ip=XXX`. The backend Node server queries the high-limit, server-friendly `freeipapi.com` service, bypassing browser CORS constraints and blocking 403 server-block errors entirely.
* **IP Validation (Rule 8):** The backend runs a strict IPv4/IPv6 regex filter on the incoming parameter to discard any malicious strings.
* **Session Storage Caching:** Once resolved, the IP and geographic details are saved inside the browser's `sessionStorage`. On subsequent page navigation, hot-reloads, or tab refreshes, the details are loaded instantly from memory in `0ms`, completely eliminating rate-limiting locks and API credit exhaustions.
* **Secure Fallback:** If the browser or server-side lookups fail, the connection falls back to a neutral, non-whitelisted `"0.0.0.0"` IP address, keeping malicious actors strictly rate-limited to standard quotas.