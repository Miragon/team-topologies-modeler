# Laying out a Team Topologies diagram

Generated diagrams go wrong in three ways: interactions that do not overlap the two teams they
relate, X-as-a-Service triangles pointing the wrong way, and labels that do not fit. A fixed grid
avoids all three. Every number below is in canvas pixels; `position` is the top-left corner.

## The grid

```
y =  40   flow of change            one arrow across the whole group, height 56
y = 180   stream-aligned row        240 × 96 each, 60 px apart (x pitch 300)
          enabling teams            at the side of the row, vertically centred on it
          complicated subsystems    next to the team they serve, vertically centred on the row
y = 330   platform                  row bottom + 54, spanning the teams it serves, height 110
```

- **Row centre** of the stream-aligned row: `180 + 96 / 2 = 228`. Centre other teams on it:
  enabling `y = 228 − 200 / 2 = 128`, complicated-subsystem `y = 228 − 150 / 2 = 153`.
- **Horizontal gap 60 px** between neighbours, whether or not they interact — the default glyphs
  (84–112 px wide) then bite 12–26 px into both teams.
- **Vertical gap 54 px** between the row and the platform — the 78 px triangle bites 12 px into
  both.
- **Platform width** = `last served team's right edge − first served team's left edge`; a platform
  that serves only part of the row spans only that part.
- **Flow of change**: `x` = leftmost shape, `width` = rightmost right edge − leftmost left edge,
  `y = 40`, height 56. It sits ≥ 30 px above the tallest shape of the row.
- **Annotations** go into free margin — right of the diagram, or below the platform — at least
  24 px from every shape, attached to what they explain. A 200 × 64 note holds ~3 lines of ~26
  characters; make it taller for more.

## Placing interactions

| Pair                                     | Glyph            | Position                                                                   |
| ---------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| platform below → stream-aligned above    | `x-as-a-service` | `x = team.x + 120 − 44`, `y = rowBottom + 27 − 39` (one triangle per team) |
| enabling ↔ neighbouring team             | `facilitating`   | `x = (left.right + right.left) / 2 − 42`, `y = rowCentre − 42`             |
| stream-aligned ↔ complicated-subsystem   | `collaboration`  | `x = (left.right + right.left) / 2 − 56`, `y = rowCentre − 36`             |
| complicated-subsystem below → team above | `x-as-a-service` | stack the subsystem under its consumer, triangle centred on the consumer   |

For any other pair, use the general rule from the skill: centre the glyph on the gap, on the axis
where both teams overlap. If two teams that must interact are not neighbours on the grid, move one
of them rather than stretching a glyph across a third team — the checker flags a glyph that touches
more than two teams.

A complicated-subsystem team that provides **as a service** must sit below its consumer, like a
platform. Two options: put it under the end of the row where the platform does not reach, or give
it its own column to the right with a collaboration (undirected) while the interface is still being
discovered — then move it below once the relationship becomes X-as-a-Service.

## Several streams on one canvas

Repeat the whole grid per group of teams (per value stream, product line or business area), one
below the other, each with its own flow-of-change arrow. Start each group 120 px below the previous
group's lowest edge so the flows do not read as one. A platform shared by several groups goes below
the last group and needs a triangle into each consuming team — usually that is too far; give each
group its own platform team or a platform grouping instead.

## Groupings

A **platform grouping** is a large `platform` shape containing the platform teams that make up the
platform. Rules (the checker enforces them):

- The grouping's id must sort **before** the inner teams' ids, or it is painted over them —
  `grp_platform` versus `team_runtime`, `team_maps`.
- Its label is centred: keep the middle free and put the inner teams in the lower part, starting
  ≥ 20 px below the grouping's vertical centre.
- Interactions from consuming teams touch the grouping's edge, not the inner teams — the checker
  ignores a grouping when it surrounds another team the glyph also touches.

Grid for a grouping under the row: grouping `y = 330`, height 260 (centre 460); inner teams
`y = 480`, height 90, inset 40 px from the grouping's left and right edges, 40 px apart.

## The worked example

`../examples/ride-hailing.tt` is a complete, checker-clean diagram built with exactly this grid:

| Element                   | Kind / mode                        | x    | y   | w × h     |
| ------------------------- | ---------------------------------- | ---- | --- | --------- |
| `flow_main`               | flow                               | 40   | 40  | 1250 × 56 |
| `team_security`           | enabling                           | 40   | 128 | 120 × 200 |
| `team_onboarding`         | stream-aligned                     | 220  | 180 | 240 × 96  |
| `team_payments`           | stream-aligned                     | 520  | 180 | 240 × 96  |
| `team_booking`            | stream-aligned                     | 820  | 180 | 240 × 96  |
| `team_pricing`            | complicated-subsystem              | 1120 | 153 | 170 × 150 |
| `team_platform`           | platform                           | 220  | 330 | 840 × 110 |
| `int_security_onboarding` | facilitating                       | 148  | 186 | 84 × 84   |
| `int_booking_pricing`     | collaboration                      | 1034 | 192 | 112 × 72  |
| `int_platform_onboarding` | x-as-a-service                     | 296  | 264 | 88 × 78   |
| `int_platform_payments`   | x-as-a-service                     | 596  | 264 | 88 × 78   |
| `int_platform_booking`    | x-as-a-service                     | 896  | 264 | 88 × 78   |
| `ann_pricing_handover`    | annotation → `int_booking_pricing` | 1100 | 336 | 200 × 64  |

Checker output:

```
  collaboration   "Booking & Dispatch" ↔ "Pricing Engine"  (surge pricing)
  x-as-a-service  "Mobility Platform" → "Booking & Dispatch"
  x-as-a-service  "Mobility Platform" → "Driver Onboarding"
  x-as-a-service  "Mobility Platform" → "Payments"
  facilitating    "Driver Onboarding" ↔ "Security Enablement"
  annotation      "Collaboration until surge pricing ships…" → collaboration int_booking_pricing

  OK: no errors, no warnings
```

`../examples/ride-hailing-platform-grouping.tt` is the same diagram with the platform drawn as a
grouping (`grp_platform`, 840 × 260) of two platform teams, `team_runtime` and `team_maps`
(each 360 × 90 at `y = 480`).

## Wrong / right

**Wrong** — the platform sits above the stream-aligned team, so the triangle points from the
stream-aligned team up at the platform: it reads "Checkout provides a service to the platform".

```json
{ "id": "team_platform", "type": "platform", "label": "Cloud Platform", "position": { "x": 220, "y": 40 }, "size": { "width": 380, "height": 110 } },
{ "id": "team_checkout", "type": "stream-aligned", "label": "Checkout", "position": { "x": 220, "y": 204 }, "size": { "width": 240, "height": 96 } },
{ "id": "int_platform_checkout", "mode": "x-as-a-service", "position": { "x": 296, "y": 138 }, "size": { "width": 88, "height": 78 } }
```

**Right** — swap the rows; the triangle now points from the platform (below) up at its consumer.

```json
{ "id": "team_checkout", "type": "stream-aligned", "label": "Checkout", "position": { "x": 220, "y": 40 }, "size": { "width": 240, "height": 96 } },
{ "id": "team_platform", "type": "platform", "label": "Cloud Platform", "position": { "x": 220, "y": 190 }, "size": { "width": 380, "height": 110 } },
{ "id": "int_platform_checkout", "mode": "x-as-a-service", "position": { "x": 296, "y": 124 }, "size": { "width": 88, "height": 78 } }
```

**Wrong** — a collaboration glyph centred on a team instead of on the gap overlaps only that team,
so it relates nothing. **Right** — centre it on the gap between the two teams' facing edges.
