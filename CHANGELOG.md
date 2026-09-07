# Changelog

All notable changes to Stackfold are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-03

### Initial Public Open-Source Release

#### Core Features
- **Deterministic Static Scanner (`@stackfold/scanner`)**:
  - Full AST parsing for JavaScript and TypeScript codebases.
  - Next.js App Router and Pages Router API route mapping with HTTP verb extraction (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
  - Prisma schema analyzer extracting database models, fields, scalar types, relations, and foreign keys.
  - Environment variable discovery mapping referenced variables across call-sites without ever exposing or reading secret values.
  - External service detector for Stripe, Resend, and major client SDKs.
  - Monorepo package extraction supporting pnpm workspaces and Lerna.
- **Normalized Architecture Graph (`@stackfold/graph`)**:
  - Typed `ProjectGraph` schema (v1.0.0) with granular evidence tracking (file paths, exact source line/column ranges, rules, and code snippets).
  - Directed acyclic graph layout engine based on Dagre, supporting both Horizontal (`LR`) and Vertical (`TB`) flow directions.
  - Four specialized views: Architecture, API Flows, Database Relations, and Package Dependencies.
  - Graph density controls: Overview, Standard, and Detailed levels.
  - Change-impact blast-radius traversal calculating direct and transitive dependents when code entities change.
  - Focus subgraph mode isolating connected neighborhoods up to configurable depths.
- **Native Desktop Application (`apps/desktop`)**:
  - Built with Tauri 2.x and Rust for macOS (Universal/Apple Silicon) and cross-platform desktop shells.
  - Standalone bundled frontend (`apps/web/out`) requiring no local HTTP development server.
  - Native OS folder selection dialog via `tauri-plugin-dialog`.
  - Path traversal and system root security barriers rejecting `/`, `/System`, `/private`, `/etc`, `/var`, `/usr`, `C:\Windows`, and directory escape attempts.
  - Atomic sidecar process lifecycle management with clean `SIGTERM` process cancellation and zero orphaned background processes.
  - Offline cache persistence and recent projects management under `~/.stackfold/`.
- **Interactive Visual Control Center (`apps/web`)**:
  - Modern black-and-yellow brand design with dark-mode canvas.
  - React Flow canvas with custom nodes for applications, API routes, database tables, services, and environment configurations.
  - Node inspector panel with Details, Blast-Radius Impact, Evidence, and AI Insights tabs.
  - Command palette (⌘K) with instant fuzzy node search and view switching.
  - Diagnostics drawer displaying scan warnings, undeclared environment variables, and structure notes.
  - Deep linking to open discovered files directly in VS Code, Cursor, or WebStorm.
- **Testing & Verification**:
  - 100% passing test suites across `@stackfold/graph`, `@stackfold/scanner`, `@stackfold/platform`, and Rust backend commands.
  - Real repository regression tests scanning Stackfold itself (119 nodes, 119 edges) with zero dangling edges.
  - Packaged desktop application verification on macOS.
