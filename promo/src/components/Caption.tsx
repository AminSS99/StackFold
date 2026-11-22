import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../theme";

// Caption zone under the window: headline (with optional accent span) and a supporting line.
export const Caption: React.FC<{
  from: number; until?: number; title: React.ReactNode; sub?: string;
}> = ({ from, until, title, sub }) => {
  const frame = useCurrentFrame();
  const o = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const inT = interpolate(frame, [from, from + 16], [0, 1], { ...o, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const outT = until === undefined ? 1 : interpolate(frame, [until, until + 10], [1, 0], o);
  const opacity = inT * outT;
  return (
    <div
      style={{
        position: "absolute",
        left: 180,
        right: 180,
        top: 930,
        height: 120,
        opacity,
        translate: `0 ${(1 - inT) * 24}px`,
        fontFamily: fonts.sans,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 58, fontWeight: 800, color: colors.text, letterSpacing: -1.2, lineHeight: 1.05 }}>{title}</div>
      {sub && <div style={{ fontSize: 32, fontWeight: 500, color: colors.muted, lineHeight: 1.2 }}>{sub}</div>}
    </div>
  );
};

export const Accent: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = colors.accent }) => (
  <span style={{ color }}>{children}</span>
);
