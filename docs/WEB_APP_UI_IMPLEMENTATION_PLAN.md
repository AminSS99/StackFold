# Stackfold Web App UI Implementation Plan

Status: implementation-ready design and engineering brief  
Audience: product designers, frontend engineers, and coding agents  
Last updated: 2026-09-07

## 1. Product outcome

Build Stackfold into a focused, premium architecture control center that feels fast, trustworthy, and unmistakably yellow-and-black.

The experience must help a developer complete three jobs without reading documentation first:

1. Open or try a repository.
2. Understand its architecture and inspect the evidence behind every relationship.
3. Download the native app or continue to the GitHub repository.

The result should feel ambitious through clarity, responsive motion, and excellent graph interaction—not through visual noise. The graph is the product. Every surrounding surface exists to help the user interrogate it.

## 2. Product facts found in the repository

- Stackfold is a local-first architecture intelligence tool, not a code generator.
- The main runtime is a Next.js 15 / React 19 application shared with a Tauri 2 desktop shell.
- The graph uses React Flow and a deterministic Dagre layout.
- Primary workflows already exist: repository scanning, four graph views, search, node filtering, density controls, diagnostics, export, AI-assisted explanation, impact analysis, evidence, and editor deep links.
- The repository already contains a `/download` route, a macOS DMG link, a SHA-256 checksum, product screenshots, and links to GitHub, releases, and documentation.
- The existing visual language mixes amber branding with indigo/purple primary actions and semantic cyan, green, violet, rose, and blue node colors.
- The current desktop-style shell assumes a wide viewport. At narrower widths, the top bar clips and the left sidebar plus inspector leave too little usable graph area.

## 3. Experience principles

### Graph first

The architecture map should occupy at least 70% of the usable workspace when no inspector is open and remain legible when supporting panels appear.

### One brand accent

Yellow is the product accent for selection, focus, primary action, progress, and active navigation. Semantic colors remain available for graph taxonomy and health states, but never compete as primary interface chrome.

### Evidence creates trust

Every insight should lead to a source file, source range, detector, or relationship. AI output must be visually labeled as interpretation and separated from deterministic evidence.

### Progressive disclosure

Common actions stay visible. Advanced graph density, layout, export, diagnostics, and display settings live in a single command surface or compact toolbar.

### Motion explains state

Animation should reveal cause and effect: scans populate the graph, selection highlights neighbors, impact analysis traces paths, panels preserve spatial context, and view changes morph rather than flash.

### Local-first is visible

The interface should continuously reassure users that source stays on device. Use short, specific language such as “Scanned locally” and “No secret values read.”

## 4. Information architecture

### Public website and conversion surface

Recommended route: `/download`, expanded into the canonical public product page.

Sections:

1. Compact sticky header: logo, Product, Security, Docs, GitHub, Download.
2. Hero: outcome statement, macOS download CTA, “View on GitHub” secondary CTA, current release/platform metadata.
3. Interactive product proof: a large framed product screenshot with three selectable stories—Map, Impact, Evidence.
4. Trust strip: local-only, deterministic parsing, open source, checksum verified.
5. Three-step workflow: Scan → Explore → Change with confidence.
6. Capability grid: architecture, APIs, database, dependencies, evidence, export.
7. Download panel: platform detection, architecture choice when available, checksum, release notes, Gatekeeper disclosure.
8. Open-source CTA: star/fork/contribute links routed to the GitHub repository.
9. Footer: license, documentation, security policy, releases, issue tracker.

All GitHub destinations should use a single exported repository constant. External links open safely in a new tab. The primary download URL should come from release metadata or a single release configuration module; it must not be copied across components.

### Product workspace

Recommended route: `/` for compatibility in the first pass. A future route split may use `/app` after external links and desktop configuration are migrated.

Workspace regions:

1. App rail: logo/project switcher, four views, search, download/GitHub access.
2. Context bar: project name, scan status, active view summary, primary contextual actions.
3. Graph canvas: nodes, edges, minimap, zoom, selection and focus states.
4. Filter panel: collapsible or resizable; closed by default below 1280 px.
5. Inspector: resizable on large screens, overlay drawer below 1180 px, full-screen sheet below 720 px.
6. Command palette: universal navigation and action layer.
7. Status layer: scan progress, diagnostics, toasts, offline/local-only signals.

## 5. Core user flows

### First visit and demo

1. Show a cinematic but immediately usable empty graph canvas, not a detached marketing dashboard.
2. Present two primary choices: “Open repository” and “Explore sample project.”
3. Keep the desktop download as a visible tertiary action.
4. When the sample is chosen, animate a short scanning sequence with named stages.
5. Populate nodes in dependency order and fit the completed graph.
6. Show a lightweight coach mark: “Select a node to inspect impact and evidence.”

Success criterion: a new user reaches an interactive graph in two clicks or fewer.

### Open a local repository

1. Desktop: use the native folder picker as the primary action.
2. Web: clearly explain that the path is read by the local development host; do not imply browser filesystem access that does not exist.
3. Validate inline and show detected technologies before scan.
4. Display scanner stages and allow cancellation.
5. On success, show project name, scan duration, files analyzed, warnings, and whether cache was used.
6. On failure, preserve the entered path and give a recovery action.

### Explore architecture

1. Switch among Architecture, API, Database, and Dependencies without losing zoom unnecessarily.
2. Search by entity, file, route, technology, or environment variable.
3. Selecting a node highlights first-degree relationships; all unrelated nodes dim.
4. Hovering an edge reveals its relationship label and direction.
5. Double-clicking a node isolates a subgraph; a persistent breadcrumb exits focus mode.
6. Filters update counts and offer “show only connected” as a shortcut.

### Inspect and assess change impact

1. Node selection opens the inspector without covering the selected node when space permits.
2. Default inspector summary answers: what is it, where is it, what connects to it, and why was it detected?
3. Impact view separates direct and transitive dependents and traces affected paths on the canvas.
4. Evidence view shows source ranges and snippets with copy/open-in-editor actions.
5. AI Insights clearly states the context it used and links every factual claim back to deterministic evidence.

### Download and GitHub

1. Detect the visitor platform for CTA copy, while always allowing manual platform selection.
2. Download the correct signed/notarized artifact when available.
3. Keep the current unsigned-alpha Gatekeeper guidance visible before download until notarization exists.
4. Offer copyable checksum and a “View release on GitHub” fallback beside the primary download.
5. Route logo/footer/source actions to `https://github.com/AminSS99/StackFold` or its precise subpage.
6. Track only privacy-safe aggregate conversion events if telemetry is later introduced; never attach repository paths or graph content.

## 6. Visual direction

### Theme

Name: Industrial Precision.

The look combines matte black work surfaces, warm signal-yellow interaction states, fine technical grid lines, crisp typography, and restrained depth. Avoid generic neon gradients, oversized glass cards, and decorative dashboard widgets.

### Color tokens

Define semantic CSS variables in `apps/web/src/app/globals.css` and map Tailwind utilities to them.

```css
:root {
  --sf-bg: #070806;
  --sf-surface-1: #0d0f0c;
  --sf-surface-2: #141611;
  --sf-surface-3: #1b1e17;
  --sf-border: #2a2d24;
  --sf-border-strong: #3b3f31;
  --sf-text: #f6f7f2;
  --sf-text-muted: #a5aa9b;
  --sf-text-subtle: #74796d;
  --sf-yellow: #f6c945;
  --sf-yellow-hover: #ffda67;
  --sf-yellow-pressed: #d9aa22;
  --sf-yellow-soft: rgba(246, 201, 69, 0.12);
  --sf-danger: #ff6b6b;
  --sf-success: #62d49b;
  --sf-warning: #f6c945;
  --sf-focus: #ffe48f;
}
```

Rules:

- Use yellow for active tabs, primary CTAs, selection rings, focused graph paths, and scan progress.
- Use node taxonomy colors only inside nodes, edges, legends, and taxonomy filters.
- Never communicate a graph category by color alone; pair it with an icon and label.
- Avoid pure white backgrounds or large pure-yellow areas. Yellow should feel like a precise signal.
- Text and interactive states must meet WCAG AA contrast.

### Typography

- Interface: Geist Sans or Inter, with system fallback.
- Technical metadata: Geist Mono or JetBrains Mono.
- Headings use compact tracking and no more than three weight levels.
- Base workspace size: 13–14 px; never use 10 px for essential controls or status.
- Marketing hero: fluid `clamp(2.75rem, 6vw, 6.5rem)` with balanced line wrapping.

### Shape and depth

- Primary radius: 10 px; cards: 14 px; large marketing frames: 20 px.
- Use one-pixel borders and subtle inset highlights instead of heavy shadows.
- Reserve glow for the active graph path or scan event, with low opacity.
- Make selected nodes visibly selected through border, halo, and connection emphasis—not a color swap alone.

### Iconography and assets

- Continue using Lucide for UI actions.
- Use the approved Stackfold logo asset from `assets/brand/stackfold-symbol-v5.png` or `apps/web/public/logo.png`; remove repeated logo drawings made from styled divs.
- Product imagery must use real application screenshots. Do not create fake graph screenshots for marketing.

## 7. Component system

Create primitives before redesigning screens:

- `Button`: primary, secondary, ghost, danger, icon-only; small/medium/large.
- `IconButton`: required accessible label, tooltip, and 40 px minimum hit target.
- `Surface`: flat, raised, interactive, selected.
- `Badge`: neutral, semantic, taxonomy, release.
- `Tabs`: underline for inspector; segmented for graph views.
- `Tooltip`: delayed pointer display, immediate keyboard display.
- `Popover` and `Menu`: settings, layout, export, project actions.
- `Drawer` and `Sheet`: inspector and filters at constrained widths.
- `Toast`: scan, copy, export, and error confirmation.
- `Skeleton`: graph, inspector, release metadata.
- `EmptyState`: title, concrete explanation, one primary and one secondary action.
- `Kbd`: keyboard shortcut display.
- `PropertyList`: readable node metadata; replaces raw JSON where possible.
- `CodeBlock`: syntax-aware evidence with copy and open-in-editor actions.

Each primitive needs default, hover, active, focus-visible, disabled, loading, and error states where applicable.

## 8. Graph interaction specification

### Nodes

- Consistent anatomy: taxonomy icon, name, concise type label, one meaningful metadata row.
- Expanded detail belongs in the inspector, not the node.
- Minimum 44 px selectable height and a clear focus-visible ring.
- Selection: yellow outline plus a soft outer ring.
- Impacted: yellow edge trace with numbered depth badge.
- Warning: warning icon and label, never a border color alone.

### Edges

- Default edges stay quiet and low contrast.
- Hover makes the entire edge target easier to acquire.
- Selected path animates a short directional dash or traveling highlight for no more than 600 ms, then settles.
- Edge labels appear on hover/focus or when the relationship is selected.
- Respect `prefers-reduced-motion` by removing path travel and using an immediate emphasis state.

### Canvas controls

- Group zoom, fit, layout, minimap, and density controls into a compact floating dock.
- Keep search separate and prominent.
- Show a legend only when requested; do not permanently consume canvas space.
- Persist view, density, and panel preferences locally per project.
- Preserve viewport per view when practical.

### Inspector

- Large screens: 400–480 px resizable side panel.
- Medium screens: overlay drawer with canvas pan adjustment so the selected node remains visible.
- Small screens: full-screen sheet with a clear return-to-map control.
- Overview begins with plain-language facts, then relationships, then attributes.
- Replace raw serialized field arrays with a compact schema table.

## 9. Motion and interaction language

Use CSS transitions for micro-interactions and React Flow animation for graph state. Add an animation library only if shared-layout transitions cannot be achieved cleanly.

Durations:

- Hover/focus: 120–160 ms.
- Tabs, menus, and selection: 180–220 ms.
- Drawers and inspector: 240–300 ms.
- Scan completion and graph entrance: 450–700 ms, staggered in small groups.

Easing:

- Enter: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Exit: `cubic-bezier(0.4, 0, 1, 1)`.
- Avoid continuous ambient animation except a subtle, pausable scan indicator.

Required moments:

- Scan stages progress through Discovery, Parse, Link, Validate, Layout.
- Successful scan transitions into the graph without a blank flash.
- View tabs crossfade/morph nodes while preserving spatial context.
- Inspector content transitions without sliding the entire canvas on medium widths.
- Copy/export actions confirm with a short icon swap and live-region announcement.

## 10. Responsive behavior

### ≥ 1440 px

- Rail/sidebar 272–304 px.
- Inspector 420 px and resizable.
- Full context bar and labeled actions.

### 1180–1439 px

- Collapsible filter panel.
- Compact top actions; secondary actions move to “More.”
- Inspector overlays the canvas and pans selection into view.

### 720–1179 px

- Icon app rail.
- Bottom canvas dock.
- Filters and inspector are drawers.
- View switcher supports horizontal scrolling without clipping.

### < 720 px

- Public/download site remains fully responsive.
- Workspace is supported for inspection and demos, with full-screen sheets and a simplified canvas toolbar.
- Show a gentle recommendation to use desktop for large graphs; do not block access.

## 11. Accessibility requirements

- Target WCAG 2.2 AA for all non-canvas UI.
- Every icon-only control has an accessible name and visible tooltip.
- Keyboard path: open project, switch view, search, move between search results, select node, cycle inspector tabs, close panels.
- Add an accessible graph summary and searchable node list as an alternative to spatial exploration.
- Do not globally disable text selection; allow selecting paths, metadata, diagnostics, snippets, and checksum text.
- Avoid essential 10 px text. Essential information should be at least 12 px, preferably 13–14 px.
- Use focus-visible rings that are not removed by custom styling.
- Announce scan stage, completion, error, copy, and export events through polite live regions.
- Keep motion optional with `prefers-reduced-motion`.
- Validate color contrast in every interactive state, including muted text and disabled controls.
- Test at 200% browser zoom and with screen-reader landmarks.

## 12. Content guidance

Preferred product line:

> See how your codebase fits together—and what changes when you touch it.

Supporting line:

> Stackfold scans locally and turns routes, schemas, services, and dependencies into an evidence-backed system map.

Preferred CTAs:

- Primary public CTA: “Download for macOS.”
- Secondary public CTA: “View on GitHub.”
- Product CTA: “Open repository.”
- Demo CTA: “Explore sample project.”

Avoid vague claims such as “AI-powered magic,” “revolutionary,” or unsupported scan-time promises. Use measurable repository-backed claims only.

## 13. Engineering architecture

Recommended additions inside `apps/web/src`:

```text
components/
  ui/                 shared primitives
  shell/              app rail, context bar, responsive panels
  graph/              graph dock, legend, accessible node list
  marketing/          hero, proof, trust, download panels
config/
  links.ts            repository/docs/issues/releases URLs
  release.ts          version, artifact metadata, checksums
lib/
  media.ts            platform and reduced-motion helpers
styles/
  tokens.css          semantic design tokens
```

Implementation constraints:

- Preserve the `@stackfold/platform` adapter boundary.
- Do not introduce a network dependency into repository scanning.
- Keep static export compatibility for the Tauri shell.
- Prefer server-rendered marketing markup; isolate client state to interactive proof and copy/download controls.
- Avoid duplicating workspace controls between desktop and web. Use responsive composition around shared actions.
- Centralize all GitHub, docs, release, and artifact URLs.
- Use progressive enhancement for platform detection. A visible manual choice must remain.

## 14. Phased execution plan

### Phase 0 — Baseline and safety

Tasks:

- Record baseline screenshots at 1440×900, 1280×800, 1024×768, 768×1024, and 390×844.
- Cover empty workspace, scanning, loaded graph, selected node, impact, evidence, command palette, diagnostics, export, and download.
- Add automated accessibility and responsive smoke checks.
- Confirm current scan, cache, export, and Tauri behavior before visual changes.

Exit criteria:

- Existing product behavior is documented.
- High-risk flows have regression coverage.

### Phase 1 — Foundations

Tasks:

- Add semantic tokens and Tailwind mappings.
- Load the chosen sans and mono fonts without breaking offline desktop use.
- Build UI primitives and remove duplicated logo markup.
- Centralize repository and release configuration.
- Add focus, reduced-motion, live-region, and selectable-text foundations.

Exit criteria:

- Primitives render all states in a local component gallery or test page.
- No existing workflow changes behavior.

### Phase 2 — Responsive workspace shell

Tasks:

- Replace the crowded top bar with app rail + context bar + overflow menu.
- Make filters collapsible/resizable.
- Implement responsive inspector drawer/sheet behavior.
- Move canvas controls into a floating dock.
- Preserve graph area and selected-node visibility when panels open.

Exit criteria:

- No toolbar clipping from 720 px upward.
- Opening the inspector leaves a useful graph viewport or overlays it cleanly.
- All actions remain reachable by keyboard.

### Phase 3 — Graph clarity and interaction

Tasks:

- Standardize node anatomy and selection states.
- Improve edge hit areas, labels, and directional feedback.
- Add per-view viewport memory.
- Add graph legend and accessible node list on demand.
- Animate scan population, selection, isolation, and impact paths.

Exit criteria:

- Users can identify node type, selected node, and relationship direction without relying on color alone.
- Reduced-motion mode has no moving path effects.
- Large fixtures remain responsive.

### Phase 4 — Inspector and trust surfaces

Tasks:

- Redesign Details into human-readable property groups.
- Redesign Impact into direct/transitive groups with canvas path synchronization.
- Improve Evidence snippets, source ranges, copy, and editor actions.
- Separate deterministic facts from AI interpretation.
- Add clear local-only/privacy status language.

Exit criteria:

- No primary metadata is presented as raw JSON.
- Every insight can be traced to evidence or explicitly marked as inference.

### Phase 5 — Public/download experience

Tasks:

- Expand `/download` into the public product and download page.
- Implement sticky navigation, product proof, workflow explanation, trust strip, release panel, and open-source CTA.
- Add platform-aware artifact copy with manual fallback.
- Pull current release data at build time when CI supports it; otherwise use one typed release config.
- Point download fallback, source, docs, issues, releases, and contribution links to precise GitHub destinations.

Exit criteria:

- The primary download starts the expected artifact.
- “View on GitHub” reaches the repository.
- Release version, file size, checksum, and Gatekeeper status have a single source of truth.
- The page works with JavaScript disabled except for enhanced screenshot switching/copy feedback.

### Phase 6 — Polish, performance, and verification

Tasks:

- Run keyboard, screen-reader, contrast, 200% zoom, and reduced-motion checks.
- Test public and workspace layouts at all target breakpoints.
- Measure graph interaction and initial page performance.
- Remove layout shifts, animation jank, stale claims, and dead actions.
- Capture final screenshots and compare them side by side with the selected visual target.
- Verify `typecheck`, tests, lint, web build, static export, and Tauri build.

Exit criteria:

- No critical or serious automated accessibility violations on standard flows.
- No clipped or unreachable controls at target sizes.
- Core interactions remain smooth on the larger bundled fixture.
- Desktop packaging still works offline.

## 15. Suggested implementation batches for coding agents

Keep each batch independently reviewable. An agent must inspect existing code and tests before editing, preserve unrelated changes, and report exact verification results.

### Batch A — tokens and primitives

Prompt:

> Implement Phase 1 from `docs/WEB_APP_UI_IMPLEMENTATION_PLAN.md`. Add semantic Stackfold design tokens, reusable UI primitives, shared logo usage, centralized link/release configuration, focus-visible styles, reduced-motion handling, and live-region support. Preserve all current workflows and static-export compatibility. Add focused tests and run typecheck, tests, lint, and the web build.

### Batch B — shell and responsive behavior

Prompt:

> Implement Phase 2 from `docs/WEB_APP_UI_IMPLEMENTATION_PLAN.md` using the Phase 1 primitives. Recompose the workspace into a responsive app rail, context bar, collapsible filters, canvas dock, and adaptive inspector. Ensure no action clipping at target breakpoints and keep the selected graph node visible when the inspector opens. Add interaction and responsive tests.

### Batch C — graph experience

Prompt:

> Implement Phase 3 from `docs/WEB_APP_UI_IMPLEMENTATION_PLAN.md`. Standardize node anatomy, clarify edges and selection, add viewport memory, a legend, an accessible searchable node list, and restrained graph motion with reduced-motion fallbacks. Preserve layout correctness and benchmark the bundled fixtures.

### Batch D — inspector and evidence

Prompt:

> Implement Phase 4 from `docs/WEB_APP_UI_IMPLEMENTATION_PLAN.md`. Replace raw attribute dumps with readable property/schema views, synchronize impact paths with the canvas, improve evidence actions, and visually distinguish deterministic evidence from AI interpretation. Preserve editor deep links and test direct and transitive impact flows.

### Batch E — product/download site

Prompt:

> Implement Phase 5 from `docs/WEB_APP_UI_IMPLEMENTATION_PLAN.md`. Turn `/download` into Stackfold’s canonical responsive product and download page, using real repository screenshots and the shared release/link configuration. Keep the yellow-and-black visual system, add a clear GitHub path and safe external links, preserve the unsigned-alpha disclosure while applicable, and verify every CTA without downloading during automated tests.

### Batch F — verification and polish

Prompt:

> Execute Phase 6 from `docs/WEB_APP_UI_IMPLEMENTATION_PLAN.md`. Test the complete first-run, sample scan, graph exploration, node inspection, impact/evidence, export, download, and GitHub flows across target breakpoints. Fix visible regressions and accessibility failures. Provide before/after screenshots, performance observations, and exact command results.

## 16. Definition of done

The redesign is complete only when all of the following are true:

- The interface is recognizably Stackfold at a glance through its black/yellow system.
- A first-time user can open or demo a project and understand the next action.
- The graph stays central and usable when filters or the inspector are open.
- Workspace controls do not clip or disappear at supported breakpoints.
- Impact and evidence are understandable without inspecting raw JSON.
- Motion provides feedback, respects reduced-motion preferences, and does not impede work.
- Keyboard and assistive-technology users have a complete non-spatial path through graph entities.
- The product page explains value with real product proof.
- Download metadata is accurate and centrally configured.
- Download, GitHub, docs, releases, issues, and contribution destinations work.
- Web, static export, and Tauri builds pass alongside existing scanner/graph tests.

## 17. Product decisions that require confirmation before implementation

These do not block foundation work, but they should be resolved before the relevant phase:

1. Whether `/download` remains the public canonical page or a new `/product` landing route is introduced.
2. Whether Windows and Intel macOS artifacts will be offered in the first redesign release.
3. Whether the current AI Insights feature is local-only, externally hosted, or a placeholder; the interface must describe its data boundary accurately.
4. Whether the unsigned Gatekeeper flow remains acceptable for the public launch or notarization is a release requirement.
5. Whether privacy-safe product analytics are desired on the public page.

