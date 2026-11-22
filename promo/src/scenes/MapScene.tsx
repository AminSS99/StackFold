import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { ScreenFrame } from "../components/ScreenFrame";
import { Cursor } from "../components/Cursor";
import { Caption, Accent } from "../components/Caption";
import { colors, fonts } from "../theme";

// Real coordinates from promo/public/shots/boxes.json: ecomCard {789,395,245,214}.
export const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const chip = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Backdrop>
      <ScreenFrame
        layers={[
          { src: "01-home", from: 0 },
          { src: "02-graph", from: 62, fadeIn: 12 },
        ]}
        camera={[
          { f: 0, cx: 800, cy: 450, s: 1 },
          { f: 56, cx: 800, cy: 450, s: 1 },
          { f: 84, cx: 1060, cy: 470, s: 1.3 },
          { f: 230, cx: 1110, cy: 480, s: 1.7 },
        ]}
      >
        <Cursor
          path={[
            { f: 16, x: 1180, y: 760 },
            { f: 52, x: 905, y: 505 },
            { f: 70, x: 905, y: 505 },
            { f: 120, x: 1160, y: 380 },
          ]}
          clicks={[56]}
        />
      </ScreenFrame>
      <div
        style={{
          position: "absolute",
          left: 215,
          top: 78,
          opacity: chip,
          translate: `0 ${(1 - chip) * -16}px`,
          fontFamily: fonts.mono,
          fontSize: 28,
          color: colors.accent,
          background: "rgba(7,8,6,0.88)",
          border: `1px solid ${colors.line}`,
          borderRadius: 14,
          padding: "12px 22px",
        }}
      >
        26 nodes · 31 edges · scanned locally
      </div>
      <Caption
        from={8}
        until={92}
        title={<>Open a repo. <Accent>Get the real architecture.</Accent></>}
        sub="Routes, database models and services, parsed from your source."
      />
      <Caption
        from={118}
        title={<>Deterministic, <Accent>not guessed.</Accent></>}
        sub="Static analysis of TypeScript, Next.js and Prisma. Evidence on every node."
      />
    </Backdrop>
  );
};
