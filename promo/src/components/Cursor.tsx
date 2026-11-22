import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../theme";

export type CursorKey = { f: number; x: number; y: number };

const ease = Easing.bezier(0.4, 0, 0.2, 1);

// Pointer that glides through keyframes (screenshot CSS px) and pulses on `clicks`.
export const Cursor: React.FC<{ path: CursorKey[]; clicks?: number[]; size?: number }> = ({
  path,
  clicks = [],
  size = 1,
}) => {
  const frame = useCurrentFrame();
  const fs = path.map((k) => k.f);
  const o = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease } as const;
  const x = interpolate(frame, fs, path.map((k) => k.x), o);
  const y = interpolate(frame, fs, path.map((k) => k.y), o);
  const visible = interpolate(frame, [fs[0], fs[0] + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const click = clicks.find((c) => frame >= c && frame < c + 16);
  const t = click === undefined ? 0 : (frame - click) / 16;
  const press = click === undefined ? 1 : 1 - 0.18 * Math.sin(Math.min(t * 2, 1) * Math.PI);

  return (
    <>
      {click !== undefined && (
        <div
          style={{
            position: "absolute",
            left: x - 26 * size,
            top: y - 26 * size,
            width: 52 * size,
            height: 52 * size,
            borderRadius: "50%",
            border: `3px solid ${colors.accent}`,
            opacity: 1 - t,
            scale: 0.4 + t * 1.2,
          }}
        />
      )}
      <svg
        width={34 * size}
        height={34 * size}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x,
          top: y,
          opacity: visible,
          scale: press,
          transformOrigin: "0 0",
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
        }}
      >
        <path d="M3 2 L3 19 L8 14.5 L11.2 21.5 L14 20.3 L10.9 13.4 L17.5 13 Z" fill="#fff" stroke="#070806" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </>
  );
};
