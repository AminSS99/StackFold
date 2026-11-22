import React from "react";
import { Backdrop } from "../components/Backdrop";
import { ScreenFrame } from "../components/ScreenFrame";
import { Cursor } from "../components/Cursor";
import { Ring } from "../components/Ring";
import { Caption, Accent } from "../components/Caption";

// 06-queue: failRow {353,474,1118,57}, queueRunButton {1441,10,143,36}.
// 07-queue-detail (scrolled): banner/field coordinates measured from the 2000px preview / 1.25.
export const QueueScene: React.FC = () => (
  <Backdrop>
    <ScreenFrame
      layers={[
        { src: "06-queue", from: 0 },
        { src: "07-queue-detail", from: 128, fadeIn: 12 },
      ]}
      camera={[
        { f: 0, cx: 800, cy: 450, s: 1 },
        { f: 40, cx: 1000, cy: 300, s: 1.2 },
        { f: 118, cx: 900, cy: 470, s: 1.25 },
        { f: 150, cx: 860, cy: 500, s: 1.45 },
        { f: 250, cx: 860, cy: 540, s: 1.45 },
        { f: 285, cx: 860, cy: 640, s: 1.4 },
        { f: 330, cx: 860, cy: 640, s: 1.4 },
      ]}
    >
      <Cursor
        path={[
          { f: 10, x: 900, y: 600 },
          { f: 36, x: 1510, y: 30 },
          { f: 60, x: 1510, y: 30 },
          { f: 100, x: 900, y: 505 },
        ]}
        clicks={[40]}
      />
      <Ring x={353} y={474} w={1118} h={57} from={70} until={118} color="#ff6b6b" />
      <Ring x={352} y={396} w={1120} h={50} from={160} until={230} color="#ff6b6b" />
      <Ring x={362} y={596} w={92} h={26} from={190} until={250} />
      <Ring x={353} y={750} w={1119} h={130} from={262} />
    </ScreenFrame>
    <Caption from={6} until={116} title={<>Replay old jobs <Accent>against the new worker.</Accent></>} sub="Historical BullMQ payloads, checked offline. No Redis needed." />
    <Caption from={134} until={256} title={<>One field breaks it: <Accent color="#ff6b6b">customer.email</Accent></>} sub="Worker v2 rejects it at check-required-fields. Exact step, exact field." />
    <Caption from={262} title={<>And it tells you <Accent>how to fix it.</Accent></>} sub="Repair guidance and a generated reproduction." />
  </Backdrop>
);
