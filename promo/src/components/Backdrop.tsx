import React from "react";
import { AbsoluteFill } from "remotion";
import { colors } from "../theme";

export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: colors.bg }}>
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(246,201,69,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(246,201,69,0.045) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse at 50% 40%, #000 20%, transparent 75%)",
      }}
    />
    {children}
  </AbsoluteFill>
);
