# Hongyang — Text Novel to Visual Novel Agent

**Total Agent Recall Hackathon** | March 28, 2026 | Sky9 Capital, San Francisco

Hongyang is an AI agent that transforms plain text novel chapters into playable visual novel experiences in under 60 seconds. Upload a `.txt` file, and the agent automatically extracts scenes, generates character portraits and backgrounds, composes dialogue, and outputs an interactive visual novel you can play in your browser — then sends you the link via iMessage.

## Demo

```
Upload .txt → AI parses scenes → Generates images → Playable Visual Novel → iMessage delivery
```

**Live demo:** `http://localhost:3000` after setup

## Sponsor Integration

Hongyang is built entirely on the hackathon sponsor stack. Every sponsor product is a load-bearing part of the pipeline — not a bolt-on.

### GMI Cloud — LLM Inference

- **Product:** [GMI Cloud](https://console.gmicloud.ai) NVIDIA-powered inference
- **Model:** Kimi K2.5 (`moonshotai/Kimi-K2.5`) via OpenAI-compatible API
- **How it's used:** Kimi K2.5 powers the core novel-to-scene-graph parsing. It extracts characters, scenes, dialogue, mood, and image prompts from raw text — outputting structured JSON that drives the entire pipeline. All LLM inference runs on GMI Cloud.
- **Code:** [`hongyang/src/services/gmi-cloud.ts`](hongyang/src/services/gmi-cloud.ts)

### Dify — Workflow Orchestration

- **Product:** [Dify](https://cloud.dify.ai) workflow platform
- **How it's used:** Two Dify workflows orchestrate the pipeline:
  - **Workflow #1 — Novel Parser:** Takes raw text, calls GMI Cloud's Kimi K2.5, returns a structured scene graph (characters, scenes, dialogue, image prompts)
  - **Workflow #2 — Image Generator:** Takes each image prompt and generates AI art via a Gemini Image tool node
- **Why two workflows:** Each is a separate Dify app with its own API key, demonstrating Dify's modular workflow architecture. The parser runs once per upload; the image generator runs once per scene/character (5-15 calls).
- **Code:** [`hongyang/src/services/dify.ts`](hongyang/src/services/dify.ts)

### HydraDB — Memory & Knowledge Layer

- **Product:** [HydraDB](https://app.hydradb.com) — the context layer for AI
- **How it's used:** HydraDB serves as the full asset memory and knowledge layer:
  1. **Store character profiles** (`/memories/add_memory`): After parsing, each character's visual description is stored as a memory for cross-scene consistency
  2. **Recall for consistency** (`/recall/full_recall`): Before generating each character portrait, the agent recalls the stored profile to ensure the same character looks consistent across all scenes
  3. **Store generated assets** (`/ingestion/upload_knowledge`): After image generation, all portrait URLs and background URLs are persisted as knowledge — visible and queryable in the HydraDB Knowledge dashboard
- **Code:** [`hongyang/src/services/hydradb.ts`](hongyang/src/services/hydradb.ts)

### Photon — Two-Way iMessage Agent

- **Product:** [Photon iMessage Kit](https://github.com/photon-hq/imessage-kit) (`@photon-ai/imessage-kit` v2.1.2)
- **How it's used:** Photon powers both **one-way delivery** and **two-way interaction**:
  1. **Send VN link** (`sdk.send()`): After assembling the visual novel, sends the playable link to the user's phone via iMessage
  2. **Real-time watcher** (`sdk.startWatching()`): Listens for incoming iMessages — when someone texts a novel excerpt (50+ chars), the agent auto-generates a VN and replies with the playable link
  3. **Auto-reply** (`sdk.send(msg.sender, reply)`): Acknowledges receipt and delivers the result back to the sender
- **Zero API keys** — fully open-source, runs locally on macOS
- **Prerequisite:** macOS with Full Disk Access granted to the terminal app
- **Code:** [`hongyang/src/services/photon.ts`](hongyang/src/services/photon.ts)

## Architecture

```
User uploads .txt
       │
       ▼
┌─────────────────────┐
│  Dify Workflow #1   │──▶  GMI Cloud (Kimi K2.5)
│  Novel Parser       │     Extracts scenes, characters,
└─────────────────────┘     dialogue as JSON
       │
       ▼
┌─────────────────────┐
│  HydraDB            │     Stores character profiles
│  Memory Store       │     for cross-scene consistency
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Dify Workflow #2   │     Generates AI portraits
│  Image Generator    │     and scene backgrounds
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  HydraDB            │     Stores all generated image
│  Knowledge Store    │     assets (URLs) for dashboard
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  VN Assembler       │     Builds interactive HTML
│  (Handlebars)       │     visual novel player
└─────────────────────┘
       │
       ├──▶  Web UI (http://localhost:3000/vn/{id})
       │
       └──▶  Photon iMessage Kit → sends link to phone
```

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Barack-Liu/260328-Hongyang-VIsual-Novel-Agent.git
cd 260328-Hongyang-VIsual-Novel-Agent/hongyang

# 2. Install dependencies
npm install

# 3. Configure API keys
cp .env.example .env
# Edit .env with your keys (see Deployment Guide for details)

# 4. Start
lsof -ti:3000 | xargs kill -9 2>/dev/null
npm run dev

# 5. Open http://localhost:3000, upload a .txt file, click Generate
```

### Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `GMI_API_KEY` | [GMI Cloud](https://console.gmicloud.ai) | JWT token for Kimi K2.5 inference |
| `DIFY_API_KEY` | [Dify](https://cloud.dify.ai) | Novel Parser workflow API key |
| `DIFY_IMAGE_API_KEY` | [Dify](https://cloud.dify.ai) | Image Generator workflow API key |
| `HYDRADB_API_KEY` | [HydraDB](https://app.hydradb.com/keys) | Memory & knowledge layer key |
| `PHOTON_RECIPIENT` | Your phone number | iMessage recipient (e.g., `+14251234567`) |

## Project Structure

```
260328-Total Agent Recall/
├── README.md                          ← You are here
├── hongyang/                          ← Main application
│   ├── src/
│   │   ├── server.ts                  # Express server (port 3000)
│   │   ├── agent/
│   │   │   ├── brain.ts               # Pipeline orchestrator
│   │   │   └── skills/
│   │   │       ├── novel-parser.ts    # Step 1: Parse → Scene Graph
│   │   │       ├── image-generator.ts # Step 2: Generate images
│   │   │       ├── vn-assembler.ts    # Step 3: Build HTML VN
│   │   │       └── photon-deliver.ts  # Step 4: Send via iMessage
│   │   ├── services/
│   │   │   ├── gmi-cloud.ts           # GMI Cloud LLM client
│   │   │   ├── dify.ts                # Dify workflow client
│   │   │   ├── hydradb.ts             # HydraDB memory + knowledge
│   │   │   └── photon.ts              # Photon iMessage SDK
│   │   ├── types/
│   │   │   └── scene-graph.ts         # TypeScript interfaces
│   │   └── templates/
│   │       └── vn-player.html         # Visual novel player template
│   ├── public/                        # Landing page
│   ├── package.json
│   └── tsconfig.json
├── 260328-Deployment-Guide.md         # Step-by-step setup guide
├── 260328-SDD-P1.md                   # Software design document
├── Product-Development-Document.md    # Full product spec
├── test.txt                           # Sample novel for testing
└── HarryPotter-Demo.txt              # Demo novel excerpt
```

## Tech Stack

| Layer | Technology | Sponsor |
|-------|-----------|---------|
| LLM Inference | Kimi K2.5 via GMI Cloud | GMI Cloud |
| Workflow Orchestration | Dify (2 workflows) | Dify |
| Memory & Knowledge | HydraDB (memories + knowledge) | HydraDB |
| Messaging (Two-Way) | Photon iMessage Kit (send + watch) | Photon |
| Runtime | Node.js + TypeScript + Express | — |
| Frontend | Vanilla HTML/CSS/JS | — |
| Templating | Handlebars | — |

## Deploy to Vercel

```bash
# 1. Push to GitHub
# 2. Go to https://vercel.com/new → import repo
# 3. Set Root Directory to "hongyang"
# 4. Add environment variables (GMI_API_KEY, DIFY_API_KEY, etc.)
# 5. Deploy → live at https://your-project.vercel.app
```

On Vercel, the pipeline runs synchronously within a 60-second serverless function. Photon iMessage is auto-skipped (requires macOS). See [Deployment Guide](260328-Deployment-Guide.md) for full details.

## Documentation

- [Deployment Guide](260328-Deployment-Guide.md) — Step-by-step setup, Vercel deployment, Photon watcher
- [Software Design Document](260328-SDD-P1.md) — Architecture and module design
- [Product Development Document](Product-Development-Document.md) — Full product spec and roadmap

## Demo

- **YouTube:** https://youtu.be/drx_CUy5hIc

## Team

Built at the **Total Agent Recall Hackathon** (March 28, 2026) at Sky9 Capital, San Francisco.
