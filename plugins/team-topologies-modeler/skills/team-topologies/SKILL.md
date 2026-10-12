---
name: team-topologies
description: >-
  Team Topologies expert (Matthew Skelton & Manuel Pais). Explains the four team types
  (stream-aligned, enabling, complicated-subsystem, platform), the three interaction modes
  (collaboration, X-as-a-Service, facilitating), cognitive load, Conway's law, fracture planes and
  how interactions evolve; designs a team topology from a description of an organisation, a system
  or a codebase; and reviews an existing topology — strengths, weaknesses, next steps — writing the
  feedback as annotations into the `.tt` file. Use whenever the user wants to model, draw, sketch,
  design, critique or improve a team structure or org design with Team Topologies, or asks about team
  types, interaction modes, platform or enabling teams, team cognitive load or the inverse Conway
  manoeuvre. For the `.tt` / `.ttm.json` file format itself — fields, coordinates, layout, the checker
  — use the `tt-format` skill.
---

# Team Topologies

Team Topologies (Skelton & Pais, 2019) is a way to organise technology teams for **fast flow of
change**: few, well-defined team types, explicit and deliberate interactions between them, and team
boundaries sized to what a team can hold in its head. This skill lets you (1) explain it, (2) design
a topology from what the user tells you, and (3) review an existing diagram. Writing or editing the
`.tt` file is the `tt-format` skill's job — load it alongside this one whenever you touch a file.

## The four team types

| Type                      | Purpose                                                                                        | Healthy signs                                                        | Smells                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Stream-aligned**        | Owns one valuable stream of change (product, journey, user segment) end to end, build to run   | the majority of teams; ships without hand-offs; named after a domain | named after a layer or technology (`Frontend`, `DBA`); waits on others  |
| **Enabling**              | Specialists who help stream-aligned teams acquire a missing capability, then move on           | time-boxed engagements; teaches, does not do the work                | permanent; becomes a bottleneck or a ticket queue; owns production code |
| **Complicated-subsystem** | Owns a part that needs deep specialist knowledge (maths, codecs, risk models)                  | rare; justified by expertise, not by component size                  | a "component team" for an ordinary module; many of them                 |
| **Platform**              | Provides internal self-service products that reduce the cognitive load of stream-aligned teams | consumed X-as-a-Service; treated as a product; thinnest viable       | everyone must collaborate with it to get anything; a gatekeeper         |

## The three interaction modes

| Mode               | Meaning                                                         | When                                              | Duration                               |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| **Collaboration**  | Two teams work closely together on a shared goal                | discovery, new technology, fuzzy boundaries       | temporary — expensive, blurs ownership |
| **X-as-a-Service** | One team consumes what the other provides, with minimal contact | well-understood, stable boundary with a clear API | long-lived — the target for most pairs |
| **Facilitating**   | One team helps the other learn or remove an impediment          | capability gaps; typical for enabling teams       | temporary — ends when the team is able |

Typical defaults (deviate on purpose, not by accident):

| Pair                                   | Default                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| platform → stream-aligned              | X-as-a-Service (collaboration while a new platform service is discovered) |
| enabling → stream-aligned / platform   | facilitating                                                              |
| complicated-subsystem → stream-aligned | X-as-a-Service (collaboration while the interface is designed)            |
| stream-aligned ↔ stream-aligned        | X-as-a-Service; collaboration only for a bounded shared effort            |

Guard rails: a team collaborates with **at most one or two** other teams at a time; every
collaboration has a purpose and an end; enabling teams almost never provide X-as-a-Service.

## Designing a topology

1. **Find the streams of change** — products, customer journeys, user segments, business domains
   (bounded contexts). Each gets a stream-aligned team, named after the stream. If the user describes
   a codebase, its domains and deployables are candidates; its technical layers are not.
2. **Check cognitive load.** Can one team of 5–9 people own the stream end to end? If not, split
   it along a fracture plane (see `reference/concepts.md`). If two streams are tiny, merge them.
3. **Pull out what every stream needs but should not build** — runtime, CI/CD, observability, data
   pipelines — into a platform, consumed X-as-a-Service. Start thin.
4. **Isolate genuine specialist subsystems** into complicated-subsystem teams — only where the
   expertise is scarce and deep.
5. **Close capability gaps** with enabling teams that facilitate, time-boxed.
6. **Choose one interaction per pair that actually needs one**, with its purpose. Mark every
   temporary one (collaboration, facilitating) with an annotation saying what ends it and what
   follows ("Collaboration until the fraud rules are stable, then X-as-a-Service").
7. **Draw it** with the `tt-format` skill: flow of change on top, stream-aligned teams along it,
   platform below, enabling teams at the side, then run its checker.

Never invent facts to fill gaps. If the user did not say how big a team is or who owns what, model
the most likely shape and record each assumption as an annotation (`Assumption: …`), then list the
assumptions in your answer so the user can correct them.

## Reviewing a topology (the core job)

1. **Read the file** (or the user's description) and run the `tt-format` checker — its readings
   list which teams each interaction really connects. Work from those, not from the ids.
2. **Check the type mix.** Stream-aligned teams should be the majority. Many platform or
   complicated-subsystem teams point to component thinking.
3. **Check each team.** Clear stream or purpose? Name a domain, not a layer? Plausible cognitive
   load (count its domains and its interactions)? The `description` field holds the stated purpose.
4. **Check each interaction.** Mode fits the pair (table above)? Collaboration temporary and
   purposeful? Platform consumed as a service rather than through permanent collaboration? Enabling
   teams facilitating, not doing the work?
5. **Check the flow.** Does any stream-aligned team need several other teams to ship (hand-offs)?
   Teams with no interaction at all — independent, or forgotten? Is a flow of change drawn?
6. **Look for evolution.** Which collaborations should become X-as-a-Service, which enabling
   engagements should end, which subsystem has outgrown its team?
7. **Deliver feedback two ways:**
   - A short written assessment: **Strengths**, **Weaknesses / risks**, **Next steps**.
   - **Annotations in the file**, attached to the element they discuss, so the feedback shows on
     the canvas. Keep each to one or two short sentences.

### Feedback annotations

Annotations have no colour, so the kind of feedback goes into a prefix:

| Prefix      | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `Strength:` | well modelled, keep it                                 |
| `Risk:`     | works today but will hurt (load, coupling, bottleneck) |
| `Problem:`  | wrong type or mode, missing interaction, contradiction |
| `Question:` | the diagram cannot answer it — ask the team            |
| `Idea:`     | an opportunity or a next evolution step                |

Give review annotations ids `ann_review_<n>` so they can be found and removed in one go, place them
in free space next to their element (the `tt-format` layout rules), and re-run the checker.

```json
{
  "id": "ann_review_1",
  "text": "Risk: three permanent collaborations — the platform is not self-service yet.",
  "position": { "x": 1100, "y": 470 },
  "size": { "width": 220, "height": 64 },
  "attachedTo": "team_platform"
}
```

## Naming

- **Teams**: the stream or capability they own, in the user's language — `Checkout & Payments`,
  `Driver Onboarding`, `Fraud Detection`. Not `Team A`, not `Backend`.
- **Descriptions**: one sentence of purpose ("Owns the checkout journey end to end."). They appear
  in the editor's inspector, not on the canvas.
- **Interaction labels**: optional, one or two words on what flows — `fraud rules`, `CI/CD`,
  `observability`. Longer explanations belong in annotations.

## Reference files (read on demand)

- `reference/concepts.md` — cognitive load, Conway's law and the inverse Conway manoeuvre, the eight
  fracture planes, team API, thinnest viable platform, interaction evolution and a catalogue of
  anti-patterns with what to suggest instead.
