/**
 * A small but complete example diagram exercising all four team types, all three
 * interaction modes (as placed shapes overlaying the team boundaries), a
 * flow-of-change element and an attached annotation. The stream-aligned teams
 * are stacked as parallel lanes along the flow of change, as in the Team
 * Topologies book: side by side on the flow they would read as hand-offs. Ids are
 * fixed so the fixture serialises stably.
 */

import { DOCUMENT_VERSION } from "./types";
import type { TtDocument } from "./types";
import { ANNOTATION_SPEC, INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "./notation";

const s = TEAM_TYPE_SPECS;
const i = INTERACTION_MODE_SPECS;

const LANE_WIDTH = 600;

export const SAMPLE_DOCUMENT: TtDocument = {
  version: DOCUMENT_VERSION,
  title: "Online shop team topology",
  nodes: [
    {
      id: "team_test_automation",
      type: "enabling",
      label: "Test Automation",
      description: "Coaches stream-aligned teams in test automation, then steps back.",
      position: { x: 40, y: 150 },
      size: { width: s.enabling.defaultSize.width, height: 222 },
    },
    {
      id: "team_discovery",
      type: "stream-aligned",
      label: "Product Discovery",
      description: "Owns search, browsing and product pages end-to-end.",
      position: { x: 220, y: 150 },
      size: { width: LANE_WIDTH, height: s["stream-aligned"].defaultSize.height },
    },
    {
      id: "team_checkout",
      type: "stream-aligned",
      label: "Checkout & Payments",
      description: "Owns the checkout and payment journey end-to-end.",
      position: { x: 220, y: 276 },
      size: { width: LANE_WIDTH, height: s["stream-aligned"].defaultSize.height },
    },
    {
      id: "team_fulfilment",
      type: "stream-aligned",
      label: "Order Fulfilment",
      description: "Owns delivery, tracking and returns end-to-end.",
      position: { x: 220, y: 402 },
      size: { width: LANE_WIDTH, height: s["stream-aligned"].defaultSize.height },
    },
    {
      id: "team_fraud",
      type: "complicated-subsystem",
      label: "Fraud Detection",
      description: "Specialists for the real-time fraud scoring model.",
      position: { x: 880, y: 249 },
      size: { ...s["complicated-subsystem"].defaultSize },
    },
    {
      id: "team_platform",
      type: "platform",
      label: "Cloud Platform",
      description: "Self-service CI/CD, runtime and observability for all teams.",
      position: { x: 220, y: 552 },
      size: { width: LANE_WIDTH, height: 110 },
    },
  ],
  interactions: [
    {
      id: "int_testing_discovery",
      mode: "facilitating",
      position: { x: 148, y: 156 },
      size: { ...i.facilitating.defaultSize },
    },
    {
      id: "int_testing_checkout",
      mode: "facilitating",
      position: { x: 148, y: 282 },
      size: { ...i.facilitating.defaultSize },
    },
    {
      id: "int_checkout_fraud",
      mode: "collaboration",
      label: "fraud rules",
      position: { x: 794, y: 288 },
      size: { ...i.collaboration.defaultSize },
    },
    {
      id: "int_platform_fulfilment",
      mode: "x-as-a-service",
      position: { x: 476, y: 486 },
      size: { ...i["x-as-a-service"].defaultSize },
    },
  ],
  flows: [
    {
      id: "flow_main",
      label: "Flow of change",
      position: { x: 40, y: 40 },
      size: { width: 1010, height: 56 },
    },
  ],
  annotations: [
    {
      id: "ann_fraud_handover",
      text: "Collaboration until the fraud rules are stable (Q3), then X-as-a-Service",
      position: { x: 880, y: 423 },
      size: { ...ANNOTATION_SPEC.defaultSize },
      attachedTo: "int_checkout_fraud",
    },
  ],
};
