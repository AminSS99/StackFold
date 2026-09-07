# Stackfold Architecture & Technical Design

Stackfold is a visual control center and architectural intelligence platform. It turns modern software codebases into interactive, deterministic system maps.

---

## High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          User Interface (Web / Canvas)                      │
│  • React Flow interactive canvas with DAG layout (Dagre engine)             │
│  • View filters: Architecture, API Flows, Database Relations, Dependencies   │
│  • Blast-radius change-impact analyzer & evidence inspector                 │
│  • Native command palette (⌘K), search, and diagnostics drawer              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Abstracted via @stackfold/platform
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Platform Abstraction Layer                        │
│         PlatformAdapter (WebPlatformAdapter / TauriPlatformAdapter)         │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
           Browser Environment                    Native Desktop (Tauri)
                    │                                     │
                    ▼                                     ▼
        HTTP Next.js API Routes                 Tauri IPC Commands (Rust)
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Scanner Engine (@stackfold/scanner)                    │
│  • Pipeline: File Discovery -> AST Parsing -> Model Linking -> Validation   │
│  • Zero-secret ingestion & system-root sandboxing                           │
│  • Standalone sidecar execution via Node.js CLI bundle                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Normalized Graph (@stackfold/graph)                   │
│  • Typed ProjectGraph, GraphNode, GraphEdge with granular Evidence          │
│  • Directed acyclic graph layout computation with coordinate caching        │
│  • Transitive dependency & dependent impact traversal                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Packages

### 1. `@stackfold/graph`
The normalized data foundation for Stackfold.
- **`ProjectGraph`**: Schema version 1.0.0 containing nodes, edges, diagnostics, and project metadata.
- **`Evidence`**: Granular origin data attached to every entity, including `filePath`, `sourceRange` (line & column), `detectorId`, `rule`, and snippet.
- **`Layout Engine`**: Integrates `@dagrejs/dagre` with hierarchical coordinate generation supporting both Horizontal (`LR`) and Vertical (`TB`) flow directions across standard, overview, and detailed density levels.
- **`Change Impact Analyzer`**: Calculates direct and transitive blast radius when a node is modified, identifying affected API routes, database models, and components.

### 2. `@stackfold/scanner`
Deterministic static analysis engine and standalone sidecar.
- **Pipeline Stages**:
  1. `DISCOVERY`: Gathers repository files respecting `.gitignore`, excluding `node_modules`, `.git`, `.next`, and `.env*` secret files.
  2. `WORKSPACE`: Identifies monorepo packages (`pnpm-workspace.yaml`, `lerna.json`, sub-packages).
  3. `AST_PARSE`: Executes modular detectors:
     - Next.js App Router and Pages Router API routes & HTTP methods.
     - Prisma schema models, fields, and relational foreign keys.
     - Environment variable references (`process.env.KEY`, `.env.example`).
     - External service SDK initializations (Stripe, Resend, Supabase, AWS, etc.).
  4. `CROSS_LINK`: Resolves inter-module imports, API-to-database connections, and component dependencies.
  5. `VALIDATION`: Checks for duplicate IDs, dangling edges, and schema consistency.
- **Sidecar CLI**: Compiled via `esbuild` to `packages/scanner/dist/sidecar.cjs` (standalone CommonJS bundle), allowing the Tauri desktop app to spawn scans without installing global dependencies.

### 3. `@stackfold/platform`
Decouples application logic from runtime host environments.
- Defines the `PlatformAdapter` contract for folder picking, path validation, scan execution, cache persistence, and editor deep linking.
- **`WebPlatformAdapter`**: Communicates with local Next.js API endpoints (`/api/scan`, `/api/cache`, etc.).
- **`TauriPlatformAdapter`**: Communicates with Tauri's Rust backend over native IPC.

### 4. `apps/web`
The interactive user interface.
- Built on Next.js 15 (App Router) and Tailwind CSS.
- Supports both dynamic web development (`pnpm dev:web`) and static site export (`pnpm build:export` generating `apps/web/out`).
- Implements the black-and-yellow brand visual identity, React Flow node components, inspector tabs, and keyboard navigation.

### 5. `apps/desktop`
Native desktop application powered by Tauri 2.x.
- **Rust Backend**: Enforces security bounds (`validate_repository_path`), prevents path traversal, rejects system roots, and manages sidecar process lifecycles.
- **Offline Self-Contained**: Serves exported static web assets without binding to local HTTP ports.

---

## Security & Privacy Architecture

1. **Local-First Boundary**: Analysis executes strictly against local files. No code or graph telemetry is transmitted over the network.
2. **Zero Secrets Ingestion**: Active environment configuration files are excluded by default. Only variable identifiers are mapped.
3. **Sandboxed Webview**: Strict Content Security Policy disables external scripts, object embeds, and remote frames.
4. **Clean Process Lifecycle**: Child scanner processes are managed with atomic PID tracking to ensure immediate termination upon cancellation or window close.
