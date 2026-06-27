Updated: 2026-06-17

# 🌐 Interactive AI Portfolio & Autonomous Simulation Hub

<p align="center">
  <img src="public/icon.png" alt="Osama Alam Logo" width="120" height="120" style="border-radius: 50%;" />
</p>

<p align="center">
  <strong>Osama Alam</strong> • <em>AI Architect & Founder</em>
</p>

<p align="center">
  <a href="https://github.com/Osamaalam/portfolio/actions"><img src="https://img.shields.io/github/actions/workflow/status/Osamaalam/portfolio/build.yml?branch=main&style=flat-square&label=build" alt="Build Status" /></a>
  <a href="https://github.com/Osamaalam/portfolio/pkgs/container/portfolio"><img src="https://img.shields.io/badge/container-ghcr.io-blue?style=flat-square" alt="GHCR" /></a>
  <img src="https://img.shields.io/badge/Next.js-v16.2-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Docker-node:22--alpine-2496ed?style=flat-square&logo=docker" alt="Docker Alpine" />
</p>

---

Welcome to the official repository of my personal engineering portfolio. This is not just a static showcase, but a **high-fidelity, production-grade interactive platform** designed to simulate and visualize complex multi-agent workflows, vision-based medical diagnostic processing pipelines, and customizable document RAG (Retrieval-Augmented Generation) semantic search engines.

🔗 **Explore Live Platform:** [osamaalam.com](https://osamaalam.com) *(or your deployed custom domain)*

---

## ✨ Features & Architecture

### 1. 🤖 Synapse Multi-Agent & Process Automation Sandbox
* Orchestrates real-time, context-aware cooperative loops between specialized autonomous agents (`System Architect`, `Software Engineer`, `QA Test Auditor`, `SecOps Guardian`).
* Supports fully custom prompt objectives, model temperature sliders, and authorized tool checkbox suites.
* **Human-in-the-Loop (HITL) manual correction**: Pauses and allows supervisor intervention during test failures to loop back, request engineer self-reflection, and auto-correct bugs.
* **0ms Intelligent Preset Caching**: Instantly delivers pre-verified pipelines with zero upstream network dependencies or cost overheads.

### 2. 🧠 Medical Pathological Scan Segmentation (Computer Vision)
* Mock computer vision classifier using a 3D slice-depth control dashboard (calibrated around ResNet-50 structures).
* Real-time Grad-CAM explainability logs and vascular variance anomaly flags matching hospital decision support setups.

### 3. 📂 Dynamic Document RAG Semantic Search
* **Real-Time Query Analysis:** Analyzing inputs dynamically to match indexed documents across major domains (Logistics, SaaS Revenue, Healthcare AI, and Web3 Solidity).
* **Interactive Suggestion Chips:** Preset tags allowing users to instantly cycle through preloaded document scopes and compare dynamic vector match lists and synthesized summaries.
* **Smart Fallback:** Custom search inputs generate dynamically matching chunk IDs and real-time semantic summaries based on user input.

### 4. 🌗 Premium Neon Adaptable Theme
* Full, seamless Day and Night themes utilizing CSS custom properties and custom transitions.
* **Accessibility-First Contrast:** Modified base-class compiler overrides that guarantee 100% visible, high-contrast, and comfortable reading under any lighting, while fully preserving rich color hover-state animations.

### 5. 📬 Secure Portable Lead Capture (n8n Integration)
* Next.js API endpoint (`/api/contact`) that securely packages customer contact information.
* Replaced native process calls with modern, highly portable Node.js `fetch` APIs using secure Base64 Basic Authentication to forward inquiries asynchronously to my **n8n orchestration workflow**.

### 6. 👁️ Multi-Engine AI Vision & YOLOv11 Segmentation Sandbox
* **Client-Bound Tesseract.js**: Client-bound, fully local, private browser-side text extraction executing natively in browser memory.
* **Gemini 3.1 Flash-Lite Vision**: Multimodal visual analysis allowing users to upload documents and type custom questions to get structured markdown reports or summaries.
* **Real YOLOv11 Instance Segmentation**: Spawns a Python `ultralytics` model instance on the server to execute `yoloe-11s-seg.pt` on your uploaded image, dynamically isolating and painting glowing translucent masks matching your specific named target object (e.g. `laptop`, `cup`).

---

## 🛠️ Stack & Technologies

* **Frontend Framework:** Next.js v16.2 (App Router with Turbopack compilation)
* **Styling & Transitions:** Tailwind CSS v4.0 (Utilizing modern native CSS variable themes)
* **Runtime & Package Manager:** Node.js v22 & npm v10.9
* **Containerization:** Docker Multi-stage standalone pipeline (`node:22-alpine` target)
* **CI/CD & Registries:** GitHub Actions & GitHub Container Registry (`ghcr.io`)

---

## 📦 Docker Containerization & Deployment

This project utilizes a highly optimized **multi-stage build workflow** that outputs an extremely small and secure production-grade container. By leveraging Next.js **standalone build outputs**, the final image is **only 305 MB** (over 70% smaller than a standard build).

### Pull the Image from GitHub Container Registry
```bash
docker pull ghcr.io/osamaalam/portfolio:latest
```

### Run the Container Locally
```bash
docker run -d -p 3000:3000 --name portfolio-site ghcr.io/osamaalam/portfolio:latest
```
Open your browser and navigate to `http://localhost:3000`.

### Building the Container Locally (Multi-Stage)
If you make modifications and want to rebuild the container:
```bash
docker build -t osama-portfolio:latest .
```

---

## 💻 Local Development

Follow these steps to run and develop the portfolio locally:

### 1. Prerequisites
* **Node.js (>= 20.9)** and **npm** package manager.
* **Python (>= 3.8)** and **pip** (required if you wish to run local YOLOv11 segmentations):
  ```bash
  pip install ultralytics
  ```

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/Osamaalam/portfolio.git
cd portfolio
npm install
```

### 3. Running Development Server
Start the local server with Next.js Turbopack:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Production Compilation & Linting
Verify code health and perform a complete production compile:
```bash
# Run ESLint validation checks
npm run lint

# Compile and optimize for production
npm run build

# Start the compiled production server
npm run start
```

---

## 🔒 Security & Code Compliance

This project enforces modern, bulletproof engineering standards:
* **Strict Non-Root Containerization:** The production container runs under the dedicated `nextjs` system user group to prevent privilege escalation.
* **Safe Input Sanitization:** Dynamic inputs across RAG simulators and contact form blocks are fully sanitized and encapsulated to eliminate script injection.
* **Portable API Routes:** Removed all system-dependent native terminal bindings in favor of native JavaScript Web API protocols, ensuring the server runs smoothly in any host OS.

---

<p align="center">
  Designed & Built with ❤️ by <strong>Osama Alam</strong>
</p>