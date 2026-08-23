# Stackfold

> **Visual project intelligence and architecture control center.**

Stackfold turns software codebases into interactive, high-fidelity system maps. It answers the fundamental question:

> **"How does this project actually work, and what will be affected if I change something?"**

---

## Architecture & Monorepo Structure

Stackfold is built as a modular TypeScript monorepo managed with `pnpm`:

```text
StackFold/
├── packages/
│   ├── graph/                 # Normalized graph model, validation, impact traversal & layout engine
│   │   ├── src/types.ts       # Strict Node, Edge, Evidence, Confidence schema
│   │   ├── src/builder.ts     # Immutable graph builder with cycle checking & deterministic IDs
│   │   ├── src/operations/    # Change-impact traversal, filtering, and search
│   │   └── src/layout/        # Dagre-powered coordinate layout & view transforms
│   │
│   └── scanner/               # Deterministic static analysis engine
│       ├── src/detectors/     # Next.js, Prisma, TS AST, Workspace, Env & SDK detectors
│       ├── src/pipeline/      # Ignore filters (.gitignore, zero secret leakage) & cross-linking
│       └── src/index.ts       # scanRepository() orchestrator
│
├── apps/
│   └── web/                   # Next.js 15 App Router UI control center
│       ├── src/components/
│       │   ├── canvas/        # React Flow custom node & edge renderers
│       │   ├── inspector/     # Details, Impact analysis, Evidence & AI reasoning tabs
│       │   ├── sidebar/       # Repository onboarder, stats & node type filter panel
│       │   ├── navigation/    # Top view switcher, layout toggle, JSON exporter
│       │   └── search/        # Quick command palette (Cmd+K)
│       └── src/app/api/       # /api/scan & /api/fixtures endpoints
│
└── fixtures/
    └── sample-ecommerce-app/  # Realistic Next.js 14 + Prisma + PostgreSQL + Stripe test fixture
```

---

## Core Capabilities & Features

1. **Deterministic Static Code Analysis**:
   - **Next.js Route Discovery**: App Router (`app/**/route.ts`, `app/**/page.tsx`) with HTTP verbs (GET, POST, PUT, DELETE), path params (`[id]`), and Pages Router support.
   - **Prisma Schema Parsing**: Extracts models, relational foreign keys (`@relation`), field datatypes, enums, and database provider.
   - **External Cloud SDKs**: Detects integrations for Stripe, Resend, OpenAI, Supabase, Redis, AWS SDK, and PostgreSQL drivers.
   - **Zero Secret Leakage**: Detects environment variable keys and usage locations (`process.env.VAR`, `import.meta.env.VAR`, `.env.example`), but **never** reads or exposes secret values.

2. **Interactive Multi-View Canvas**:
   - **Architecture View**: High-level topology of applications, services, API routes, database models, and configuration.
   - **API Flows View**: Traces route handlers down to database reads/writes and external SDK calls.
   - **Database View**: Entity-relationship diagram of all Prisma models.
   - **Dependencies View**: Internal workspace packages, source modules, and dependencies.

3. **Change-Impact Analysis (Blast Radius Traversal)**:
   - Evaluates direct dependents (Depth 1) and transitive dependents (Depth > 1).
   - Computes severity scoring (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and lists all affected public API routes and database models.

4. **Inspector & Evidence Proof**:
   - Every node and edge displays verified file paths, AST rule, line numbers, and confidence levels.
   - One-click file path copying and direct VS Code editor opening (`vscode://file/...`).

5. **AI Architectural Intelligence**:
   - Separates **100% Verified Deterministic Facts** from **Architectural Inferences** and **Runtime Unknowns**.
   - Includes a sanitized context payload preview to audit what is transmitted.

---

## Quick Start & Verification

### Prerequisites
- Node.js `v20+` or `v22+`
- `pnpm` `v10+`

### Installation
```bash
# Clone and install dependencies
git clone <repo-url>
cd StackFold
pnpm install
```

### Run Tests
```bash
# Run Vitest test suites for graph operations & static analyzer
pnpm test
```

### Type Checking
```bash
# Run strict TypeScript validation across all workspace packages
pnpm typecheck
```

### Production Build
```bash
# Build all packages and Next.js web application
pnpm build
```

### Start Development Server
```bash
# Start the visual control center
pnpm dev
# Open http://localhost:3000 in your browser
```

---

## Security Guarantees

- **Zero Secret Ingestion**: Active environment files (`.env`, `.env.local`, `.env.production`) are excluded by default. Scanner AST checks extract variable identifiers only.
- **Local-First Analysis**: All static analysis runs entirely on your local machine without uploading repository files.
- **Auditable Context**: When invoking AI reasoning, the exact sanitized JSON context payload is previewable before transmission.
