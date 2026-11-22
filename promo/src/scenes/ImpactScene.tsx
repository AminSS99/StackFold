import React from "react";
import { Backdrop } from "../components/Backdrop";
import { ScreenFrame } from "../components/ScreenFrame";
import { Cursor } from "../components/Cursor";
import { Ring } from "../components/Ring";
import { Caption, Accent } from "../components/Caption";

// Coordinates (screenshot CSS px) from boxes.json: prismaNode {1212,518,124,51},
// impactTab {1278,168,101,38}, evidenceTab {1378,168,101,38}.
export const ImpactScene: React.FC = () => (
  <Backdrop>
    <ScreenFrame
      layers={[
        { src: "02-graph", from: 0 },
        { src: "03-select", from: 46, fadeIn: 10 },
        { src: "04-impact", from: 104, fadeIn: 8 },
        { src: "05-evidence", from: 214, fadeIn: 8 },
      ]}
      camera={[
        { f: 0, cx: 1000, cy: 470, s: 1.25 },
        { f: 40, cx: 1100, cy: 500, s: 1.35 },
        { f: 70, cx: 1050, cy: 470, s: 1.2 },
        { f: 112, cx: 1330, cy: 360, s: 1.75 },
        { f: 205, cx: 1330, cy: 360, s: 1.75 },
        { f: 222, cx: 1360, cy: 290, s: 1.9 },
        { f: 270, cx: 1360, cy: 290, s: 1.9 },
      ]}
    >
      <Cursor
        path={[
          { f: 8, x: 1000, y: 700 },
          { f: 38, x: 1274, y: 545 },
          { f: 80, x: 1274, y: 545 },
          { f: 100, x: 1328, y: 190 },
          { f: 196, x: 1328, y: 190 },
          { f: 212, x: 1428, y: 190 },
          { f: 270, x: 1450, y: 260 },
        ]}
        clicks={[42, 102, 213]}
      />
      {/* Critical blast radius banner + affected endpoints (04-impact) */}
      <Ring x={1186} y={273} w={384} h={90} from={126} until={158} color="#ff6b6b" />
      <Ring x={1198} y={417} w={360} h={112} from={160} until={204} />
      {/* Deterministic verification card (05-evidence) */}
      <Ring x={1185} y={225} w={385} h={86} from={236} />
    </ScreenFrame>
    <Caption from={6} until={92} title={<>Pick a file. <Accent>See the blast radius.</Accent></>} sub="Select lib/prisma.ts and trace everything that depends on it." />
    <Caption from={112} until={204} title={<>3 API endpoints <Accent color="#ff6b6b">break with it.</Accent></>} sub="Direct and transitive dependents, before you change a line." />
    <Caption from={222} title={<>Every claim <Accent>traces to source.</Accent></>} sub="TypeScript AST, high confidence, no inference." />
  </Backdrop>
);
