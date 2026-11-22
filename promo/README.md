# Stackfold promo video

Remotion project that renders the ~50 s walkthrough in `docs/media/`. It is intentionally **outside** the pnpm workspace (own `package-lock.json`), so repository CI and `pnpm -r` scripts never touch it.

Frames come from the real app: `capture/capture.mjs` drives the static hosted demo with Playwright (1600x900 @2x) and writes `public/shots/*.png` plus `boxes.json` (click targets). Scene timing, camera moves, cursor paths and highlight rings are in `src/scenes/*`; coordinates are screenshot CSS pixels.

```bash
# 1. Serve the static demo build (from the repo root)
pnpm --filter=@stackfold/web build:demo          # NEXT_PUBLIC_BASE_PATH=/StackFold for a Pages-style path
mkdir -p /tmp/pages && ln -sfn "$PWD/apps/web/out" /tmp/pages/StackFold
(cd /tmp/pages && python3 -m http.server 4173) &

# 2. Capture frames, preview, render
cd promo && npm install
node capture/capture.mjs                          # -> public/shots (git-ignored, regenerable)
npx remotion studio                               # live preview
npx remotion render Promo out/stackfold-promo.mp4 --codec=h264 --crf=18
npx remotion render Promo out/preview.gif --codec=gif --every-nth-frame=3 --scale=0.4 --frames=190-430
```

Show the live-demo URL on the end card: `--props='{"demoUrl":"stack-fold-web.vercel.app"}'`.

The CLI scene prints verbatim output of `stackfold fixtures/tx-escape-prisma --format terminal --fail-on-findings`; re-run it and update `src/scenes/CliScene.tsx` if detector wording changes.

Remotion is free for individuals and teams of up to 3; see https://www.remotion.dev/docs/license for company use.
