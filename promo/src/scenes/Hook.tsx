import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { colors, fonts } from "../theme";

const ez = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const line = (start: number) => ({
    opacity: interpolate(frame, [start, start + 14], [0, 1], clamp),
    translate: `0 ${interpolate(frame, [start, start + 22], [50, 0], { ...clamp, easing: ez })}px`,
  });
  // First beat fades out as the brand beat arrives.
  const beatA = interpolate(frame, [58, 72], [1, 0], clamp);
  const beatB = interpolate(frame, [66, 84], [0, 1], clamp);

  return (
    <Backdrop>
      <AbsoluteFill style={{ opacity: beatA, justifyContent: "center", alignItems: "center", fontFamily: fonts.sans }}>
        <div style={{ textAlign: "center", fontSize: 150, fontWeight: 800, letterSpacing: -4, lineHeight: 1.08 }}>
          <div style={{ color: colors.text, ...line(6) }}>Green CI.</div>
          <div style={{ color: colors.danger, ...line(24) }}>Broken job queue.</div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: beatB, justifyContent: "center", alignItems: "center", fontFamily: fonts.sans }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 170,
              height: 170,
              borderRadius: 38,
              scale: interpolate(frame, [66, 100], [0.85, 1], { ...clamp, easing: ez }),
              boxShadow: "0 0 80px rgba(246,201,69,0.18)",
            }}
          />
          <div style={{ fontSize: 132, fontWeight: 800, color: colors.text, letterSpacing: -4 }}>Stackfold</div>
          <div style={{ fontSize: 50, fontWeight: 500, color: colors.muted, maxWidth: 1300, textAlign: "center", lineHeight: 1.2 }}>
            See what a change will break, <span style={{ color: colors.accent }}>before you ship it.</span>
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
