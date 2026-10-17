# Laying out a Team Topologies diagram

Generated diagrams go wrong in four ways: stream-aligned teams one after the other along the flow of
change (side by side or staggered — that reads as a hand-off chain), interactions that do not
overlap the two teams they relate, X-as-a-Service triangles pointing the wrong way, and labels that
do not fit. A fixed grid avoids all four. Every number below is in canvas pixels; `position` is the
top-left corner.

## The grid

Stream-aligned teams are drawn as in the Team Topologies book: **stacked, one below the other, as
parallel lanes along the flow of change**. Every lane runs the whole length of the flow, because
each team owns its stream end to end.

```
y =  40   flow of change            one arrow across the whole diagram, height 56
y = 150   stream-aligned lane 1     x = 220, 600 × 96
y = 276   stream-aligned lane 2     vertical pitch 126 (gap 30)
y = 402   stream-aligned lane 3
          enabling teams            x = 40, width 120, left of the lanes they facilitate
          complicated subsystems    x = 880, 170 × 150, right of the lane they collaborate with
y = 552   platform                  lowest lane bottom + 54, x = 220, 600 × 110
```

The `y` values assume the flow at `y = 40`. For a flow at any `flowY` (e.g. a second group, see
[Several groups](#several-groups-on-one-canvas)), lane `n` sits at `flowY + 110 + (n − 1) × 126`;
everything else is placed relative to the lanes, as below.

- **Lanes** share one `x` and one `width` (220 and 600) — widen them together, never one alone
  (the one exception: a lane that consumes a
  [complicated subsystem as a service](#a-complicated-subsystem-as-a-service)). Lane `n` sits at
  `y = 150 + (n − 1) × 126`; its centre is `y + 48`.
- **Lane order carries no meaning.** Lanes are parallel, so streams that are consecutive stages of
  one customer journey (search → checkout → delivery) are still parallel lanes, not a chain. Order
  them for the drawing: lanes that share an enabling team or a collaboration next to each other, a
  lane that consumes a subsystem as a service lowest (see below).
- **Vertical gap 30 px** between lanes. Up to 60 px still reads as one stack; separate groups of
  lanes (business areas or value streams with a platform of their own) start ≥ 120 px apart.
- **Enabling teams** at the left side, `x = 40`, width 120, spanning **exactly** the lanes they
  facilitate, with one facilitating glyph per lane. Position reads as a relationship, so an enabling
  team never sits beside a lane it does not support — make its lanes neighbours. Spanning `n`
  lanes: `y` = the first lane's top, height `n × 96 + (n − 1) × 30` (222 for two). One lane (96)
  is lower than the enabling minimum (120), so centre a 120 × 120 team on it:
  `y = lane centre − 60` (138 for lane 1). A second enabling team whose lanes overlap the first
  one's goes on the right side, `x = 880`, if no subsystem sits there; otherwise reorder the lanes.
- **Complicated-subsystem teams** that **collaborate** with a lane sit to its right:
  `x = lane right + 60 = 880`, `y = lane centre − 75`. Two subsystems on neighbouring lanes collide
  at the default height (150 is more than the 126 px pitch) — make them 170 × 100 at
  `y = lane centre − 50`. A subsystem collaborating with two neighbouring lanes spans both: 170 × 222
  at `y` = the upper lane's top, one glyph per lane. Once it provides **X-as-a-Service**, it moves
  [under an extension of the lane](#a-complicated-subsystem-as-a-service).
- **Platform** below the stack: `x = 220`, `y = lowest lane bottom + 54`, the lanes' width and a
  height of 110. The 54 px gap lets the 78 px triangle bite 12 px into both.
- **Horizontal gap 60 px** between the lanes and the teams beside them — the default glyphs (84–112
  px wide) then bite 12–26 px into both teams.
- **Flow of change**: from the leftmost to the rightmost **team** edge — `x` = leftmost left edge,
  `width` = rightmost right edge − leftmost left edge — `y = 40`, height 56. Annotations do not
  count and may stick out past it. With several flows, measure across the whole canvas so they all
  share one `x` and `width`. The flow clears every shape below, including a subsystem beside the
  first lane (top `y = 123`).
- **Annotations** go into free margin, at least 24 px from every shape, attached to what they
  explain. Free slots:
  - right of the diagram, `x = rightmost team edge + 24`;
  - below the platform;
  - below the enabling team, `x = 40`, width ≤ 156 (it ends 24 px before the lanes),
    `y = enabling bottom + 24`. A note there about the facilitating engagement attaches to the
    enabling team itself — a connector to the glyph would cut across the team.

  A note about the whole diagram (headcount, a general assumption) stays unattached, right of the
  first lane. Size a note with the formula in the skill (`Labels and text`); a 200 × 64 note holds
  ~3 lines of ~26 characters.

## Placing interactions

| Pair                                      | Glyph            | Position                                                                                            |
| ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| platform below → lowest lane              | `x-as-a-service` | `x` = centre of the lane's and platform's horizontal overlap − 44 (476), `y = laneBottom + 27 − 39` |
| enabling ↔ a lane it facilitates          | `facilitating`   | `x = (160 + 220) / 2 − 42 = 148`, `y = laneCentre − 42` (one per lane)                              |
| enabling ↔ platform                       | `facilitating`   | enabling 120 × 120 at `(40, platformCentre − 60)`, glyph at `(148, platformCentre − 42)`            |
| lane ↔ complicated subsystem on its right | `collaboration`  | `x = (820 + 880) / 2 − 56 = 794`, `y = laneCentre − 36`                                             |
| lane ↔ enabling team on its right         | `facilitating`   | `x = (820 + 880) / 2 − 42 = 808`, `y = laneCentre − 42`                                             |
| lane ↔ neighbouring lane                  | any mode         | on the 30 px gap: `x = laneCentreX − w / 2`, `y = upper.bottom + 15 − h / 2`                        |
| complicated subsystem below → lane        | `x-as-a-service` | under the lane's extension, see [below](#a-complicated-subsystem-as-a-service)                      |

Between two lanes, an X-as-a-Service triangle reads the lower lane as the provider. For any other
pair, use the general rule from the skill: centre the glyph on the gap, on the axis where both teams
overlap. If two teams that must interact are not neighbours on the grid, reorder the lanes rather
than stretching a glyph across a third team — the checker flags a glyph that touches more than two
teams.

## The platform under the stack

The platform serves the lanes through **one** X-as-a-Service triangle into the lowest lane. By
convention a platform directly under a stack of stream-aligned lanes serves **every** lane of that
stack, and the checker reads it that way: one line per lane, bottom-up, the lanes above marked
`(stacked above "<lowest lane>")`.

From the lane the triangle touches, the checker walks up. A lane above belongs to the stack when it
is a stream-aligned team that

- lies entirely above the current lane, at most 60 px away;
- overlaps both the current lane and the platform horizontally (any overlap counts);
- has no other team in the strip between the two lanes — an interaction glyph there is fine, and so
  is a team that encloses both lanes (a grouping drawn around the stack).

Every lane that qualifies is taken, so two lanes side by side above one lane are both read — but
they also draw the hand-off warning. The walk stops where no lane qualifies, so **the stack breaks**
at a gap over 60 px, at a lane that does not overlap the platform horizontally at all, and at any
team squeezed between two lanes (an enabling team, a subsystem, a second platform). Lanes above the
break are not served. Lanes that do not use the platform therefore go at the top, with the served
lanes starting 90 px below them (over the 60 px of one stack, under the 120 px between groups), and
an annotation attached to the first of them says why (`Not on the platform: legacy mainframe`). The
convention applies only to a platform providing to a stream-aligned team; a pair that has its own
triangle is not listed twice.

A grouping drawn around the stack has a centred label, so with an odd number of lanes the middle
lane covers it (the checker warns). Draw one only around an even number of lanes, or name the stack
in the flow label or an annotation instead.

## A complicated subsystem as a service

A complicated-subsystem team that provides **as a service** must sit below its consumer, like a
platform — but it serves only the lane its triangle touches, never the stack. Extend that lane to
the right beyond the others and put the subsystem under the extension, clear of the lanes below:

- consumer lane: `width = 830` (right edge 1050 instead of 820);
- subsystem: `x = 880`, `y = lane bottom + 54`, 170 × 150;
- triangle: `x = 880 + 85 − 44 = 921`, `y = lane bottom + 27 − 39`.

If you can choose, make the consumer the **lowest** lane: the subsystem then sits beside the
platform (`y = 552` on the grid), among the providers, rather than beside lanes it does not serve.
The platform's triangle stays at `x = 476`, centred on the overlap with the platform. The longer lane
is a drawing device, not a statement about team size; when the subsystem does end up beside other
lanes, label the triangle with one short word so the consumer is clear.

For the middle lane of the worked example (`team_booking`, bottom 372) that is the subsystem at
`(880, 426)` and the triangle at `(921, 360)`. Delete the collaboration glyph, and move or drop the
annotation that explained it — it sits where the subsystem now goes: re-attach it to the new
triangle at `(1074, 426)`, 24 px right of the subsystem, or delete it once the collaboration has
ended. The subsystem sits beside the lower lane, not between two lanes, so the platform still serves
all three:

```
  x-as-a-service  "Mobility Platform" → "Payments"
  x-as-a-service  "Mobility Platform" → "Booking & Dispatch"  (stacked above "Payments")
  x-as-a-service  "Mobility Platform" → "Driver Onboarding"  (stacked above "Payments")
  x-as-a-service  "Pricing Engine" → "Booking & Dispatch"
```

While the interface is still being discovered, keep the subsystem to the right of the lane with a
collaboration (undirected), and move it under the extension once the relationship becomes
X-as-a-Service.

### When the subsystem runs on the platform too

The stack convention covers stream-aligned lanes only, so a subsystem that consumes the platform
needs a triangle of its own, and for that it must sit above the platform. That takes room: the
consumer lane needs at least two lanes below it (e.g. the top lane of three).

- subsystem: `x = 880`, `y = consumer bottom + 54`, stretched down to the lowest lane's bottom —
  height `lowest lane bottom − consumer bottom − 54` (198 for the top lane of three);
- platform: widened to the extended lane's width, 830;
- second triangle: `x = 921`, `y = platform top − 27 − 39` (486 on the grid).

With the worked example's top lane as the consumer (`team_onboarding` 830 wide, subsystem at
`(880, 300)`, 170 × 198):

```
  x-as-a-service  "Mobility Platform" → "Payments"
  x-as-a-service  "Mobility Platform" → "Booking & Dispatch"  (stacked above "Payments")
  x-as-a-service  "Mobility Platform" → "Driver Onboarding"  (stacked above "Payments")
  x-as-a-service  "Mobility Platform" → "Pricing Engine"
  x-as-a-service  "Pricing Engine" → "Driver Onboarding"
```

With fewer than two lanes below the consumer there is no room: draw only the subsystem's own
triangle and attach an annotation to the subsystem (`Also runs on the Mobility Platform`).

## Several groups on one canvas

Lanes of different business areas, product lines or value streams are still lanes. How to draw them
depends on the platform, and the drawing must not decide that question:

- **One platform serves several areas** (the common case): keep all their lanes in **one stack**
  under one flow of change, the platform under the last lane. Separate the areas by a 60 px gap
  instead of 30 — still one stack for the checker, so the readings list every lane of every area —
  and name each area with a tall annotation right of its lanes: `x = rightmost team edge + 24`,
  `y` = the area's first lane top, height = the span of its lanes, text `Business area: Lending`,
  unattached.
- **Each area has a platform of its own** (only when the organisation really has one): repeat the
  whole stack per area, the groups **one below the other**, each with its own flow of change
  labelled with the area (`Lending — flow of change`) and its own platform. Start each group 120 px
  below the previous group's lowest team edge (its platform): next flow at
  `y = previous bottom + 120`, its first lane at `flow y + 110`, and keep the previous group's
  annotations ≥ 24 px clear of that flow. The gap is too large for the stack walk (≤ 60 px), so a
  platform under one group serves only that group.

Never put groups side by side — their lanes would read as one chain of hand-offs.

## Platform groupings under the stack

A **platform grouping** is a large `platform` shape containing the platform teams that make up the
platform. Rules (the checker enforces them):

- The grouping's id must sort **before** the inner teams' ids, or it is painted over them —
  `grp_platform` versus `team_runtime`, `team_maps`.
- Its label is centred: keep the middle free and put the inner teams in the lower part, starting
  ≥ 20 px below the grouping's vertical centre.
- Interactions from consuming teams touch the grouping's edge, not the inner teams — the checker
  ignores a grouping when it surrounds another team the glyph also touches. The grouping serves the
  stack like a single platform.
- Inner teams of any type may sit side by side: they build the platform and are not stages of the
  consumers' flow, so the hand-off warning does not apply inside a platform grouping.

Grid for a grouping under the stack: grouping `x = 220`, `y = lowest lane bottom + 54 = 552`,
600 × 260 (centre 682); inner teams `y = grouping y + 150 = 702`, height 90, inset 40 px from the
grouping's left and right edges, 40 px apart — two teams of 240 at `x = 260` and `x = 540`.

## The worked example

`../examples/ride-hailing.tt` is a complete, checker-clean diagram built with exactly this grid:

| Element                   | Kind / mode                        | x   | y   | w × h     |
| ------------------------- | ---------------------------------- | --- | --- | --------- |
| `flow_main`               | flow                               | 40  | 40  | 1010 × 56 |
| `team_security`           | enabling                           | 40  | 150 | 120 × 222 |
| `team_onboarding`         | stream-aligned                     | 220 | 150 | 600 × 96  |
| `team_booking`            | stream-aligned                     | 220 | 276 | 600 × 96  |
| `team_payments`           | stream-aligned                     | 220 | 402 | 600 × 96  |
| `team_pricing`            | complicated-subsystem              | 880 | 249 | 170 × 150 |
| `team_platform`           | platform                           | 220 | 552 | 600 × 110 |
| `int_security_onboarding` | facilitating                       | 148 | 156 | 84 × 84   |
| `int_security_booking`    | facilitating                       | 148 | 282 | 84 × 84   |
| `int_booking_pricing`     | collaboration                      | 794 | 288 | 112 × 72  |
| `int_platform_payments`   | x-as-a-service                     | 476 | 486 | 88 × 78   |
| `ann_pricing_handover`    | annotation → `int_booking_pricing` | 880 | 423 | 200 × 64  |
| `ann_security_timebox`    | annotation → `team_security`       | 40  | 396 | 156 × 72  |

Checker output:

```
examples/ride-hailing.tt — "Ride-hailing — team topology"
  6 teams, 4 interactions, 1 flow, 2 annotations

  collaboration   "Booking & Dispatch" ↔ "Pricing Engine"  (surge pricing)
  x-as-a-service  "Mobility Platform" → "Payments"
  x-as-a-service  "Mobility Platform" → "Booking & Dispatch"  (stacked above "Payments")
  x-as-a-service  "Mobility Platform" → "Driver Onboarding"  (stacked above "Payments")
  facilitating    "Booking & Dispatch" ↔ "Security Enablement"
  facilitating    "Driver Onboarding" ↔ "Security Enablement"
  annotation      "Collaboration until surge pricing ships…" → collaboration int_booking_pricing
  annotation      "Facilitating until both teams model the…" → team "Security Enablement" (team_security)

  OK: no errors, no warnings
```

`../examples/ride-hailing-platform-grouping.tt` is the same diagram with the platform drawn as a
grouping (`grp_platform`, 600 × 260 at `y = 552`) of two platform teams, `team_runtime` and
`team_maps` (each 240 × 90 at `y = 702`):

```
examples/ride-hailing-platform-grouping.tt — "Ride-hailing — with platform grouping"
  8 teams, 4 interactions, 1 flow, 2 annotations

  grouping        "Maps & Geodata" sits inside "Mobility Platform"
  grouping        "Runtime & CI/CD" sits inside "Mobility Platform"
  collaboration   "Booking & Dispatch" ↔ "Pricing Engine"  (surge pricing)
  x-as-a-service  "Mobility Platform" → "Payments"
  x-as-a-service  "Mobility Platform" → "Booking & Dispatch"  (stacked above "Payments")
  x-as-a-service  "Mobility Platform" → "Driver Onboarding"  (stacked above "Payments")
  facilitating    "Booking & Dispatch" ↔ "Security Enablement"
  facilitating    "Driver Onboarding" ↔ "Security Enablement"
  annotation      "Collaboration until surge pricing ships…" → collaboration int_booking_pricing
  annotation      "Facilitating until both teams model the…" → team "Security Enablement" (team_security)

  OK: no errors, no warnings
```

## Wrong / right

**Wrong** — two stream-aligned teams side by side in one row. Along the flow of change that reads
as Checkout handing its work over to Fulfilment.

```json
{ "id": "team_checkout", "type": "stream-aligned", "label": "Checkout", "position": { "x": 220, "y": 150 }, "size": { "width": 240, "height": 96 } },
{ "id": "team_fulfilment", "type": "stream-aligned", "label": "Fulfilment", "position": { "x": 520, "y": 150 }, "size": { "width": 240, "height": 96 } }
```

```
  warning  team_fulfilment: "Checkout" and "Fulfilment" sit one after the other along the flow of change (side by side or staggered); that reads as a hand-off — stack stream-aligned teams as parallel lanes, one below the other
```

**Right** — stack them as parallel lanes of one width, 30 px apart; each owns its stream end to end.

```json
{ "id": "team_checkout", "type": "stream-aligned", "label": "Checkout", "position": { "x": 220, "y": 150 }, "size": { "width": 600, "height": 96 } },
{ "id": "team_fulfilment", "type": "stream-aligned", "label": "Fulfilment", "position": { "x": 220, "y": 276 }, "size": { "width": 600, "height": 96 } }
```

The checker warns once per neighbouring pair (a row of three gives two warnings), on the right-hand
team, whenever two stream-aligned teams share less than half of the narrower one's width
horizontally and lie at most 60 px apart vertically — side by side, staggered, or stepping down like
a staircase. Teams inside a platform grouping are exempt.

**Wrong** — the platform sits above the stream-aligned team, so the triangle points from the
stream-aligned team up at the platform: it reads "Checkout provides a service to the platform".

```json
{ "id": "team_platform", "type": "platform", "label": "Cloud Platform", "position": { "x": 220, "y": 40 }, "size": { "width": 380, "height": 110 } },
{ "id": "team_checkout", "type": "stream-aligned", "label": "Checkout", "position": { "x": 220, "y": 204 }, "size": { "width": 240, "height": 96 } },
{ "id": "int_platform_checkout", "mode": "x-as-a-service", "position": { "x": 296, "y": 138 }, "size": { "width": 88, "height": 78 } }
```

**Right** — swap them; the triangle now points from the platform (below) up at its consumer.

```json
{ "id": "team_checkout", "type": "stream-aligned", "label": "Checkout", "position": { "x": 220, "y": 40 }, "size": { "width": 240, "height": 96 } },
{ "id": "team_platform", "type": "platform", "label": "Cloud Platform", "position": { "x": 220, "y": 190 }, "size": { "width": 380, "height": 110 } },
{ "id": "int_platform_checkout", "mode": "x-as-a-service", "position": { "x": 296, "y": 124 }, "size": { "width": 88, "height": 78 } }
```

**Wrong** — a collaboration glyph centred on a team instead of on the gap overlaps only that team,
so it relates nothing. **Right** — centre it on the gap between the two teams' facing edges.
