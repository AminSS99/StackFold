# Stackfold Roadmap

Stackfold is currently in **Early Alpha (v0.1.0)**. Our goal is to provide developers, architects, and engineering teams with an honest, visual context layer for software repositories.

---

## Phase 1: Foundation & Standalone Desktop (Current: v0.1.0)
- [x] Monorepo architecture with pnpm workspaces.
- [x] Normalized architecture graph (`@stackfold/graph`) and Dagre layout engine.
- [x] Deterministic static analysis engine (`@stackfold/scanner`) for TypeScript, Next.js, and Prisma.
- [x] Standalone Tauri 2.x desktop application with native folder dialog and offline static bundle.
- [x] Four distinct graph views (Architecture, API Flows, Database Relations, Dependencies).
- [x] Blast-radius change impact analysis.
- [x] Zero-secrets ingestion guarantee.
- [x] Real-repository regression tests (Stackfold self-scan: 119 nodes, zero dangling edges).

---

## Phase 2: Expanded Framework & Ecosystem Support (v0.2.0)
- [ ] **Additional ORMs**:
  - Drizzle ORM schema parser (`drizzle.config.ts`, `pgTable`, `mysqlTable`, relations).
  - TypeORM / MikroORM entity detectors.
- [ ] **Additional Web Frameworks**:
  - Remix / React Router 7 route and loader/action discovery.
  - Express / Fastify route mounting and middleware chains.
  - Astro endpoint and page routing.
  - SvelteKit / Nuxt route structures.
- [ ] **Background Jobs & Queues**:
  - Inngest, BullMQ, Trigger.dev, and Celery job definition mapping.
- [ ] **Authentication Flows**:
  - NextAuth / Auth.js, Clerk, and Supabase Auth route guard mapping.

---

## Phase 3: Git-Aware Architectural Diffing (v0.3.0)
- [ ] **Git Diff Overlay**:
  - Compare working branch against `main` or previous commits.
  - Highlight newly added, modified, or deleted architectural entities directly on the canvas.
  - Predict downstream architectural blast radius for pull requests before merging.
- [ ] **CLI Mode for CI/CD**:
  - Headless `@stackfold/cli` generating JSON or SVG architecture summaries.
  - GitHub Action to comment architectural impact summaries on Pull Requests.

---

## Phase 4: Production Release Infrastructure (v0.4.0)
- [ ] **Code Signing & Notarization**:
  - Apple Developer ID signing and Apple Notarization for macOS `.app` and `.dmg`.
  - Windows Authenticode signing for `.msi` and `.exe` installers.
  - Linux `.deb` and `.AppImage` distribution.
- [ ] **Auto-Update Mechanism**:
  - Tauri updater integration with signed release manifests.

---

## Phase 5: Path to 1.0 (v1.0.0)
- [ ] Support for non-JS/TS backends (Python FastAPI/Django, Go Gin/Fiber, Rust Axum).
- [ ] Collaborative visual sharing (exportable encrypted architecture packages).
- [ ] Stabilized public API for custom user detectors and plugins.
