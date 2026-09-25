# Stackfold Architecture and Risk Platform Plan

Stackfold extends its existing local scanner, normalized graph, evidence, impact, platform-adapter, and React Flow UI. Features remain analyzers, provider adapters, rule packs, and testing modules inside the current packages. No source or secret values are transmitted by default, and local analysis requires no account.

## Shared architecture

1. Provider and framework adapters extract normalized facts with repository evidence.
2. Analyzers correlate facts into graph nodes, edges, and first-class findings.
3. Every finding carries a rule ID, severity, confirmed/uncertain status, affected node IDs, source location, evidence, explanation, and suggested action.
4. Reporters serialize the same findings for terminal, JSON, GitHub Actions, and CircleCI output.
5. The UI renders relationships in the existing graph and exposes the same evidence through the existing inspector.

Provider identifiers are normalized and one-way fingerprinted before entering the graph. Active `.env` files remain excluded. PreviewFence currently consumes `.stackfold/preview-fence.json` or `stackfold.preview-fence.json`, an explicit local manifest containing only provider, environment, binding, classification, and safe identifier fields.

## Web/desktop platform boundary

The Tauri desktop application ships the Next.js frontend as a static export (`NEXT_EXPORT=true`). Static export cannot bundle Clerk server actions or depend on Next.js server routes:

- `@clerk/nextjs` and `@clerk/nextjs/server` are aliased to local stubs during static export only, so the desktop bundle contains zero cloud-authentication references. Web deployments keep the real Clerk integration.
- All API routes use `dynamic = 'force-static'` so export collection succeeds. The desktop UI never calls them.
- Shared Security Lab UI calls explicit platform capabilities (`loadCacheIsolationRecorded`, `runCacheIsolationProbe`, `loadSignatureCompatibilityRecorded`, `runSignatureCompatibilityProbe`, `loadQueueCompatibilityRecorded`, `runQueueCompatibilityCheck`) on the active `@stackfold/platform` adapter. The web adapter forwards to server routes; the Tauri adapter invokes Rust commands (`load_cache_isolation_recorded`, `run_cache_isolation_probe`, `load_signature_compatibility_recorded`, `run_signature_compatibility_probe`, `load_queue_compatibility_recorded`, `run_queue_compatibility_probe`) that read recorded results with Rust filesystem access or spawn the scanner sidecar (`cache-isolation`, `signature-compatibility`, `queue-compatibility` subcommands). Filesystem and process execution stay outside generic browser code.
- Cloud authentication is strictly opt-in: Clerk initializes only when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is configured. Without it, cloud-only controls render a clear local-mode state while scanning, fixtures, graph inspection, Security Lab, exports, and desktop use remain fully functional.

## Phases

### Phase 1 — PreviewFence vertical slice (implemented)

- Vercel environment and Supabase project/database/storage adapter contract.
- Detection of preview, development, or staging bindings that reuse a production-bound resource or explicitly target a production-classified resource.
- Confirmed high-severity finding, fingerprint-only graph nodes, `binds_to` relationship, CLI/JSON/CI output, and realistic fixture coverage.

Limitations: the initial local adapter does not call provider APIs, inspect secret-bearing env files, discover branch-specific Vercel overrides automatically, or validate resource existence. It reports only configured evidence and does not treat environment names as proof. Missing manifests produce no finding rather than a speculative result.

### Phase 2 — Drift Impact foundation (implemented)

- Normalized change-event nodes and `may_impact` relationships use the shared evidence and finding models.
- `.stackfold/drift-impact.json` and `stackfold.drift-impact.json` accept manually supplied or machine-readable changelog descriptions.
- Exact package and imported-symbol matches are confirmed; installed/imported packages whose changed symbol cannot be proven are marked uncertain.
- Existing graph impact traversal maps direct imports to downstream routes, modules, files, and consumers. Migration steps are reported but never applied.

Limitations: the initial adapter supports JavaScript/TypeScript ES imports and package targets. It does not yet ingest arbitrary hosted changelog formats, CommonJS calls, dynamic imports, member-level call graphs, semantic version resolution, or runtime-only consumers. A default or namespace import cannot prove every member access, so unmatched symbol correlations remain uncertain.

### Phase 3 — Guardrails and TxEscape (implemented)

- `GuardrailRuleAdapter` and the guardrail runner execute independent rules over the shared scanner context and finding model.
- TxEscape detects confirmed email, external request, and queued-job side effects inside supported transaction callbacks.
- Local named imports are traced one helper call to their exported function body, preserving evidence for both the transaction invocation and external side-effect call.
- Confirmed boundaries become `risk_boundary` graph nodes with `violates` and `traces_to` relationships.
- Repairs recommend after-commit execution or an idempotent transactional outbox; Stackfold does not rewrite the code.

Limitations: the initial rule recognizes Prisma `$transaction`, a conservative `db.transaction` form, direct `fetch`, Axios/Got, Resend/SendGrid email calls, BullMQ jobs, and Amazon SQS sends. It traces one static local ES-module helper hop. Aliased transaction APIs, dependency-injected clients, CommonJS/dynamic imports, deeper helper chains, custom queue wrappers, and runtime dispatch may be missed. Generic method names are not treated as proof without a supported provider import.

### Phase 4 — ScopePatch and IDTrace (implemented)

- ScopePatch correlates supported Octokit REST calls with an explicit local GitHub App permission manifest at `.stackfold/github-app.json` or `stackfold.github-app.json`.
- Each supported call becomes an `api_operation` node linked to a `permission_scope` with a `requires` edge. Missing or insufficient access creates a confirmed finding and an additive `add` patch proposal; no permission is removed or changed automatically.
- IDTrace loads explicit identity domains from `.stackfold/id-trace.json` or `stackfold.id-trace.json`, connects configured mappings with `crosses` edges, and compares TypeScript parameter and argument domains across local and statically imported functions.
- Unsupported, type-proven crossings create `risk_boundary` nodes and confirmed findings. Untyped arguments and variable-name similarities are ignored.

Limitations: ScopePatch is REST-only and deliberately excludes GraphQL. Its first endpoint table covers common Issues, Pull Requests, Contents, Actions, and Checks operations through supported Octokit clients or literal `octokit.request` routes; dynamic routes, custom wrappers, aliased clients, enterprise-specific endpoints, and runtime permission discovery may be missed. Patch metadata only adds or upgrades the required permission and must be reviewed and applied by a developer. IDTrace requires explicit domain/type configuration, recognizes direct TypeScript type references, and follows local named imports for function signatures. It does not run the TypeScript type checker, resolve re-exports/generics/overloads, inspect runtime values, or infer identity semantics from names. Shadowed identifiers and deeper dynamic call paths may be missed.

### Phase 5 — Security and compatibility modules (Cache Isolation, Signature Compatibility, and Queue Compatibility implemented)

- Cache Isolation is implemented as a selected-project workflow driven by the scanned repository's `.stackfold/cache-isolation.json`. The Security Lab loads recorded results from the selected project (or the explicitly labeled `cache-isolation-vulnerable` demo fixture) and runs live two-session Chromium probes when the platform supports browser automation. Actionable states cover missing configuration, missing environment references, Playwright/browser unavailable, target application unavailable, probe running, isolated results, and confirmed leaks.
- Results retain only marker fingerprints and environment-variable references. Confirmed leaks create critical findings plus `security_probe`, `browser_session`, `cache_layer`, and `risk_boundary` topology connected by `warms`, `serves`, and `exposes_private_data` edges.
- `stackfold cache-isolation <repository> [--out result.json] [--headed]` runs the probe directly, while ordinary repository scans consume an optional recorded result. The Security Lab renders the live request path, per-probe evidence, generated Playwright reproduction, and repair guidance.
- Signature Compatibility is implemented as a complete vertical slice. An explicit `.stackfold/signature-compatibility.json` manifest names the HMAC-SHA256 secret reference, the signer and verifier adapter files, their ordered canonicalization steps, and test vectors covering raw bodies, query-parameter ordering, Unicode normalization, timestamps, header casing, percent encoding, base64 bodies, and newline/whitespace differences.
- `stackfold signature-compatibility <repository> [--out result.json]` runs the check directly; ordinary scans consume an optional recorded result. Each failing vector reports the first differing input byte and the responsible normalization step as confirmed high-severity findings with `signer`, `verifier`, `signature_vector`, and `risk_boundary` nodes linked by `signs`, `verifies`, `traces_to`, and `violates` relationships. Uncertain vectors produce uncertain medium-severity findings, never false confirmations.
- Secret values never enter findings, graph nodes, logs, or reports — only SHA-256 fingerprints, synthetic canonical inputs, and environment-variable names. Terminal, JSON, GitHub Actions, and CircleCI reporters serialize the same findings, and the Security Lab signature view renders vectors, exact comparisons, generated vitest reproductions, and repair guidance.
- Queue Compatibility is implemented as a complete vertical slice. An explicit `.stackfold/queue-compatibility.json` manifest maps BullMQ queues, producer/consumer adapter files, payload versions, the current worker contract (required/optional field paths with types, added/removed/renamed metadata), declared version-to-version migration renames, and historical payload fixtures stored as checked-in JSON files.
- `stackfold queue-compatibility <repository> [--out result.json]` replays each historical payload against the current worker contract fully offline — no live Redis, no production queue, and never any worker code execution during scans. Each payload reports `compatible`, `review` (requires review), or `fail` with the exact failing field path and validation step. Fails become confirmed high-severity findings; reviews become uncertain medium-severity findings, never false confirmations.
- Replayed payloads create `queue`, `queue_producer`, `queue_consumer`, and `job_payload` graph nodes linked by `enqueues`, `consumes`, `replays`, `traces_to`, and `violates` relationships, with `risk_boundary` nodes for fails and reviews. Payload values and secrets stay out of findings and reports by default: configured `redactPaths` plus default secret-like leaf patterns are stripped before fingerprinting, and only fingerprints, field paths, and type names are recorded. The Security Lab queue view renders queue summaries, per-payload verdicts, exact comparisons, applied migration paths, generated vitest reproductions, and repair guidance.
- Fields carry a worker-tolerance policy: `onMissing` / `onTypeMismatch` (`fail` default, `review` when the worker tolerates absence or mistyped values) so declared-but-tolerated deviations report review instead of false confirmations. Unknown-field reporting is top-level-first and lists every unknown path so nested leaves never mask queue-level shape deviations.
- Dexie upgrade testing and JSONB/Zod compatibility remain unimplemented.

Limitations: Cache Isolation currently supports header-authenticated HTML, JSON, and production-build routes. It requires explicit, synthetic test credentials and markers supplied through environment variables; it does not discover authentication flows, mutate real user data, inspect CDN configuration, or claim security certification. A confirmed result proves the observed response leak for the tested build and cache path only. Desktop live probes require Playwright browsers alongside the scanner sidecar and otherwise report an explicit unavailable state; recorded results always work.

Signature Compatibility limitations: the first version tests explicitly configured HMAC-SHA256 canonicalizations against synthetic vectors; it executes the configured normalization lists rather than importing and executing arbitrary repository code. Supported adapters are file-referenced signer/verifier pairs (`sign`/`verify` over HMAC-SHA256) with ordered canonicalization steps drawn from the documented vocabulary (method case, query ordering/percent handling, header case/trimming, JSON key sorting, NFC/NFD, hex/base64 decoding, newline/whitespace handling, timestamp inclusion). Expected false positives are avoided by design: undecidable vectors are reported as uncertain, and missing manifests produce no findings rather than speculative results. Hex bodies are only decoded when the input is strictly even-length hexadecimal; base64 only on strict round-trip matches; anything else is left untouched, which can miss double-encoded or armored payloads. Timestamp-bearing signatures always diverge when one side includes and the other excludes the timestamp — that is a true configuration mismatch, not noise.

Queue Compatibility limitations: the first version validates explicitly configured historical payload fixtures against a declared field contract with declared migration renames only; it never imports or executes worker code and requires no live Redis. Supported adapters are file-referenced BullMQ producer/consumer pairs with a declared payload-version list, a current worker version, and a field contract (dotted paths with `string`/`integer`/`number`/`boolean`/`object`/`array`/`null`/`any` types, required flags, and added/removed/renamed metadata). Migration chains resolve stepwise across declared `from`→`to` renames; undeclared version jumps fail loudly instead of guessing. Expected review (uncertain) cases, not false confirmations: unknown queues or versions, unreadable fixtures, producer-ahead payloads, unknown extra fields under non-strict schemas, and present-but-removed fields. Strict schemas escalate unknown fields to confirmed fails. The check cannot observe runtime-only validation inside worker code (custom validators, database lookups, cross-field rules), delayed-job semantics, or repeat/backoff behavior — it proves contract compatibility of the recorded payload shape only. Nested unknown fields are flagged at their full dotted path, which can surface one review per payload even when the worker would ignore the subtree. One contract applies per queue: queues carrying multiple event shapes (e.g. note vs follow deliveries) must union nested paths as optional, since per-event-type field scoping is not supported yet.

Real-application validation (Misskey `userWebhookDeliver`, AGPL-3.0-only, fetched 2026-09-25): producer `QueueService.userWebhookDeliver`, worker `UserWebhookDeliverProcessorService.process`, historical anchor PR #15310 (type-only content sharpening, runtime shape unchanged). Six synthetic payloads replayed; worker behavior verified by code reading plus executed node-fetch probes (`fetch(undefined)` rejects, undefined header values serialize without throwing, `JSON.stringify` drops undefined). Pre-fix run produced 2 false-positive confirmed fails (tolerated `eventId` absence, tolerated `createdAt` mistype), 3 noisy reviews, and 1 masked field — fixed by the tolerance policy and top-level-first reporting above. Final run: 6/6 verdicts agree with actual worker behavior (2 compatible incl. type-only drift correctly silent, 1 true-positive fail on missing destination, 3 correct reviews), zero false confirmations, zero payload values or secrets in results, and a full scan linking every finding to the real producer and consumer files with no dangling edges. Experiment: requiring event-nested `content.note.id` fails follow-event payloads the worker delivers fine — evidence for the per-event-type scoping limitation. Config authorship took ~35 minutes after ~50 minutes of inspection; no Redis, no installs, no worker execution.

### Phase 6 — ErasePlan

- Build only after ownership edges distinguish owned, shared, ambiguous, and retained resources.
- Generate read-only deletion rehearsal and dependency ordering; never execute deletion in the initial module.

## CLI

After `pnpm --filter=@stackfold/scanner build`:

```sh
packages/scanner/dist/stackfold.cjs /path/to/repository --format terminal
packages/scanner/dist/stackfold.cjs /path/to/repository --format json
packages/scanner/dist/stackfold.cjs /path/to/repository --format github-actions --fail-on-findings
packages/scanner/dist/stackfold.cjs /path/to/repository --format circleci --fail-on-findings
packages/scanner/dist/stackfold.cjs cache-isolation /path/to/repository --out result.json
packages/scanner/dist/stackfold.cjs signature-compatibility /path/to/repository --out result.json
packages/scanner/dist/stackfold.cjs queue-compatibility /path/to/repository --out result.json
```
