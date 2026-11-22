import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../theme";

// Highlight ring drawn around a region of the screenshot (CSS px). Fades in at `from`
// and optionally out at `until`.
export const Ring: React.FC<{
  x: number; y: number; w: number; h: number;
  from: number; until?: number; color?: string; pad?: number; radius?: number;
}> = ({ x, y, w, h, from, until, color = colors.accent, pad = 6, radius = 12 }) => {
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [from, from + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const outT = until === undefined ? 1 : interpolate(frame, [until, until + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = 0.55 + 0.45 * Math.sin((frame - from) / 7);
  return (
    <div
      style={{
        position: "absolute",
        left: x - pad,
        top: y - pad,
        width: w + pad * 2,
        height: h + pad * 2,
        borderRadius: radius,
        border: `3px solid ${color}`,
        boxShadow: `0 0 ${20 + glow * 20}px ${color}66, inset 0 0 18px ${color}22`,
        opacity: inT * outT,
        scale: 0.96 + 0.04 * inT,
      }}
    />
  );
};
