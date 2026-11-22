import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const inter = loadInter("normal", { weights: ["500", "700", "800"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

// Palette lifted from the product UI (apps/web tokens) so the video matches the app.
export const colors = {
  bg: "#070806",
  panel: "#0d0f0c",
  line: "#2a2d24",
  text: "#f6f7f2",
  muted: "#a5aa9b",
  accent: "#f6c945",
  danger: "#ff6b6b",
  ok: "#62d49b",
} as const;

export const fonts = {
  sans: inter.fontFamily,
  mono: mono.fontFamily,
} as const;

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

// Screenshots are captured at a 1600x900 CSS-pixel viewport (2x DPR).
export const SHOT = { w: 1600, h: 900 } as const;
