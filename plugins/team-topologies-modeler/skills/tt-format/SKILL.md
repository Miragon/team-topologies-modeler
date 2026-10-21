---
name: tt-format
description: >-
  The `.tt` / `.ttm.json` file format of the Team Topologies Modeler — the JSON document behind
  `@miragon/team-topologies-schema-model` (version 3: `nodes`, `interactions`, `flows`,
  `annotations`): every field, top-left pixel coordinates, default and minimum sizes, how an
  interaction is drawn as a shape overlapping two teams instead of a line, the X-as-a-Service
  triangle that always points up at the consumer, stacking order, the canonical form the modeler
  saves, a layout grid with stream-aligned teams stacked as parallel lanes and the platform below
  them, and a bundled checker script that validates a file, reads back which teams every interaction
  connects and flags layout mistakes. Use whenever
  reading, writing, drawing, generating, editing, laying out, validating or debugging a `.tt` /
  `.ttm.json` file or a Team Topologies diagram as JSON. For the Team Topologies method itself —
  choosing team types and interaction modes, reviewing a topology — use the `team-topologies` skill.
---

# The `.tt` / `.ttm.json` format

A Team Topologies diagram is one small JSON document. The
[Team Topologies Modeler](https://github.com/Miragon/team-topologies-modeler) opens and saves it in
the web app, the VS Code extension (`miragon-gmbh.team-topologies-modeler`) and designIQ; the
reference implementation is
[`@miragon/team-topologies-schema-model`](https://www.npmjs.com/package/@miragon/team-topologies-schema-model)
(`parseDocument`, `serializeDocument`). `.tt` and `.ttm.json` are the same format.

Two properties shape how you write it:

- **The notation is spatial.** An interaction is a placed glyph that _overlaps_ the two teams it
  relates. There is no `source`/`target` — get the geometry wrong and the relationship is wrong.
- **Validation is all-or-nothing.** One invalid field (a colour name, a zero width, an unknown team
  type) and the modeler refuses to open the whole file. Run the checker before handing a file back.

Scope: this skill is the **format and the drawing**. Which team types and interaction modes an
organisation needs, and how to critique a topology, is the `team-topologies` skill's job.

## The document

```json
{
  "version": 3,
  "title": "Online shop team topology",
  "nodes": [],
  "interactions": [],
  "flows": [],
  "annotations": []
}
```

`version` is always `3`. `annotations` may be left out when empty (the modeler does). Every element
has an `id`, a `position` `{ "x", "y" }` and a `size` `{ "width", "height" }`.

### `nodes` — teams

| Field         | Required | Value                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------- |
| `id`          | yes      | non-empty string, unique across **all four** arrays                         |
| `type`        | yes      | `stream-aligned` \| `enabling` \| `complicated-subsystem` \| `platform`     |
| `label`       | yes      | the team's name, drawn centred in the shape (may be `""`)                   |
| `description` | no       | purpose in a sentence; shown only in the inspector, **never on the canvas** |
| `fill`        | no       | hex override (`#rgb` / `#rrggbb`) — leave out to keep the official colour   |
| `stroke`      | no       | hex override, same rule                                                     |

| `type`                  | Shape                        | Default w × h | Minimum w × h |
| ----------------------- | ---------------------------- | ------------- | ------------- |
| `stream-aligned`        | horizontal rounded rectangle | 240 × 96      | 140 × 64      |
| `enabling`              | vertical rounded rectangle   | 120 × 200     | 80 × 120      |
| `complicated-subsystem` | octagon                      | 170 × 150     | 110 × 100     |
| `platform`              | square-cornered rectangle    | 380 × 130     | 200 × 90      |

### `interactions` — interaction modes

| Field    | Required | Value                                                                    |
| -------- | -------- | ------------------------------------------------------------------------ |
| `id`     | yes      | unique                                                                   |
| `mode`   | yes      | `collaboration` \| `x-as-a-service` \| `facilitating`                    |
| `label`  | no       | a few words on _what_ is shared (`fraud rules`, `CI/CD`); small, centred |
| `fill`   | no       | hex override                                                             |
| `stroke` | no       | hex override                                                             |

| `mode`           | Glyph         | Default w × h | Minimum w × h | Direction                                           |
| ---------------- | ------------- | ------------- | ------------- | --------------------------------------------------- |
| `collaboration`  | parallelogram | 112 × 72      | 60 × 44       | none                                                |
| `x-as-a-service` | triangle      | 88 × 78       | 54 × 48       | **tip always up** — base = provider, tip = consumer |
| `facilitating`   | circle        | 84 × 84       | 48 × 48       | none                                                |

### `flows` — flow of change

`id`, optional `label` (default text `Flow of change`), `position`, `size`. A dashed arrow that
**always points right**; default 520 × 64, minimum 160 × 36. No colour fields. It anchors the
left-to-right reading of the diagram; use one per stack of lanes (several business areas:
`reference/layout.md`).

### `annotations` — text notes

`id`, `text`, `position`, `size`, optional `attachedTo` (the id of a team, interaction or flow — not
another annotation). Drawn as a left bracket with top-left-aligned, wrapped text; `attachedTo` adds a
dashed connector to that element. Default 200 × 64, minimum 60 × 30. No colour fields.

## Coordinates

- `position` is the **top-left corner** of the element's bounding box, in pixels; `y` grows
  downwards. Centre = `x + width / 2`, `y + height / 2`.
- The canvas is unbounded (negative values are fine), there is no grid, values are rounded to 2
  decimals on save.
- Nothing nests or attaches: every element sits flat on the canvas. Moving a team in the editor does
  **not** move its interactions — when you move a team in the file, move its glyphs with it.

## Interactions are overlap

An interaction relates exactly the two teams its bounding box overlaps. Place it **on the gap
between them**, overlapping each by roughly 10–20 px:

- **Side by side** (A left of B, overlapping vertically) — collaboration and facilitating:
  `x = (A.right + B.left) / 2 − w / 2`, `y = centre of the vertical overlap of A and B − h / 2`.
- **Stacked** (A above B) — every mode, and the **only** option for X-as-a-Service:
  `y = (A.bottom + B.top) / 2 − h / 2`,
  `x = centre of the horizontal overlap of A and B − w / 2`.
- With the default glyph sizes, a **60 px horizontal gap** gives the glyphs a 12–26 px bite into
  both teams, the **54 px gap** above a platform gives the triangle 12 px, and the **30 px gap**
  between stacked lanes gives 21–27 px.

**X-as-a-Service has a fixed direction.** The triangle cannot be rotated; its tip points up at the
consumer and its base sits on the provider. So the provider must be **below** the consumer — which
is why the platform goes underneath the stack of stream-aligned lanes. One triangle into the lowest
lane is enough: by convention a platform directly under a stack of stream-aligned lanes serves
**every** lane of that stack, and the checker reads it that way. A gap over 60 px, a lane that does
not overlap the platform horizontally at all, or another team between two lanes breaks the stack
(`reference/layout.md`). A triangle between two side-by-side teams has no readable direction.

## Stacking order

Back to front: flows → stream-aligned and platform → complicated-subsystem → enabling →
interactions → annotations. Within one tier, elements stack in **file order**, and a save sorts
every array by `id`. That matters only for groupings:

- A team drawn **inside** a larger team (e.g. a platform grouping that contains platform teams)
  stays visible only if it is painted later: a higher tier, or the same tier and an `id` that sorts
  **after** the container's. Give containers ids that sort first, e.g. `grp_platform` before
  `team_*`.
- Labels are always centred, so inner teams must leave the container's middle free — put them in
  its lower part, or the container's name is hidden.
- Partly overlapping teams are always a mistake: separate them and put an interaction on the gap.

## Labels and text

Team, interaction and flow labels are centred and word-wrapped; annotation text flows from the top
left. Capacity per line is about `textWidth / (0.58 × fontSize)` characters — font size 13.5 for
teams, 11 for interactions and flows, 12 for annotations — with a line height of 1.2 × font size.
`textWidth` is `width − 20` for teams and interactions, `width − 20 − min(0.16 × width, 1.1 ×
height)` for flows (the arrowhead holds no text) and `width − 16` for annotations.

- A 240-wide stream-aligned team fits ~28 characters per line, a 120-wide enabling team ~12, a
  default collaboration glyph ~14, a facilitating circle ~10.
- An **X-as-a-Service triangle** narrows towards its tip: at the default size ~7 characters fit on
  one line, so use one short word (`CI/CD`, `scoring`). The checker measures the triangle, not its
  box.
- An **annotation**'s text box is `(width − 16) × (height − 12)`: `(width − 16) / 6.96` characters
  per line, 14.4 px per line, so `height = 14.4 × lines + 12`. Word wrap breaks early — plan one
  line more than `characters / capacity`. A 200 × 64 note holds ~3 lines of ~26 characters.

A real line break is written `\n` inside the JSON string. Keep interaction labels to one or two
words; put explanations into annotations.

## Ids

Any non-empty string, unique across nodes, interactions, flows and annotations together — a
duplicate breaks the import. A few ids belong to parts of the diagram the file never lists, so no
element may use them: `tt-root` (the diagram itself), ids starting with `__implicitroot`, and
`assoc_<annotation id>` (the connector of that annotation). Nor may an id name a built-in property
of JavaScript objects (`constructor`, `toString`, `__proto__`, …). Because a save sorts by `id`
and diffs anchor on it, use stable, descriptive ids rather than random ones:

- teams `team_<name>` (`team_checkout`), groupings `grp_<name>`
- interactions `int_<a>_<b>` (`int_platform_checkout`)
- flows `flow_<name>`, annotations `ann_<topic>` (review notes: `ann_review_<n>`)

## Drawing a diagram

1. **Decide the content first** — teams, types, the interaction for each pair and why (the
   `team-topologies` skill). Write it down as a short list before touching coordinates.
2. **Lay out with the grid** in `reference/layout.md`: flow of change on top, stream-aligned teams
   stacked as parallel lanes below it, enabling teams at the left side spanning exactly the lanes
   they facilitate, complicated-subsystem teams to the right of the lane they collaborate with —
   or, once they provide X-as-a-Service, under an extension of that lane — and the platform below
   the stack. Several business areas sharing one platform stay in one stack. Never put
   stream-aligned teams side by side or staggered — along the flow that reads as a hand-off from
   one to the next.
3. **Place each interaction** on its gap with the formulas above; providers of X-as-a-Service go
   below their consumers, and the platform needs only one triangle, into the lowest lane.
4. **Add annotations** in free space — beside or below the diagram, ≥ 24 px from any shape — and
   attach each one to the element it explains. Several temporary interactions with one purpose and
   one end (an enabling team on one time box) share one note, attached to the team they share; a
   note about the whole diagram stays unattached.
5. **Run the checker** and fix every error and warning; its reading of the interactions must match
   the list from step 1. Then `--write` to save the canonical form.
6. **Show it**: the VS Code extension opens `.tt` / `.ttm.json` as a diagram; the web app
   (<https://team-topologies.modeler.miragon.io>, Menu → Open…, or drop the file onto the page)
   opens `.tt`, `.ttm.json` and `.json` files; with designIQ use `create_model` /
   `save_model_content`, then `open_team_topology_modeler`.

## Editing an existing file

Change only what was asked. Keep ids, positions and sizes the user set by hand; append new elements
instead of re-laying out the whole diagram. Renaming a team changes only its `label` — nothing
references labels. Deleting a team means also deleting (or re-placing) the interactions that
overlapped it and the annotations `attachedTo` it. Moving a team means moving its interactions too.

## The checker

`scripts/check.mjs` needs only Node (≥ 18), no install:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/check.mjs diagram.tt            # check, exit 1 on errors
node ${CLAUDE_SKILL_DIR}/scripts/check.mjs diagram.tt --write    # …and save the canonical form
node ${CLAUDE_SKILL_DIR}/scripts/check.mjs a.tt b.ttm.json --strict   # warnings fail too
```

(Inside the modeler repository the script is at
`plugins/team-topologies-modeler/skills/tt-format/scripts/check.mjs`.)

It reports:

- **errors** — anything that stops the modeler opening the file: invalid JSON, wrong field types,
  unknown `type`/`mode`, non-hex colours, non-positive sizes, duplicate or reserved ids, a
  non-array collection, an interaction without `position`/`size`;
- **warnings** — what opens but reads wrong: stream-aligned teams one after the other along the
  flow (side by side or staggered — sharing less than half their width and at most 60 px apart
  vertically; a hand-off; once per neighbouring pair, on the right-hand team; not inside a platform
  grouping); an interaction overlapping zero, one or more than two teams; an X-as-a-Service
  triangle between side-by-side teams or pointing from a stream-aligned team up at a platform;
  partly overlapping teams; a grouping that hides or covers its inner teams; annotations or
  interactions covering other shapes; text that overflows its shape, including a label running
  over the triangle's slanted edges; sizes below the minimum; unknown fields (the modeler ignores
  them and keeps them on save);
  `attachedTo` pointing nowhere; a missing title or a version other than 3;
- **readings** — one line per interaction (`x-as-a-service  "Cloud Platform" → "Checkout"`,
  `collaboration  "A" ↔ "B"`), grouping and annotation, plus one line per lane a platform serves
  through the stack, bottom-up
  (`x-as-a-service  "Cloud Platform" → "Product Discovery"  (stacked above "Order Fulfilment")`).
  This is how you "see" the diagram: compare it with what you meant to draw.

A clean run ends with `OK: no errors, no warnings`.

## Canonical form

What the modeler writes on save, and what `--write` produces: keys in schema order
(`version, title, nodes, interactions, flows, annotations`; per element `id`, `type`/`mode`,
`label`/`text`, `position`, `size`, then optional fields, then fields the modeler does not know,
sorted by name), every array sorted by `id`, numbers rounded to 2 decimals, empty optional strings
and an empty `annotations` array left out, two-space indentation and a line break at the end of the
file. Writing canonical files keeps diffs minimal when the user later saves from the editor.

## Before handing a file back

- `version` is `3`; every element has a unique `id`, a `position` and a positive `size`.
- `type` and `mode` values are spelled exactly as in the tables; colours (if any) are hex.
- Stream-aligned teams are stacked as parallel lanes, never side by side or staggered.
- Every interaction overlaps exactly the two teams it relates; every X-as-a-Service provider sits
  below its consumer; the platform sits under the stack with one triangle into the lowest lane, and
  the readings list every lane it should serve — a platform shared by several areas keeps them in
  one stack.
- Every enabling team spans exactly the lanes it facilitates, with one glyph per lane.
- No two teams partly overlap; groupings sort before their inner teams and keep their middle free.
- Labels fit their shapes; explanations live in annotations, not in labels.
- The checker reports no errors and no warnings, its readings match the intended topology, and the
  file is in canonical form.

## Reference files (read on demand)

- `reference/layout.md` — the stacked-lane grid with exact numbers, lane order, annotation slots,
  what serves and what breaks the platform stack, a subsystem as a service (and on the platform),
  several business areas with a shared or separate platforms, groupings, a complete worked diagram
  with its checker output, and wrong/right pairs.
