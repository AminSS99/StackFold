import React from "react";
import { Backdrop } from "../components/Backdrop";
import { ScreenFrame } from "../components/ScreenFrame";
import { Ring } from "../components/Ring";
import { Caption, Accent } from "../components/Caption";

// 08-signature: "8/8 mismatched" pill {1341,123,131,35}, banner {352,722,1120,74}.
// 09-cache: leaked private-marker card {1007,487,146,144}, "Confirmed leak" header {1190,70,380,60}.
export const ProbesScene: React.FC = () => (
  <Backdrop>
    <ScreenFrame
      layers={[
        { src: "08-signature", from: 0 },
        { src: "09-cache", from: 96, fadeIn: 12 },
      ]}
      camera={[
        { f: 0, cx: 800, cy: 450, s: 1 },
        { f: 30, cx: 880, cy: 520, s: 1.35 },
        { f: 90, cx: 880, cy: 600, s: 1.45 },
        { f: 100, cx: 900, cy: 450, s: 1.0 },
        { f: 130, cx: 1000, cy: 350, s: 1.35 },
        { f: 190, cx: 1000, cy: 350, s: 1.4 },
      ]}
    >
      <Ring x={352} y={722} w={1120} h={74} from={46} until={92} color="#ff6b6b" />
      <Ring x={1007} y={487} w={146} h={144} from={118} color="#ff6b6b" />
      <Ring x={1190} y={74} w={380} h={60} from={134} />
    </ScreenFrame>
    <Caption from={4} until={92} title={<>Signature mismatches, <Accent>byte-exact.</Accent></>} sub="8 of 8 test vectors mismatch, with the first differing byte pinpointed." />
    <Caption from={100} title={<>Cross-session cache leaks, <Accent>reproduced.</Accent></>} sub="Two authenticated sessions. One private marker in the wrong place." />
  </Backdrop>
);
