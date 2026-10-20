#!/usr/bin/env node
// Checks a Team Topologies Modeler file (.tt / .ttm.json) without any dependency: the schema the
// modeler enforces on open, the references it resolves, and the layout mistakes that make a
// generated diagram unreadable. It also spells out which teams every interaction connects, because
// in this notation that relationship exists only as geometric overlap.
//
// Usage: node check.mjs <file>... [--write] [--strict]
//   --write   rewrite each file in the canonical form the modeler saves (only if it has no errors)
//   --strict  exit non-zero on warnings too

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DOCUMENT_VERSION = 3;

export const TEAM_TYPES = {
  "stream-aligned": {
    label: "Stream-aligned",
    defaultSize: { width: 240, height: 96 },
    minSize: { width: 140, height: 64 },
  },
  enabling: {
    label: "Enabling",
    defaultSize: { width: 120, height: 200 },
    minSize: { width: 80, height: 120 },
  },
  "complicated-subsystem": {
    label: "Complicated Subsystem",
    defaultSize: { width: 170, height: 150 },
    minSize: { width: 110, height: 100 },
  },
  platform: {
    label: "Platform",
    defaultSize: { width: 380, height: 130 },
    minSize: { width: 200, height: 90 },
  },
};

export const INTERACTION_MODES = {
  collaboration: {
    label: "Collaboration",
    defaultSize: { width: 112, height: 72 },
    minSize: { width: 60, height: 44 },
  },
  "x-as-a-service": {
    label: "X-as-a-Service",
    defaultSize: { width: 88, height: 78 },
    minSize: { width: 54, height: 48 },
  },
  facilitating: {
    label: "Facilitating",
    defaultSize: { width: 84, height: 84 },
    minSize: { width: 48, height: 48 },
  },
};

export const FLOW = {
  label: "Flow of change",
  defaultSize: { width: 520, height: 64 },
  minSize: { width: 160, height: 36 },
};

export const ANNOTATION = {
  label: "Annotation",
  defaultSize: { width: 200, height: 64 },
  minSize: { width: 60, height: 30 },
};

// Mirrors the renderer's stacking (TtZOrder): a team only stays visible inside another team if it
// is painted later, i.e. sits in a higher tier or comes later in the file within the same tier.
const TEAM_STACKING_TIER = {
  "stream-aligned": 1,
  platform: 1,
  "complicated-subsystem": 2,
  enabling: 3,
};

// Mirrors the renderer's label layout (draw/label-layout.ts). The wrap is character-count based
// there too, so this estimate predicts the same line breaks the canvas shows.
const LABEL_INSET = 10;
const ANNOTATION_PADDING = { left: 10, right: 6, top: 6, bottom: 6 };
const LINE_HEIGHT = 1.2;
const AVERAGE_CHARACTER_WIDTH = 0.58;
const FONT_SIZE = { team: 13.5, interaction: 11, flow: 11, annotation: 12 };
// The renderer sets labels with dominant-baseline "central"; the letters sit on the alphabetic
// baseline about this fraction of the font size lower, where the triangle is already wider.
const BASELINE_BELOW_CENTRE = 0.3;

// Stacked stream-aligned lanes sit 30px apart in the documented grid, while separate groups of
// lanes (business areas, value streams) start ≥ 120px apart; a wider gap therefore starts another
// group that the platform's one triangle does not reach.
const MAX_STACKED_LANE_GAP = 60;

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DOCUMENT_KEYS = ["version", "title", "nodes", "interactions", "flows", "annotations"];
const TEAM_KEYS = ["id", "type", "label", "description", "position", "size", "fill", "stroke"];
const INTERACTION_KEYS = ["id", "mode", "label", "position", "size", "fill", "stroke"];
const FLOW_KEYS = ["id", "label", "position", "size"];
const ANNOTATION_KEYS = ["id", "text", "position", "size", "attachedTo"];

const UNKNOWN_FIELD = "unknown field; the modeler ignores it and keeps it on save";

// Parts of a diagram the file never lists take these ids, so no element may use them.
const DIAGRAM_ROOT_ID = "tt-root";
const ENGINE_ROOT_ID_PREFIX = "__implicitroot";
const associationId = (annotationId) => `assoc_${annotationId}`;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

function validateElement(element, path, allowedKeys, validateFields, findings) {
  if (!isPlainObject(element)) {
    findings.errors.push({ path, message: "must be an object" });
    return false;
  }
  const errorCountBefore = findings.errors.length;
  const fail = (field, message) => findings.errors.push({ path: `${path}.${field}`, message });

  if (typeof element.id !== "string" || element.id.length === 0) {
    fail("id", "must be a non-empty string");
  }
  validateFields(element, fail);
  if (!isPlainObject(element.position)) {
    fail("position", "must be an object { x, y }");
  } else {
    for (const axis of ["x", "y"]) {
      if (!isFiniteNumber(element.position[axis])) fail(`position.${axis}`, "must be a number");
    }
  }
  if (!isPlainObject(element.size)) {
    fail("size", "must be an object { width, height }");
  } else {
    for (const dimension of ["width", "height"]) {
      const value = element.size[dimension];
      if (!isFiniteNumber(value) || value <= 0)
        fail(`size.${dimension}`, "must be a positive number");
    }
  }
  for (const key of Object.keys(element)) {
    if (!allowedKeys.includes(key)) {
      findings.warnings.push({ path: `${path}.${key}`, message: UNKNOWN_FIELD });
    }
  }
  return findings.errors.length === errorCountBefore;
}

function optionalString(element, field, fail) {
  if (element[field] !== undefined && typeof element[field] !== "string") {
    fail(field, "must be a string when present");
  }
}

function optionalColour(element, field, fail) {
  if (
    element[field] !== undefined &&
    !(typeof element[field] === "string" && HEX_COLOUR.test(element[field]))
  ) {
    fail(field, 'must be a hex colour such as "#ffd966" (3 or 6 digits, no colour names)');
  }
}

const teamFields = (team, fail) => {
  if (!Object.hasOwn(TEAM_TYPES, team.type))
    fail("type", `must be one of ${Object.keys(TEAM_TYPES).join(", ")}`);
  if (typeof team.label !== "string") fail("label", "must be a string");
  optionalString(team, "description", fail);
  optionalColour(team, "fill", fail);
  optionalColour(team, "stroke", fail);
};

const interactionFields = (interaction, fail) => {
  if (!Object.hasOwn(INTERACTION_MODES, interaction.mode)) {
    fail("mode", `must be one of ${Object.keys(INTERACTION_MODES).join(", ")}`);
  }
  optionalString(interaction, "label", fail);
  optionalColour(interaction, "fill", fail);
  optionalColour(interaction, "stroke", fail);
};

const flowFields = (flow, fail) => optionalString(flow, "label", fail);

const annotationFields = (annotation, fail) => {
  if (typeof annotation.text !== "string") fail("text", "must be a string");
  if (
    annotation.attachedTo !== undefined &&
    !(typeof annotation.attachedTo === "string" && annotation.attachedTo.length > 0)
  ) {
    fail("attachedTo", "must be a non-empty element id when present");
  }
};

const COLLECTIONS = [
  { key: "nodes", kind: "team", allowedKeys: TEAM_KEYS, validateFields: teamFields },
  {
    key: "interactions",
    kind: "interaction",
    allowedKeys: INTERACTION_KEYS,
    validateFields: interactionFields,
  },
  { key: "flows", kind: "flow", allowedKeys: FLOW_KEYS, validateFields: flowFields },
  {
    key: "annotations",
    kind: "annotation",
    allowedKeys: ANNOTATION_KEYS,
    validateFields: annotationFields,
  },
];

const box = (element) => ({
  left: element.position.x,
  top: element.position.y,
  right: element.position.x + element.size.width,
  bottom: element.position.y + element.size.height,
});

const overlaps = (first, second) =>
  Math.min(first.right, second.right) > Math.max(first.left, second.left) &&
  Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top);

const contains = (outer, inner) =>
  outer.left <= inner.left &&
  outer.top <= inner.top &&
  outer.right >= inner.right &&
  outer.bottom >= inner.bottom;

const horizontallyAligned = (first, second) =>
  Math.min(first.right, second.right) > Math.max(first.left, second.left);

function describe(element) {
  if (element.kind === "team") return `team "${element.label}" (${element.id})`;
  if (element.kind === "interaction") return `${element.mode} ${element.id}`;
  if (element.kind === "flow") return `flow ${element.id}`;
  return `annotation ${element.id}`;
}

const teamName = (team) => `"${team.label || team.id}"`;

export function wrapLabel(text, maxWidth, fontSize) {
  const maxCharacters = Math.max(4, Math.floor(maxWidth / (fontSize * AVERAGE_CHARACTER_WIDTH)));
  const lines = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxCharacters && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  while (lines.length > 0 && lines[0] === "") lines.shift();
  return { lines, maxCharacters };
}

function labelBox(element) {
  const { width, height } = element.size;
  if (element.kind === "annotation") {
    return {
      width: width - ANNOTATION_PADDING.left - ANNOTATION_PADDING.right,
      height: height - ANNOTATION_PADDING.top - ANNOTATION_PADDING.bottom,
      fontSize: FONT_SIZE.annotation,
    };
  }
  if (element.kind === "flow") {
    const arrowHeadWidth = Math.min(width * 0.16, height * 1.1);
    return { width: width - arrowHeadWidth - 2 * LABEL_INSET, height, fontSize: FONT_SIZE.flow };
  }
  return { width: width - 2 * LABEL_INSET, height, fontSize: FONT_SIZE[element.kind] };
}

// The renderer centres a label in the glyph's bounding box, but the triangle narrows towards its
// tip, so a label that fits the box can still run over the slanted edges.
function triangleWidthAtBaseline(interaction, lineCentre, fontSize) {
  const { width, height } = interaction.size;
  return (width * (lineCentre + BASELINE_BELOW_CENTRE * fontSize)) / height;
}

function checkLabelFits(element, warnings) {
  const text = element.kind === "annotation" ? element.text : element.label;
  if (!text) return;
  const { width, height, fontSize } = labelBox(element);
  const { lines, maxCharacters } = wrapLabel(text, Math.max(width, 1), fontSize);
  const lineHeight = fontSize * LINE_HEIGHT;
  const textHeight = lines.length * lineHeight;
  const longestLine = Math.max(...lines.map((line) => line.length));
  const characterWidth = fontSize * AVERAGE_CHARACTER_WIDTH;
  if (textHeight > height) {
    warnings.push({
      path: element.id,
      message: `${describe(element)}: text wraps to ${lines.length} lines (~${Math.ceil(textHeight)}px) but the shape is ${height}px high; enlarge it or shorten the text`,
    });
  } else if (longestLine > maxCharacters) {
    warnings.push({
      path: element.id,
      message: `${describe(element)}: a word in "${text}" is wider than the shape (~${maxCharacters} characters per line); widen it or break the word`,
    });
  } else if (element.kind === "interaction" && element.mode === "x-as-a-service") {
    const firstLineCentre = (height - textHeight) / 2 + lineHeight / 2;
    const runsOverTheEdges = lines.some(
      (line, index) =>
        line.length * characterWidth >
        triangleWidthAtBaseline(element, firstLineCentre + index * lineHeight, fontSize),
    );
    if (runsOverTheEdges) {
      const capacity = Math.floor(
        triangleWidthAtBaseline(element, height / 2, fontSize) / characterWidth,
      );
      warnings.push({
        path: element.id,
        message: `${describe(element)}: the label "${text}" runs over the triangle's slanted edges (~${capacity} characters fit on one line); use one short word, enlarge the triangle or explain it in an annotation`,
      });
    }
  }
}

function centredLabelArea(team) {
  const { width, fontSize } = labelBox(team);
  const { lines } = wrapLabel(team.label, Math.max(width, 1), fontSize);
  const longestLine = Math.max(0, ...lines.map((line) => line.length));
  const textWidth = Math.min(width, longestLine * fontSize * AVERAGE_CHARACTER_WIDTH);
  const textHeight = lines.length * fontSize * LINE_HEIGHT;
  const centreX = team.position.x + team.size.width / 2;
  const centreY = team.position.y + team.size.height / 2;
  return {
    left: centreX - textWidth / 2,
    top: centreY - textHeight / 2,
    right: centreX + textWidth / 2,
    bottom: centreY + textHeight / 2,
  };
}

function checkMinimumSize(element, minSize, warnings) {
  if (element.size.width < minSize.width || element.size.height < minSize.height) {
    warnings.push({
      path: element.id,
      message: `${describe(element)}: ${element.size.width}×${element.size.height} is below the minimum ${minSize.width}×${minSize.height}; the editor cannot resize it that small`,
    });
  }
}

function checkTeams(teams, warnings, readings) {
  const fileOrder = [...teams].sort(compareIds);
  for (let firstIndex = 0; firstIndex < fileOrder.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < fileOrder.length; secondIndex++) {
      const earlier = fileOrder[firstIndex];
      const later = fileOrder[secondIndex];
      if (!overlaps(box(earlier), box(later))) continue;
      const [outer, inner] = contains(box(earlier), box(later))
        ? [earlier, later]
        : contains(box(later), box(earlier))
          ? [later, earlier]
          : [undefined, undefined];
      if (!outer) {
        warnings.push({
          path: later.id,
          message: `${describe(earlier)} and ${describe(later)} partly overlap; keep teams apart (~60px) and place an interaction on the gap if they interact`,
        });
        continue;
      }
      const outerTier = TEAM_STACKING_TIER[outer.type];
      const innerTier = TEAM_STACKING_TIER[inner.type];
      const outerPaintedLast =
        outerTier > innerTier || (outerTier === innerTier && outer === later);
      if (outerPaintedLast) {
        warnings.push({
          path: inner.id,
          message: `${describe(inner)} sits inside ${describe(outer)}, but the outer team is painted on top and hides it; give the outer team an id that sorts before "${inner.id}"`,
        });
      } else {
        readings.push(`grouping        ${teamName(inner)} sits inside ${teamName(outer)}`);
        if (overlaps(box(inner), centredLabelArea(outer))) {
          warnings.push({
            path: inner.id,
            message: `${describe(inner)} covers the centred label of ${describe(outer)}; keep the grouping's middle free, e.g. place the inner teams in its lower part`,
          });
        }
      }
    }
  }
}

// Along the flow of change, two stream-aligned teams that share less than half of their horizontal
// extent read as consecutive stages, whether they sit in one row or step down like a staircase.
function followOneAnother(first, second) {
  const firstBox = box(first);
  const secondBox = box(second);
  const verticalGap =
    Math.max(firstBox.top, secondBox.top) - Math.min(firstBox.bottom, secondBox.bottom);
  const horizontalOverlap =
    Math.min(firstBox.right, secondBox.right) - Math.max(firstBox.left, secondBox.left);
  return (
    verticalGap <= MAX_STACKED_LANE_GAP &&
    horizontalOverlap < Math.min(first.size.width, second.size.width) / 2
  );
}

// The teams inside a platform grouping build the platform; they are not stages of the consumers'
// flow, and the grouping has no room to stack them.
const insideOnePlatform = (first, second, teams) =>
  teams.some(
    (outer) =>
      outer.type === "platform" &&
      contains(box(outer), box(first)) &&
      contains(box(outer), box(second)),
  );

function checkStreamAlignedRows(teams, warnings) {
  const streamAligned = teams
    .filter((team) => team.type === "stream-aligned")
    .sort(
      (first, second) =>
        first.position.x - second.position.x ||
        first.position.y - second.position.y ||
        compareIds(first, second),
    );
  for (let leftIndex = 0; leftIndex < streamAligned.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < streamAligned.length; rightIndex++) {
      const left = streamAligned[leftIndex];
      const right = streamAligned[rightIndex];
      if (!followOneAnother(left, right)) continue;
      if (insideOnePlatform(left, right, teams)) continue;
      const neighbourInBetween = streamAligned.some(
        (middle) =>
          middle !== left &&
          middle !== right &&
          box(middle).left >= box(left).left &&
          box(middle).right <= box(right).right &&
          followOneAnother(middle, left) &&
          followOneAnother(middle, right),
      );
      if (neighbourInBetween) continue;
      warnings.push({
        path: right.id,
        message: `${teamName(left)} and ${teamName(right)} sit one after the other along the flow of change (side by side or staggered); that reads as a hand-off — stack stream-aligned teams as parallel lanes, one below the other`,
      });
    }
  }
}

function touchedTeams(interaction, teams) {
  const interactionBox = box(interaction);
  const touched = teams.filter((team) => overlaps(box(team), interactionBox));
  return touched.filter(
    (candidate) =>
      !touched.some((other) => other !== candidate && contains(box(candidate), box(other))),
  );
}

const isServiceGlyph = (interaction, touched) =>
  interaction.mode === "x-as-a-service" &&
  touched.length === 2 &&
  horizontallyAligned(box(touched[0]), box(touched[1]));

function providerAndConsumer(first, second) {
  const firstIsLower =
    first.position.y + first.size.height / 2 > second.position.y + second.size.height / 2;
  return firstIsLower ? [first, second] : [second, first];
}

const servicePairKey = (provider, consumer) => JSON.stringify([provider.id, consumer.id]);

function lanesDirectlyAbove(lane, provider, teams) {
  const laneBox = box(lane);
  const providerBox = box(provider);
  return teams.filter((upper) => {
    if (upper.type !== "stream-aligned") return false;
    const upperBox = box(upper);
    const gap = laneBox.top - upperBox.bottom;
    if (gap < 0 || gap > MAX_STACKED_LANE_GAP) return false;
    if (!horizontallyAligned(upperBox, laneBox) || !horizontallyAligned(upperBox, providerBox)) {
      return false;
    }
    const strip = {
      left: Math.max(laneBox.left, upperBox.left),
      right: Math.min(laneBox.right, upperBox.right),
      top: upperBox.bottom,
      bottom: laneBox.top,
    };
    return !teams.some(
      (team) =>
        team !== lane &&
        team !== upper &&
        overlaps(box(team), strip) &&
        !(contains(box(team), laneBox) && contains(box(team), upperBox)),
    );
  });
}

// A platform under a stack of stream-aligned lanes serves every lane of the stack through the one
// triangle in the lowest lane, so the lanes above are consumers too.
function stackedLanesAbove(consumer, provider, teams) {
  const reached = new Set([consumer]);
  const pending = [consumer];
  while (pending.length > 0) {
    for (const upper of lanesDirectlyAbove(pending.shift(), provider, teams)) {
      if (reached.has(upper)) continue;
      reached.add(upper);
      pending.push(upper);
    }
  }
  reached.delete(consumer);
  return [...reached].sort(
    (first, second) => box(second).bottom - box(first).bottom || compareIds(first, second),
  );
}

function checkInteractions(interactions, teams, warnings, readings) {
  const resolved = [...interactions]
    .sort(compareIds)
    .map((interaction) => ({ interaction, touched: touchedTeams(interaction, teams) }));
  const servedPairs = new Set(
    resolved
      .filter(({ interaction, touched }) => isServiceGlyph(interaction, touched))
      .map(({ touched }) => servicePairKey(...providerAndConsumer(...touched))),
  );
  for (const { interaction, touched } of resolved) {
    const label = interaction.label ? `  (${interaction.label})` : "";
    if (touched.length === 0) {
      warnings.push({
        path: interaction.id,
        message: `${describe(interaction)} overlaps no team; place it over the boundary between the two teams it relates`,
      });
      continue;
    }
    if (touched.length === 1) {
      warnings.push({
        path: interaction.id,
        message: `${describe(interaction)} overlaps only ${teamName(touched[0])}; stretch it across the gap so it also overlaps the second team`,
      });
      continue;
    }
    if (touched.length > 2) {
      warnings.push({
        path: interaction.id,
        message: `${describe(interaction)} overlaps ${touched.length} teams (${touched.map(teamName).join(", ")}); it must overlap exactly the two teams it relates`,
      });
      continue;
    }
    const [first, second] = touched;
    if (interaction.mode !== "x-as-a-service") {
      readings.push(
        `${interaction.mode.padEnd(15)} ${teamName(first)} ↔ ${teamName(second)}${label}`,
      );
      continue;
    }
    if (!horizontallyAligned(box(first), box(second))) {
      warnings.push({
        path: interaction.id,
        message: `${describe(interaction)} joins ${teamName(first)} and ${teamName(second)} side by side; the triangle always points up at the consumer, so put the provider below the consumer`,
      });
      continue;
    }
    const [provider, consumer] = providerAndConsumer(first, second);
    readings.push(`x-as-a-service  ${teamName(provider)} → ${teamName(consumer)}${label}`);
    if (provider.type === "platform" && consumer.type === "stream-aligned") {
      const note = [interaction.label, `stacked above ${teamName(consumer)}`]
        .filter(Boolean)
        .join("; ");
      for (const lane of stackedLanesAbove(consumer, provider, teams)) {
        const pairKey = servicePairKey(provider, lane);
        if (servedPairs.has(pairKey)) continue;
        servedPairs.add(pairKey);
        readings.push(`x-as-a-service  ${teamName(provider)} → ${teamName(lane)}  (${note})`);
      }
    }
    const providerIsStreamAligned = provider.type === "stream-aligned";
    const consumerUsuallyProvides =
      consumer.type === "platform" || consumer.type === "complicated-subsystem";
    if (providerIsStreamAligned && consumerUsuallyProvides) {
      warnings.push({
        path: interaction.id,
        message: `${describe(interaction)} reads as ${teamName(provider)} providing to the ${consumer.type} team ${teamName(consumer)}; the triangle points up at the consumer, so place the provider below`,
      });
    }
  }
}

function checkCoverage(elements, warnings) {
  const foreground = elements.filter(
    (element) => element.kind === "interaction" || element.kind === "annotation",
  );
  const others = elements.filter((element) => element.kind !== "flow");
  for (const element of foreground) {
    for (const other of others) {
      if (other === element) continue;
      const expectedOverlap = element.kind === "interaction" && other.kind === "team";
      const reportedByTheAnnotation = element.kind === "interaction" && other.kind === "annotation";
      const reportedByTheOther = other.kind === element.kind && compareIds(other, element) < 0;
      if (expectedOverlap || reportedByTheAnnotation || reportedByTheOther) continue;
      if (!overlaps(box(element), box(other))) continue;
      warnings.push({
        path: element.id,
        message: `${describe(element)} covers ${describe(other)}; move it into free space`,
      });
    }
  }
}

function checkAnnotationTargets(annotations, elementsById, warnings, readings) {
  for (const annotation of annotations) {
    const excerpt =
      annotation.text.length > 40 ? `${annotation.text.slice(0, 39)}…` : annotation.text;
    if (!annotation.attachedTo) {
      readings.push(`annotation      "${excerpt}"`);
      continue;
    }
    const target = elementsById.get(annotation.attachedTo);
    if (!target) {
      warnings.push({
        path: annotation.id,
        message: `annotation ${annotation.id} is attached to unknown id "${annotation.attachedTo}"; the modeler drops the connector`,
      });
    } else if (target.kind === "annotation") {
      warnings.push({
        path: annotation.id,
        message: `annotation ${annotation.id} is attached to another annotation; attach it to a team, interaction or flow`,
      });
    } else {
      readings.push(`annotation      "${excerpt}" → ${describe(target)}`);
    }
  }
}

export function checkDocument(input) {
  const findings = { errors: [], warnings: [] };
  const readings = [];
  if (!isPlainObject(input)) {
    findings.errors.push({ path: "(root)", message: "the document must be a JSON object" });
    return { ...findings, readings };
  }
  if (input.version !== DOCUMENT_VERSION) {
    findings.warnings.push({
      path: "version",
      message: `is ${JSON.stringify(input.version)}; write ${DOCUMENT_VERSION} (older versions are migrated on open)`,
    });
  }
  if (typeof input.title !== "string") {
    findings.warnings.push({
      path: "title",
      message: 'missing; the modeler shows "Untitled team topology"',
    });
  }
  for (const key of Object.keys(input)) {
    if (!DOCUMENT_KEYS.includes(key)) {
      findings.warnings.push({ path: key, message: UNKNOWN_FIELD });
    }
  }

  const elements = [];
  for (const { key, kind, allowedKeys, validateFields } of COLLECTIONS) {
    const collection = input[key];
    if (collection === undefined) continue;
    if (!Array.isArray(collection)) {
      findings.errors.push({
        path: key,
        message: "must be an array; the modeler would discard it",
      });
      continue;
    }
    collection.forEach((element, index) => {
      const path = `${key}[${index}]${isPlainObject(element) && typeof element.id === "string" ? ` (${element.id})` : ""}`;
      if (
        kind === "interaction" &&
        isPlainObject(element) &&
        !("position" in element && "size" in element)
      ) {
        findings.errors.push({
          path,
          message: "has no position/size; the modeler drops it on open",
        });
        return;
      }
      if (validateElement(element, path, allowedKeys, validateFields, findings)) {
        elements.push({ ...element, kind });
      }
    });
  }

  const elementsById = new Map();
  const connectorIds = new Map(
    elements
      .filter((element) => element.kind === "annotation")
      .map((annotation) => [associationId(annotation.id), annotation.id]),
  );
  for (const element of elements) {
    if (elementsById.has(element.id)) {
      findings.errors.push({
        path: element.id,
        message:
          "duplicate id; ids must be unique across nodes, interactions, flows and annotations",
      });
    } else {
      elementsById.set(element.id, element);
    }
    if (element.id === DIAGRAM_ROOT_ID) {
      findings.errors.push({ path: element.id, message: "reserved for the diagram itself" });
    } else if (element.id.startsWith(ENGINE_ROOT_ID_PREFIX)) {
      findings.errors.push({
        path: element.id,
        message: `ids starting with "${ENGINE_ROOT_ID_PREFIX}" are reserved`,
      });
    }
    if (connectorIds.has(element.id)) {
      findings.errors.push({
        path: element.id,
        message: `reserved for the connector of annotation ${connectorIds.get(element.id)}`,
      });
    }
  }
  if (findings.errors.length > 0) return { ...findings, readings };

  const teams = elements.filter((element) => element.kind === "team");
  const interactions = elements.filter((element) => element.kind === "interaction");
  const annotations = elements.filter((element) => element.kind === "annotation");
  const { warnings } = findings;

  for (const element of elements) {
    const minSize =
      element.kind === "team"
        ? TEAM_TYPES[element.type].minSize
        : element.kind === "interaction"
          ? INTERACTION_MODES[element.mode].minSize
          : element.kind === "flow"
            ? FLOW.minSize
            : ANNOTATION.minSize;
    checkMinimumSize(element, minSize, warnings);
    checkLabelFits(element, warnings);
  }
  checkTeams(teams, warnings, readings);
  checkStreamAlignedRows(teams, warnings);
  checkInteractions(interactions, teams, warnings, readings);
  checkCoverage(elements, warnings);
  checkAnnotationTargets(annotations, elementsById, warnings, readings);

  return { ...findings, readings };
}

const roundToHundredths = (value) => Math.round(value * 100) / 100;
const canonicalPosition = ({ x, y }) => ({ x: roundToHundredths(x), y: roundToHundredths(y) });
const canonicalSize = ({ width, height }) => ({
  width: roundToHundredths(width),
  height: roundToHundredths(height),
});
const compareIds = (first, second) => (first.id < second.id ? -1 : first.id > second.id ? 1 : 0);

function withOptional(target, source, fields) {
  for (const field of fields) {
    if (source[field]) target[field] = source[field];
  }
  return target;
}

// JSON objects have no key order, so nested keys are sorted too: equal data, equal bytes.
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalValue(value[key])]),
  );
}

// Unknown fields follow the known ones, sorted; built from entries so "__proto__" stays a field.
function withForeign(known, source, knownKeys) {
  const foreign = Object.keys(source)
    .filter((key) => !knownKeys.includes(key) && source[key] !== undefined)
    .sort()
    .map((key) => [key, canonicalValue(source[key])]);
  return foreign.length === 0 ? known : Object.fromEntries([...Object.entries(known), ...foreign]);
}

export function canonicalize(input) {
  const list = (key) => (Array.isArray(input[key]) ? input[key] : []);
  return withForeign(
    {
      version: DOCUMENT_VERSION,
      title: typeof input.title === "string" ? input.title : "Untitled team topology",
      nodes: list("nodes")
        .map((team) =>
          withForeign(
            withOptional(
              {
                id: team.id,
                type: team.type,
                label: team.label,
                position: canonicalPosition(team.position),
                size: canonicalSize(team.size),
              },
              team,
              ["description", "fill", "stroke"],
            ),
            team,
            TEAM_KEYS,
          ),
        )
        .sort(compareIds),
      interactions: list("interactions")
        .map((interaction) =>
          withForeign(
            withOptional(
              {
                id: interaction.id,
                mode: interaction.mode,
                position: canonicalPosition(interaction.position),
                size: canonicalSize(interaction.size),
              },
              interaction,
              ["label", "fill", "stroke"],
            ),
            interaction,
            INTERACTION_KEYS,
          ),
        )
        .sort(compareIds),
      flows: list("flows")
        .map((flow) =>
          withForeign(
            withOptional(
              {
                id: flow.id,
                position: canonicalPosition(flow.position),
                size: canonicalSize(flow.size),
              },
              flow,
              ["label"],
            ),
            flow,
            FLOW_KEYS,
          ),
        )
        .sort(compareIds),
      annotations: list("annotations")
        .map((annotation) =>
          withForeign(
            withOptional(
              {
                id: annotation.id,
                text: annotation.text,
                position: canonicalPosition(annotation.position),
                size: canonicalSize(annotation.size),
              },
              annotation,
              ["attachedTo"],
            ),
            annotation,
            ANNOTATION_KEYS,
          ),
        )
        .sort(compareIds),
    },
    input,
    DOCUMENT_KEYS,
  );
}

// The file form the modeler saves: an empty annotations list left out, a line break at the end.
export function formatDocument(document) {
  const canonical = canonicalize(document);
  const output =
    canonical.annotations.length > 0
      ? canonical
      : Object.fromEntries(Object.entries(canonical).filter(([key]) => key !== "annotations"));
  return `${JSON.stringify(output, null, 2)}\n`;
}

function checkFile(path, { write }) {
  const lines = [];
  let text;
  let input;
  try {
    text = readFileSync(path, "utf8");
    input = JSON.parse(text);
  } catch (error) {
    lines.push(`${path}`, `  error    ${error instanceof Error ? error.message : String(error)}`);
    return { lines, errorCount: 1, warningCount: 0 };
  }

  const result = checkDocument(input);
  const counts = COLLECTIONS.map(({ key, kind }) => {
    const count = Array.isArray(input[key]) ? input[key].length : 0;
    return `${count} ${kind}${count === 1 ? "" : "s"}`;
  });
  lines.push(
    `${path} — "${typeof input.title === "string" ? input.title : "Untitled team topology"}"`,
  );
  lines.push(`  ${counts.join(", ")}`);
  if (result.readings.length > 0) {
    lines.push("", ...result.readings.map((reading) => `  ${reading}`));
  }
  if (result.errors.length + result.warnings.length > 0) lines.push("");
  for (const error of result.errors) lines.push(`  error    ${error.path}: ${error.message}`);
  for (const warning of result.warnings)
    lines.push(`  warning  ${warning.path}: ${warning.message}`);

  if (result.errors.length === 0) {
    const canonicalText = formatDocument(input);
    const isCanonical = text === canonicalText;
    if (!isCanonical && write) {
      writeFileSync(path, canonicalText);
      lines.push("", "  rewritten in canonical form");
    } else if (!isCanonical) {
      lines.push(
        "",
        "  note     not in canonical form (key order, id sorting, rounding, final line break); --write normalises it",
      );
    }
  }
  if (result.errors.length + result.warnings.length === 0)
    lines.push("", "  OK: no errors, no warnings");
  return { lines, errorCount: result.errors.length, warningCount: result.warnings.length };
}

function main(argumentList) {
  const write = argumentList.includes("--write");
  const strict = argumentList.includes("--strict");
  const paths = argumentList.filter((argument) => !argument.startsWith("--"));
  if (paths.length === 0) {
    console.error("usage: node check.mjs <file.tt|file.ttm.json>... [--write] [--strict]");
    return 2;
  }
  let failed = false;
  for (const path of paths) {
    const { lines, errorCount, warningCount } = checkFile(path, { write });
    console.log(`${lines.join("\n")}\n`);
    if (errorCount > 0 || (strict && warningCount > 0)) failed = true;
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
