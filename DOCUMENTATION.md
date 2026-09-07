# Stackfold — The Complete Product & Contributor Manual

Stackfold is an open-source visual control center and architectural intelligence engine for software codebases. It scans a repository and builds an interactive, deterministic system map showing applications, API routes, database models, dependencies, external services, and configuration flows.

It is designed to answer two fundamental engineering questions:
1. **"How does this codebase actually work?"**
2. **"What will break if I change this?"**

Stackfold is **not** a conversational coding chatbot or a code-generation agent. It is a local-first architectural context layer and change-impact analyzer.

---

## Table of Contents

1. [Quick Start & Launch](#1-quick-start--launch)
2. [Core Concepts](#2-core-concepts)
3. [User Guide & Features](#3-user-guide--features)
   - [Opening & Scanning a Project](#opening--scanning-a-project)
   - [The 4 Architectural Lenses](#the-4-architectural-lenses)
   - [Canvas Navigation & Controls](#canvas-navigation--controls)
   - [Node Inspector & Traceable Evidence](#node-inspector--traceable-evidence)
   - [Blast-Radius Change Impact Analysis](#blast-radius-change-impact-analysis)
   - [Focus Subgraph Mode](#focus-subgraph-mode)
   - [Command Palette (⌘K) & Search](#command-palette-k--search)
   - [Diagnostics Drawer](#diagnostics-drawer)
   - [Local Cache & Recent Projects](#local-cache--recent-projects)
4. [Security & Privacy Architecture](#4-security--privacy-architecture)
5. [Monorepo Architecture](#5-monorepo-architecture)
6. [Contributor Guide](#6-contributor-guide)
   - [Writing a New Scanner Detector](#writing-a-new-scanner-detector)
   - [Adding a Test Fixture](#adding-a-test-fixture)
   - [Verification Commands](#verification-commands)
7. [Open-Source Launch Checklist](#7-open-source-launch-checklist)

---

## 1. Quick Start & Launch

Stackfold can run either as a standalone native desktop application (Tauri + Rust) or inside any modern web browser (Next.js).

### Prerequisites
- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v10+` (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Rust toolchain**: `1.80+` (optional for web mode, required for desktop compilation)

### Running the Pre-built Desktop Application (macOS)
```bash
# Launch the packaged standalone app directly
open apps/desktop/src-tauri/target/release/bundle/macos/Stackfold.app
```

> **macOS Gatekeeper Note (Unsigned Alpha):**  
> Because early alpha builds do not yet include an Apple Developer ID certificate, macOS will quarantine the binary on first download. Run this command once in Terminal:
> ```bash
> xattr -cr apps/desktop/src-tauri/target/release/bundle/macos/Stackfold.app
> ```

### Running in Development Mode
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Option A: Run web application in browser (http://localhost:3000)
pnpm dev:web

# Option B: Run native desktop app with live reload
pnpm dev:desktop
```

---

## 2. Core Concepts

* **Deterministic Analysis:** Analysis is powered by AST compilers (`@babel/parser`, TypeScript compiler API, Prisma schema parser). It does not hallucinate connections or guess. Connections exist only if verified in code.
* **Granular Evidence:** Every single node and edge in the graph contains origin evidence: file path, exact line and column ranges, detector rule, and the raw code snippet.
* **Zero Secrets Ingestion:** Active environment configuration files (`.env`, `.env.local`, `.env.production`) are excluded by default. Only variable names and call-site references (`process.env.VAR`) are mapped. Values are never stored, logged, or displayed.
* **Local-First Boundary:** All parsing runs on your local machine. No source code or graph data is sent to external cloud servers.

---

## 3. User Guide & Features

### Opening & Scanning a Project

When you launch Stackfold, the welcome screen offers three instant pathways:

1. **Open Local Repository:** Click **"Choose Path"** (or use the native folder picker in desktop mode) to select any local TypeScript/JavaScript project on your machine.
2. **E-Commerce Demo (`sample-ecommerce-app`):** An instant bundled fixture showcasing a Next.js 14 App Router application with Prisma ORM, PostgreSQL, Stripe payments, and Resend email.
3. **Monorepo Platform (`sample-monorepo-platform`):** A multi-package pnpm workspace containing two Next.js apps (`web` and `api`), a shared database package (`packages/db`), and shared utilities (`packages/utils`).

Click **"Scan"**. Scanning typical repositories takes between **50ms and 300ms**.

---

### The 4 Architectural Lenses

Use the switcher in the top navigation bar to change perspectives on your codebase:

| View | What It Shows | Best Used For |
| :--- | :--- | :--- |
| **Architecture** | The complete system map: applications, packages, API routes, database models, external services, and config vars. | Getting an overall mental model of an unfamiliar repository. |
| **API Flows** | Isolates all backend API routes with their HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`), dynamic parameters (`[id]`), and the external services they invoke. | Auditing backend endpoints, request lifecycles, and API surface area. |
| **Database** | Pure data-layer diagram showing Prisma models, field names, scalar types, and relational foreign keys. | Understanding schema relations without opening migration or schema files. |
| **Dependencies** | Internal monorepo package dependency graph (`depends_on`, `imports`). | Auditing package coupling and circular references in workspaces. |

---

### Canvas Navigation & Controls

* **Pan & Zoom:** Click and drag on empty canvas space to pan. Use the mouse wheel or trackpad pinch to zoom.
* **Center / Reset View:** Click the zoom controls in the bottom-left corner to fit the graph to your window.
* **Minimap:** A bird’s-eye interactive minimap is located in the bottom-right corner.
* **Layout Direction:** Click the **Direction Toggle** icon in the top bar to flip the graph between **Horizontal (`LR`)** and **Vertical (`TB`)** Dagre layout.
* **Density Selector:**
  - **Overview:** Minimalist node cards displaying only the title and category badge (ideal for large graphs with 100+ nodes).
  - **Standard:** Balanced view displaying entity names, badges, and primary connection counts.
  - **Detailed:** Expands full model field lists, HTTP methods, and configuration metadata.
* **Node Type Filters:** Use the checkboxes in the left sidebar to toggle specific node types on or off (e.g. hide environment variables to reduce visual clutter).

---

### Node Inspector & Traceable Evidence

Clicking any node on the canvas opens the **Inspector Panel** on the right side of the screen.

The inspector contains four tabs:

1. **Details:** Displays entity classification, package belonging, metadata, and lists of all incoming and outgoing connections.
2. **Impact:** Calculates real-time blast radius (see below).
3. **Evidence:** Shows the exact origin fact:
   - **File Path:** Relative path to the file in the repository.
   - **Source Range:** Exact start/end line and column numbers.
   - **Detector ID & Rule:** The parser rule that discovered the entity.
   - **Code Snippet:** The actual lines of source code extracted during AST parsing.
   - **Open in Editor:** Click the editor button to jump directly to that exact line in **VS Code**, **Cursor**, or **WebStorm**.
4. **AI Insights:** Prepares sanitized, zero-secret architectural context prompts that you can copy to an LLM for refactoring guidance.

---

### Blast-Radius Change Impact Analysis

When you plan to modify or delete a piece of code, select that node and click the **Impact** tab.

Stackfold performs a bidirectional graph traversal to calculate:
* **Severity Rating:** `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` based on topological connectivity.
* **Direct Dependents:** Nodes that directly call or import the target entity.
* **Transitive Dependents:** Downstream entities affected through secondary chains.
* **Affected API Routes:** Public endpoints that rely on this entity.
* **Affected Database Models:** Database tables linked to this entity.

*Example:* Selecting the `Product` database model immediately warns you that changing its schema impacts `POST /api/checkout`, `GET /api/products`, and the `OrderItem` relational table.

---

### Focus Subgraph Mode

When analyzing large codebases, the full graph can become overwhelming:
1. **Double-click** any node on the canvas.
2. The canvas enters **Focus Mode**: all unrelated nodes disappear, leaving only the selected entity and its direct upstream and downstream neighbors.
3. A yellow **"Exit Focus"** banner appears at the top of the canvas. Click it anytime to restore the full graph.

---

### Command Palette (⌘K) & Search

* Press **`⌘K`** (or click the search button in the top bar) to open the Command Palette.
* Type any name (e.g., `checkout`, `User`, `STRIPE`, or `prisma`) to filter through all entities instantly.
* Use `Arrow Up` / `Arrow Down` and press `Enter` to auto-focus and select that node on the canvas.

---

### Diagnostics Drawer

Click the **Diagnostics** button in the top bar to open the slide-over warnings drawer.

Diagnostics flag potential architectural risks:
* **Undeclared Environment Variables:** Variables referenced in code (`process.env.FOO`) that are missing from `.env.example`.
* **Missing Package Configurations:** Packages without build scripts or entry points.
* **Dangling References:** Calls to non-existent internal modules.

---

### Local Cache & Recent Projects

* **Automatic Cache:** Scan graphs are cached under `~/.stackfold/cache/`. When re-opening a previously scanned repository, Stackfold restores the graph in milliseconds.
* **Recent Projects:** Accessible from the Onboarding Modal. Re-open recent repositories with one click or remove them using the trash icon.

---

## 4. Security & Privacy Architecture

Stackfold is built to be safely run on proprietary commercial codebases:

1. **System Root Defense:** The native backend canonicalizes paths and rejects system root directories (`/`, `/System`, `/private`, `/etc`, `/var`, `/usr`, `/bin`, `C:\`, `C:\Windows`) with `FORBIDDEN_SYSTEM_ROOT`.
2. **Editor Traversal Protection:** Deep links to editors validate that the target file resides strictly within the selected repository root and contains no `..` directory escape sequences.
3. **No Secret Ingestion:** Active `.env` files containing secrets are completely skipped. Detector AST checks extract variable keys only.
4. **Sandboxed Webview:** Tauri desktop runs with a strict Content Security Policy (CSP):
   ```text
   default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ipc:;
   ```
5. **Process Termination:** Active scanner subprocesses are tracked in an atomic mutex map; cancelling a scan or closing the window immediately sends `SIGTERM` to kill the subprocess. Zero orphaned processes remain.

---

## 5. Monorepo Architecture

The codebase is organized as a modular pnpm workspace:

```text
StackFold/
├── packages/
│   ├── graph/         # Data contracts, schema v1.0.0, Dagre layout engine, impact traversal
│   ├── scanner/       # Deterministic AST detectors, pipeline stages, sidecar CLI
│   └── platform/      # Abstraction layer between Web (HTTP API) and Desktop (Tauri IPC)
│
├── apps/
│   ├── web/           # Next.js 15 UI, React Flow canvas, node components, inspector
│   └── desktop/       # Tauri 2.x native desktop shell & Rust backend (src-tauri)
│
└── fixtures/
    ├── sample-ecommerce-app/      # Next.js 14 + Prisma + PostgreSQL + Stripe
    └── sample-monorepo-platform/  # pnpm monorepo with 2 Next.js apps & shared DB
```

---

## 6. Contributor Guide

### Writing a New Scanner Detector

All detectors live in `packages/scanner/src/detectors/` and implement the `Detector` contract:

```typescript
import type { Detector, ScanContext, DetectorResult } from '../types';
import type { GraphNode, GraphEdge, ScanDiagnostic } from '@stackfold/graph';

export const myDetector: Detector = {
  id: 'my-detector',
  name: 'My Custom Framework Detector',
  version: '1.0.0',

  async detect(context: ScanContext): Promise<DetectorResult> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const diagnostics: ScanDiagnostic[] = [];

    // 1. Filter relevant files from context.files
    const targetFiles = context.files.filter(f => f.endsWith('.routes.ts'));

    for (const file of targetFiles) {
      // 2. Read content safely
      const content = await context.readFile(file);
      
      // 3. Parse AST and extract facts
      // ... AST parsing logic ...

      // 4. Create GraphNode with mandatory Evidence
      nodes.push({
        id: `route:${file}`,
        type: 'api_route',
        displayName: 'GET /api/custom',
        filePath: file,
        confidence: 'HIGH',
        tags: ['custom'],
        metadata: { method: 'GET' },
        evidence: {
          detectorId: 'my-detector',
          rule: 'custom-route-export',
          filePath: file,
          sourceRange: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 2 },
          codeSnippet: 'export const route = ...',
          notes: 'Discovered via custom route detector'
        }
      });
    }

    return { nodes, edges, diagnostics };
  }
};
```

#### Rules for Detectors:
1. **Never read environment secret values.**
2. **Every edge must have a valid source and target node.** No dangling edges.
3. **Always attach accurate line/column numbers in `evidence.sourceRange`.**

---

### Adding a Test Fixture

1. Create a directory under `fixtures/<fixture-name>/`.
2. Add realistic source files and a `package.json`.
3. Add a test in `packages/scanner/src/__tests__/real-repository-scans.test.ts` asserting exact node count, edge count, and zero dangling edges.

---

### Verification Commands

Before submitting code, run the full verification suite:

```bash
# 1. Strict TypeScript & Cargo check
pnpm typecheck

# 2. Vitest suites and Cargo unit tests
pnpm test

# 3. ESLint, Rust format check, and Cargo Clippy
pnpm lint

# 4. Production Web & Sidecar compilation
pnpm build:web

# 5. Production Desktop application packaging
pnpm build:desktop
```

---

## 7. Open-Source Launch Checklist

When you are ready to publish the repository to GitHub:

1. **Choose License:** In [`LICENSE`](LICENSE), select either **Apache License 2.0** or **MIT License** and replace the placeholder text with your choice.
2. **Review Git Status:**
   ```bash
   git status
   ```
   Confirm that build outputs (`target/`, `out/`, `*.tsbuildinfo`, `dist/`) are ignored.
3. **Commit & Tag:**
   ```bash
   git add .
   git commit -m "feat: release Stackfold v0.1.0"
   git tag -a v0.1.0 -m "Release v0.1.0"
   ```
4. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/<your-username>/stackfold.git
   git branch -M main
   git push -u origin main --tags
   ```
5. **Create GitHub Release:**
   - Copy content from [`RELEASE_NOTES_v0.1.0.md`](RELEASE_NOTES_v0.1.0.md).
   - Attach the pre-built installer: `apps/desktop/src-tauri/target/release/bundle/dmg/Stackfold_0.1.0_aarch64.dmg`.
   - Include the SHA256 checksum from [`SHA256SUMS.txt`](SHA256SUMS.txt).
