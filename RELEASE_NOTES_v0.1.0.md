# Stackfold v0.1.0 Release Notes

**Release Date:** September 3, 2026  
**Status:** Early Alpha (Public Initial Release)

Stackfold turns modern software codebases into interactive, high-fidelity system maps. It answers the fundamental question:

> *"How does this project actually work, and what will be affected if I change something?"*

---

## Highlights

- **Native Standalone Desktop App (Tauri 2.x)**:
  - Packaged macOS application (`Stackfold.app` and `Stackfold_0.1.0_aarch64.dmg`).
  - Bundled static webview frontend (`apps/web/out`) with strict Content Security Policy.
  - Native folder picker dialog and sandboxed filesystem validation.
  - Subprocess PID tracking with atomic cancellation (`SIGTERM`) and zero orphaned processes.
- **Deterministic Static Scanner (`@stackfold/scanner`)**:
  - Full AST parsing for TypeScript/JavaScript codebases.
  - Next.js App & Pages Router API route mapping with HTTP verbs.
  - Prisma database schema parser extracting models, fields, and relational foreign keys.
  - Monorepo package extraction for pnpm workspaces.
  - **Zero Secret Ingestion**: Discovers environment variable keys without ever reading, logging, or exposing secret values.
- **Interactive System Map (`apps/web` & `@stackfold/graph`)**:
  - React Flow interactive canvas with Dagre hierarchical DAG layout.
  - Four dedicated views: Architecture, API Flows, Database Relations, and Package Dependencies.
  - Change-impact blast-radius analysis showing upstream and downstream dependencies.
  - Node inspector with detailed evidence, source ranges, and direct editor opening (VS Code, Cursor, WebStorm).
  - Search command palette (⌘K) and diagnostics drawer.

---

## macOS Installation & Unsigned Gatekeeper Guidance

Because v0.1.0 is an early alpha release without Apple Developer ID signing or notarization, macOS Gatekeeper will show a warning when opening the downloaded `.app` or `.dmg`.

### How to run on macOS:
1. Mount the `.dmg` and drag `Stackfold.app` into `/Applications`.
2. Open Terminal and remove the macOS quarantine extended attribute:
   ```bash
   xattr -cr /Applications/Stackfold.app
   ```
3. Alternatively, right-click `Stackfold.app` in Finder, hold the `Option` key, select **Open**, and click **Open** in the security prompt.

### Future Signing & Notarization:
Automated Apple Developer ID signing and Apple Notarization (`notarytool`) will be integrated prior to beta distribution.

---

## Release Artifacts & Checksums

| Artifact | Platform / Arch | Size | SHA256 Checksum |
| :--- | :--- | :--- | :--- |
| `Stackfold_0.1.0_aarch64.dmg` | macOS (Apple Silicon) | 5.8 MB | `b7e54cc819ba0affee5615423b9bae7ea9cb6f234c025360fb3db7b82b9b5422` |
| `Stackfold.app` | macOS (Apple Silicon Bundle) | 9.2 MB | *(directory bundle)* |
| `sidecar.cjs` | Node.js CommonJS Bundle | 10.0 MB | *(bundled inside scanner)* |

*(Note: These artifacts are prepared and verified locally; they are not published or uploaded without repository owner action.)*
