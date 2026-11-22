import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { colors, fonts } from "../theme";

const ez = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Outro: React.FC<{ demoUrl?: string }> = ({ demoUrl }) => {
  const frame = useCurrentFrame();
  const rise = (start: number) => ({
    opacity: interpolate(frame, [start, start + 14], [0, 1], clamp),
    translate: `0 ${interpolate(frame, [start, start + 24], [40, 0], { ...clamp, easing: ez })}px`,
  });
  const chips = ["Open source · Apache-2.0", "Local-first", "TypeScript · Next.js · Prisma · BullMQ"];
  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: fonts.sans }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, ...rise(0) }}>
            <Img src={staticFile("logo.png")} style={{ width: 150, height: 150, borderRadius: 34 }} />
            <div style={{ fontSize: 140, fontWeight: 800, color: colors.text, letterSpacing: -4 }}>Stackfold</div>
          </div>
          <div style={{ display: "flex", gap: 18, ...rise(14) }}>
            {chips.map((c) => (
              <div key={c} style={{ fontSize: 30, color: colors.muted, border: `1px solid ${colors.line}`, background: colors.panel, padding: "12px 24px", borderRadius: 999 }}>
                {c}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, fontFamily: fonts.mono, fontSize: 52, color: colors.accent, ...rise(28) }}>
            github.com/AminSS99/StackFold
          </div>
          {demoUrl ? (
            <div style={{ fontFamily: fonts.mono, fontSize: 40, color: colors.text, ...rise(40) }}>
              Live demo: {demoUrl}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
