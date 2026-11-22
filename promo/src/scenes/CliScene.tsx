import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Caption, Accent } from "../components/Caption";
import { colors, fonts } from "../theme";
import { FRAME } from "../components/ScreenFrame";

// Output below is the verbatim result of:
//   node packages/scanner/dist/stackfold.cjs fixtures/tx-escape-prisma --format terminal --fail-on-findings
// (exit code 1). Re-run it if the detector wording changes.
const COMMAND = "stackfold fixtures/tx-escape-prisma --format terminal --fail-on-findings";
const OUTPUT: { text: string; color?: string; delay: number }[] = [
  { text: "Stackfold found 1 issue (1 confirmed, 0 uncertain).", color: colors.text, delay: 0 },
  { text: "", delay: 4 },
  { text: "[HIGH] TxEscape: email is triggered inside a database transaction", color: colors.danger, delay: 10 },
  { text: "  Rule: guardrails/tx-escape/external-side-effect-in-transaction · confirmed", color: colors.muted, delay: 20 },
  { text: "  At: src/checkout.ts:10", color: colors.accent, delay: 30 },
  {
    text: "  Why: The database transaction can roll back after resend has accepted the email. That leaves the external side effect committed while the corresponding database state is absent or stale.",
    color: colors.text,
    delay: 42,
  },
  {
    text: "  Action: Move the email after a successful commit, or write an outbox record inside the transaction and process it idempotently after commit.",
    color: colors.ok,
    delay: 62,
  },
];

const TYPE_START = 14;
const CHARS_PER_FRAME = 1.9;
const OUTPUT_START = TYPE_START + Math.ceil(COMMAND.length / CHARS_PER_FRAME) + 10;
const ez = Easing.bezier(0.16, 1, 0.3, 1);

export const CliScene: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.min(COMMAND.length, Math.floor((frame - TYPE_START) * CHARS_PER_FRAME)));
  const caretOn = Math.floor(frame / 8) % 2 === 0;
  const exitAt = OUTPUT_START + 90;
  const exitT = interpolate(frame, [exitAt, exitAt + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ez });

  return (
    <Backdrop>
      <div
        style={{
          position: "absolute",
          left: FRAME.x,
          top: FRAME.y,
          width: FRAME.w,
          height: FRAME.h,
          borderRadius: 22,
          overflow: "hidden",
          background: "#0a0b09",
          border: `1px solid ${colors.line}`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.65), 0 0 90px rgba(246,201,69,0.07)",
          fontFamily: fonts.mono,
        }}
      >
        <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: "#11130f", borderBottom: `1px solid ${colors.line}` }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
          <div style={{ marginLeft: 16, color: colors.muted, fontSize: 20 }}>ci · pull request check</div>
        </div>
        <div style={{ padding: "34px 44px", fontSize: 34, lineHeight: 1.42, color: colors.text }}>
          <div>
            <span style={{ color: colors.accent }}>$ </span>
            {COMMAND.slice(0, typed)}
            {typed < COMMAND.length && caretOn && <span style={{ background: colors.text, color: colors.bg }}> </span>}
          </div>
          <div style={{ marginTop: 18 }}>
            {OUTPUT.map((l, i) => {
              const start = OUTPUT_START + l.delay;
              const o = interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ opacity: o, color: l.color, minHeight: l.text ? undefined : 20, whiteSpace: "pre-wrap" }}>
                  {l.text}
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 44,
            bottom: 36,
            opacity: exitT,
            scale: 0.9 + 0.1 * exitT,
            padding: "16px 28px",
            borderRadius: 14,
            background: "rgba(255,107,107,0.12)",
            border: `2px solid ${colors.danger}`,
            color: colors.danger,
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          exit code 1 · merge blocked
        </div>
      </div>
      <Caption from={8} title={<>Block the merge <Accent>in CI.</Accent></>} sub="Terminal, JSON, GitHub Actions and CircleCI reporters. Exit 1 on confirmed findings." />
    </Backdrop>
  );
};
