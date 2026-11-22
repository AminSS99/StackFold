import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Hook } from "./scenes/Hook";
import { MapScene } from "./scenes/MapScene";
import { ImpactScene } from "./scenes/ImpactScene";
import { QueueScene } from "./scenes/QueueScene";
import { ProbesScene } from "./scenes/ProbesScene";
import { CliScene } from "./scenes/CliScene";
import { Outro } from "./scenes/Outro";

export type PromoProps = { demoUrl: string };

const T = 12; // transition length in frames
export const SCENES = { hook: 135, map: 240, impact: 270, queue: 330, probes: 190, cli: 240, outro: 150 } as const;
export const PROMO_DURATION =
  Object.values(SCENES).reduce((a, b) => a + b, 0) - T * (Object.keys(SCENES).length - 1);

const timing = linearTiming({ durationInFrames: T });

export const Promo: React.FC<PromoProps> = ({ demoUrl }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Hook" durationInFrames={SCENES.hook}>
      <Hook />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Map" durationInFrames={SCENES.map}>
      <MapScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Blast radius" durationInFrames={SCENES.impact}>
      <ImpactScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence name="Queue replay" durationInFrames={SCENES.queue}>
      <QueueScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Security probes" durationInFrames={SCENES.probes}>
      <ProbesScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence name="CI gate" durationInFrames={SCENES.cli}>
      <CliScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Outro" durationInFrames={SCENES.outro}>
      <Outro demoUrl={demoUrl} />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
