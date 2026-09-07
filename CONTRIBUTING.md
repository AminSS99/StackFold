# Contributing to Stackfold

Thank you for contributing to Stackfold! Stackfold is a visual control center and intelligence layer for software architectures.

This guide provides everything you need to set up your environment, develop features, add new scanner detectors, and submit pull requests.

---

## Prerequisites

- **Node.js**: `v20.0.0` or `v22.0.0+`
- **pnpm**: `v10.0.0+` (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Rust toolchain**: `1.80.0+` (`rustup update stable`) — required for building the desktop application and running Cargo tests.

---

## Monorepo Overview

Stackfold is structured as a pnpm workspace:

```text
packages/
  graph/       # Core graph data types, Dagre/ELK layout computation, and impact analysis
  scanner/     # Deterministic static analysis engine, AST detectors, and standalone sidecar CLI
  platform/    # Abstraction layer between web (fetch) and desktop (Tauri IPC)
apps/
  web/         # Next.js 15 App Router visual control center & static export bundle
  desktop/     # Tauri 2.x native desktop shell & Rust backend
fixtures/      # Realistic test projects used for unit, integration, and UI verification
```

---

## Development Workflow

### 1. Clone & Install
```bash
git clone https://github.com/AminSS99/StackFold.git
cd StackFold
pnpm install
```

### 2. Run the Applications
```bash
# Run the Next.js web application (http://localhost:3000)
pnpm dev:web

# Run the native desktop application (Tauri + live reload)
pnpm dev:desktop
```

### 3. Verification & Quality Gates
Before submitting a pull request, ensure all checks pass:
```bash
# Strict TypeScript & Cargo check
pnpm typecheck

# Full Vitest & Cargo unit tests
pnpm test

# ESLint, Rust format check, and Cargo Clippy
pnpm lint
```

---

## How to Add a Scanner Detector

All static analysis logic lives in `packages/scanner/src/detectors/`.

### 1. The Detector Contract
Every detector implements the `Detector` interface:

```typescript
import type { Detector, ScanContext, DetectorResult } from '../types';

export const myNewDetector: Detector = {
  id: 'my-framework-detector',
  name: 'My Framework Endpoint Detector',
  version: '1.0.0',

  async detect(context: ScanContext): Promise<DetectorResult> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const diagnostics: ScanDiagnostic[] = [];

    // Traverse files matching your framework's conventions
    const targetFiles = context.files.filter(f => f.endsWith('.myext'));
    for (const file of targetFiles) {
      // Parse file AST or parse schema safely
      // Generate GraphNode with valid Evidence
    }

    return { nodes, edges, diagnostics };
  }
};
```

### 2. Graph Evidence Requirements
Stackfold enforces deterministic evidence for every discovered node and edge. Never emit nodes without traceable evidence:

```typescript
evidence: {
  detectorId: 'nextjs-route-detector',
  rule: 'app-router-http-verb',
  filePath: 'app/api/checkout/route.ts',
  sourceRange: {
    startLine: 12,
    startColumn: 1,
    endLine: 24,
    endColumn: 2,
  },
  codeSnippet: 'export async function POST(req: Request) { ... }',
  notes: 'Detected HTTP POST handler via TypeScript AST export analysis'
}
```

### 3. Zero Dangling Edges Guarantee
When creating an edge:
- Ensure both `edge.source` and `edge.target` exist in the returned nodes array or in existing context nodes.
- Run `pnpm --filter=@stackfold/scanner test` to verify graph referential integrity.

### 4. Zero Secrets Policy
- **Never extract, store, or display environment variable values.**
- When writing detectors that inspect environment configurations, collect only variable names and call-site references.

---

## How to Add a Test Fixture

Fixtures provide deterministic verification targets under `fixtures/`:

1. Create a new directory under `fixtures/<my-fixture-name>/`.
2. Add realistic project files:
   - `package.json` with framework dependencies (e.g. Next.js, Prisma, Express, etc.)
   - Source files representing real routes, models, or components
   - `.env.example` showing configuration keys (with mock placeholder names, zero secrets)
3. Exclude the fixture from root monorepo builds by verifying `pnpm-workspace.yaml`.
4. Add a test in `packages/scanner/src/__tests__/real-repository-scans.test.ts` scanning your new fixture and asserting exact node and edge invariants.

---

## Submitting a Pull Request

1. Create a feature branch: `git checkout -b feature/my-detector`.
2. Make concise, well-documented changes.
3. Add automated tests covering your new detector or feature.
4. Run `pnpm typecheck && pnpm test && pnpm lint`.
5. Open a Pull Request on GitHub using our PR template.
