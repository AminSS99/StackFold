## Summary

<!-- Provide a clear, high-level explanation of the changes made and the motivation. -->

## Motivation & Context

<!-- Why is this change required? What issue or feature does it address? -->
Fixes # (issue number, if applicable)

## Architectural & Security Invariants

Please verify that this pull request complies with Stackfold's design principles:

- [ ] **Zero Secrets Ingestion**: No private keys, passwords, or environment secret values are read, stored, logged, or emitted.
- [ ] **Evidence Integrity**: Any new AST detectors attach exact source locations (`filePath`, `sourceRange`, detector rule) to generated nodes and edges.
- [ ] **No Dangling Edges**: Graph operations preserve referential integrity; every edge connects valid source and target nodes.
- [ ] **Local-First Boundary**: Scanner runs strictly on local files; no external network requests or telemetry are introduced.

## Verification & Testing

Commands executed locally:

- [ ] `pnpm typecheck` (passes with 0 errors)
- [ ] `pnpm test` (passes all Vitest and Cargo test suites)
- [ ] `pnpm lint` (passes ESLint, Cargo Clippy `-D warnings`, and `cargo fmt --check`)
- [ ] Tested on target fixture or real repository: `...`

## Screenshots or Recordings (if UI changes are included)

<!-- Attach before/after screenshots or recordings if modifying React Flow canvas, inspector, or navigation. -->
