# GitHub profile preparation — 13 October 2026

## Main caption / repository About description

Map your JavaScript and TypeScript codebase, trace dependencies, and see what a code change could affect.

## Short profile entry

**[Stackfold](https://github.com/AminSS99/StackFold)** — An open-source codebase explorer for JavaScript and TypeScript. View architecture, API flows, database relations, and package dependencies, with source-linked change impact and configured architecture-risk checks.

## Readiness

Ready for early-alpha source evaluation after the preparation changes pass hosted CI and are merged. The published Apple Silicon v0.1.0 desktop alpha is older than the current Security Lab code. It is unsigned/not notarized and requires Node.js installed separately. Do not imply the old DMG contains every feature on the current branch.

Local verification of the current source: 75 passing tests (graph 6, scanner 52, platform 9, Rust 8), typecheck and lint pass, production web and Tauri static export pass, and the macOS `.app` and `.dmg` build succeeds.

The latest observed public-main CI run [34093046667](https://github.com/AminSS99/StackFold/actions/runs/34093046667) failed because Cargo checks ran before the scanner sidecar existed. A fresh source-snapshot install also exposed a stale lockfile for the queue fixtures. Preparation fixes the CI build order, updates the lockfile, and adds CLI distribution smoke coverage. After the fixes, a clean source snapshot passed frozen installation, scanner/dependency build, CLI help and compatibility gate smoke, and a sample repository scan. The preparation run [38302596137](https://github.com/AminSS99/StackFold/actions/runs/38302596137) subsequently passed frozen installation, CLI smoke, typecheck, all tests, lint, web/static export, and the native macOS app/DMG build. This validates the build and synthetic checks; it does not certify the application or replace a signed release.

## Claims to use

- Local JavaScript/TypeScript architecture exploration and source-linked impact traversal.
- Four views: architecture, API flows, database relations, package dependencies.
- Source-checkout risk checks and explicitly configured Cache Isolation, HMAC Signature Compatibility, and BullMQ Queue Compatibility workflows.
- Queue replay validates declared contracts against payload fixtures; it does not run a live worker or Redis deployment.

## Next proof

Merge the validated preparation branch, then produce a versioned desktop release with matching source, checksums, and accurate installation instructions. Signing/notarization and a clean-machine installation rehearsal remain distribution work. Evaluate more real projects before making broad production-readiness or framework-support claims. Per-job-name queue scoping, Dexie, JSONB, and ErasePlan remain future work.
