/**
 * A small but complete example diagram exercising all four team types, all three
 * interaction modes (as placed shapes overlaying the team boundaries) and a
 * flow-of-change element. Ids are fixed so the fixture serialises stably.
 */

import { DOCUMENT_VERSION } from "./types";
import type { TtDocument } from "./types";
import { INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "./notation";

const s = TEAM_TYPE_SPECS;
const i = INTERACTION_MODE_SPECS;

export const SAMPLE_DOCUMENT: TtDocument = {
  version: DOCUMENT_VERSION,
  title: "Online retail — team topology",
  nodes: [
    {
      id: "team_enabling",
      type: "enabling",
      label: "Agile Enablement",
      description: "Coaches teams on testing and continuous delivery practices.",
      position: { x: 60, y: 150 },
      size: { ...s.enabling.defaultSize },
    },
    {
      id: "team_checkout",
      type: "stream-aligned",
      label: "Checkout Stream",
      description: "Owns the end-to-end checkout & payments journey.",
      position: { x: 320, y: 110 },
      size: { ...s["stream-aligned"].defaultSize },
    },
    {
      id: "team_mobile",
      type: "stream-aligned",
      label: "Mobile Experience",
      description: "Owns the native mobile shopping experience.",
      position: { x: 700, y: 110 },
      size: { ...s["stream-aligned"].defaultSize },
    },
    {
      id: "team_fraud",
      type: "complicated-subsystem",
      label: "Risk & Fraud Engine",
      description: "Specialist ML team owning real-time fraud scoring.",
      position: { x: 740, y: 320 },
      size: { ...s["complicated-subsystem"].defaultSize },
    },
    {
      id: "team_platform",
      type: "platform",
      label: "Internal Developer Platform",
      description: "Self-service CI/CD, observability and runtime for all streams.",
      position: { x: 300, y: 540 },
      size: { ...s.platform.defaultSize },
    },
  ],
  interactions: [
    {
      id: "int_enable_checkout",
      mode: "facilitating",
      label: "test automation",
      position: { x: 212, y: 158 },
      size: { ...i.facilitating.defaultSize },
    },
    {
      id: "int_checkout_fraud",
      mode: "collaboration",
      label: "fraud rules discovery",
      position: { x: 566, y: 232 },
      size: { ...i.collaboration.defaultSize },
    },
    {
      id: "int_platform_checkout",
      mode: "x-as-a-service",
      position: { x: 384, y: 396 },
      size: { ...i["x-as-a-service"].defaultSize },
    },
    {
      id: "int_platform_mobile",
      mode: "x-as-a-service",
      position: { x: 612, y: 396 },
      size: { ...i["x-as-a-service"].defaultSize },
    },
    {
      id: "int_fraud_mobile",
      mode: "x-as-a-service",
      label: "risk scoring API",
      position: { x: 800, y: 238 },
      size: { ...i["x-as-a-service"].defaultSize },
    },
  ],
  flows: [
    {
      id: "flow_main",
      label: "Flow of change",
      position: { x: 60, y: 712 },
      size: { width: 880, height: 60 },
    },
  ],
};
