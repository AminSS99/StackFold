import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { colors, SHOT } from "../theme";

export type CameraKey = { f: number; cx: number; cy: number; s: number };
export type Layer = { src: string; from: number; fadeIn?: number };

// On-screen window that the camera moves inside. All inner coordinates (cursor, rings)
// are in screenshot CSS pixels, so they stay glued to the UI while the camera zooms.
export const FRAME = { x: 180, y: 40, w: 1560, h: 877.5 } as const;

const ease = Easing.bezier(0.45, 0, 0.15, 1);

export const ScreenFrame: React.FC<{
  layers: Layer[];
  camera: CameraKey[];
  children?: React.ReactNode;
}> = ({ layers, camera, children }) => {
  const frame = useCurrentFrame();
  const frames = camera.map((k) => k.f);
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease } as const;
  const cx = interpolate(frame, frames, camera.map((k) => k.cx), opts);
  const cy = interpolate(frame, frames, camera.map((k) => k.cy), opts);
  const s = interpolate(frame, frames, camera.map((k) => k.s), opts);

  // Base scale maps the 1600x900 shot onto the frame; camera scale multiplies it.
  const base = FRAME.w / SHOT.w;
  const total = base * s;

  return (
    <div
      style={{
        position: "absolute",
        left: FRAME.x,
        top: FRAME.y,
        width: FRAME.w,
        height: FRAME.h,
        borderRadius: 22,
        overflow: "hidden",
        background: colors.bg,
        border: `1px solid ${colors.line}`,
        boxShadow: "0 40px 120px rgba(0,0,0,0.65), 0 0 90px rgba(246,201,69,0.07)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SHOT.w,
          height: SHOT.h,
          transformOrigin: "0 0",
          scale: total,
          translate: `${FRAME.w / 2 - cx * total}px ${FRAME.h / 2 - cy * total}px`,
        }}
      >
        {layers.map((l) => {
          const fade = l.fadeIn ?? 8;
          const opacity = interpolate(frame, [l.from, l.from + fade], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <Img
              key={l.src + l.from}
              src={staticFile(`shots/${l.src}.png`)}
              style={{ position: "absolute", inset: 0, width: SHOT.w, height: SHOT.h, opacity }}
            />
          );
        })}
        {children}
      </div>
    </div>
  );
};
