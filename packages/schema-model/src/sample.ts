/**
 * A small but complete example diagram exercising all four team types, all three
 * interaction modes (as placed shapes overlaying the team boundaries), a
 * flow-of-change element and an attached annotation. Ids are fixed so the
 * fixture serialises stably.
 */

import { DOCUMENT_VERSION } from "./types";
import type { TtDocument } from "./types";
import { ANNOTATION_SPEC, INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "./notation";

const s = TEAM_TYPE_SPECS;
const i = INTERACTION_MODE_SPECS;

export const SAMPLE_DOCUMENT: TtDocument = {
  version: DOCUMENT_VERSION,
  title: "Online shop — team topology",
  nodes: [
    {
      id: "team_test_automation",
      type: "enabling",
      label: "Test Automation",
      description: "Coaches stream-aligned teams in test automation, then steps back.",
      position: { x: 60, y: 150 },
      size: { ...s.enabling.defaultSize },
    },
    {
      id: "team_discovery",
      type: "stream-aligned",
      label: "Product Discovery",
      description: "Owns search, browsing and product pages end-to-end.",
      position: { x: 240, y: 202 },
      size: { ...s["stream-aligned"].defaultSize },
    },
    {
      id: "team_checkout",
      type: "stream-aligned",
      label: "Checkout & Payments",
      description: "Owns the checkout and payment journey end-to-end.",
      position: { x: 560, y: 202 },
      size: { ...s["stream-aligned"].defaultSize },
    },
    {
      id: "team_fraud",
      type: "complicated-subsystem",
      label: "Fraud Detection",
      description: "Specialists for the real-time fraud scoring model.",
      position: { x: 870, y: 175 },
      size: { ...s["complicated-subsystem"].defaultSize },
    },
    {
      id: "team_platform",
      type: "platform",
      label: "Cloud Platform",
      description: "Self-service CI/CD, runtime and observability for all teams.",
      position: { x: 240, y: 352 },
      size: { width: 560, height: 110 },
    },
  ],
  interactions: [
    {
      id: "int_testing_discovery",
      mode: "facilitating",
      position: { x: 168, y: 208 },
      size: { ...i.facilitating.defaultSize },
    },
    {
      id: "int_checkout_fraud",
      mode: "collaboration",
      label: "fraud rules",
      position: { x: 779, y: 214 },
      size: { ...i.collaboration.defaultSize },
    },
    {
      id: "int_platform_discovery",
      mode: "x-as-a-service",
      position: { x: 316, y: 286 },
      size: { ...i["x-as-a-service"].defaultSize },
    },
    {
      id: "int_platform_checkout",
      mode: "x-as-a-service",
      position: { x: 636, y: 286 },
      size: { ...i["x-as-a-service"].defaultSize },
    },
  ],
  flows: [
    {
      id: "flow_main",
      label: "Flow of change",
      position: { x: 60, y: 60 },
      size: { width: 980, height: 56 },
    },
  ],
  annotations: [
    {
      id: "ann_fraud_handover",
      text: "Collaboration until the fraud rules are stable (Q3), then X-as-a-Service",
      position: { x: 830, y: 350 },
      size: { ...ANNOTATION_SPEC.defaultSize },
      attachedTo: "int_checkout_fraud",
    },
  ],
};
