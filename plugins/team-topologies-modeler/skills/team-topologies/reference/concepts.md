# Team Topologies — concepts in depth

Background for designing and reviewing topologies. The vocabulary follows _Team Topologies_ by
Matthew Skelton and Manuel Pais.

## Team first

- **The team is the unit of delivery**, not the individual. Ownership, priorities and boundaries
  are set per team.
- **Small and stable**: 5–9 people (Dunbar's first limit). Groups of teams scale at roughly 50 and
  150 people; beyond that, trust and shared context break down.
- **Long-lived**: bring work to teams, do not form teams around projects and disband them.
- **Every piece of software has exactly one owning team.** Shared ownership is no ownership.

## Cognitive load

The amount of mental effort a team must spend to do its work. Three kinds:

- **Intrinsic** — the essential difficulty of the domain or technology.
- **Extraneous** — effort that adds no value: manual deployments, unclear environments, waiting.
  Platforms and good tooling remove it.
- **Germane** — learning the business domain itself, which is where a stream-aligned team should
  spend its capacity.

Signals of overload: many domains per team, frequent context switches, several on-call areas, a
long list of interactions, slow onboarding. Remedies: split the stream along a fracture plane, move
undifferentiated work to a platform, bring in an enabling team, give a specialist part to a
complicated-subsystem team.

## Conway's law and the inverse Conway manoeuvre

Systems mirror the communication structure of the organisation that builds them. So **design the
teams for the architecture you want** (the inverse Conway manoeuvre): if two services should be
independent, they need different owning teams with an X-as-a-Service boundary; if teams must
constantly collaborate, the system will grow a matching coupling.

## Fracture planes — where to split

Natural seams along which a system (and the team owning it) can be split:

1. **Business domain** (bounded context) — the default and usually the best.
2. **Regulatory compliance** — isolate the parts under audit (e.g. payment card data).
3. **Change cadence** — parts that change at very different speeds.
4. **Team location** — time zones and co-location.
5. **Risk** — different appetites for risk (experimentation vs. core ledger).
6. **Performance isolation** — parts with special scaling or latency needs.
7. **Technology** — only when the technology really differs (e.g. embedded vs. cloud).
8. **User personas** — distinct groups of users with distinct needs.

Splitting by technical layer (UI, backend, database) is **not** a fracture plane — it creates
hand-offs on every change.

## Team API

What a team offers to and expects from others: its code and services, documentation, ways of
working, communication channels and the interactions it is willing to have. A clear team API is what
makes X-as-a-Service possible.

## Thinnest viable platform

A platform is a product for internal customers, as small as possible: sometimes a wiki page of
conventions and a set of managed services is enough. It grows only where it measurably reduces the
cognitive load of stream-aligned teams. Its success is adoption by choice, not by mandate. Large
platforms are themselves built by several teams — a platform grouping with stream-aligned,
enabling and complicated-subsystem teams inside, whose customers are the other teams.

## Interactions evolve

Interaction modes are a choice for the current phase, not a fixed property of the pair:

- **Collaboration → X-as-a-Service**: two teams discover a new capability together, then the
  provider hardens it into a service.
- **Facilitating → none**: the enabling team leaves once the stream-aligned team is able.
- **X-as-a-Service → collaboration**: temporarily, when a service needs a fundamental redesign.

A good diagram shows the current state and annotates the intended next state. Repeated, unplanned
switches between modes are a smell: the boundary is not understood yet.

## Sensing

Interactions are also a sensor. Unexpected collaboration, rising friction at an X-as-a-Service
boundary, or a team constantly asking for help reveals a wrong boundary, a missing capability or a
platform gap. Reviews should ask where the friction is.

## Anti-patterns and what to suggest instead

| Anti-pattern                                      | Why it hurts                                       | Suggest                                                              |
| ------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Teams per technical layer (`Frontend`, `Backend`) | every feature needs a hand-off                     | stream-aligned teams per domain, owning all layers                   |
| Platform that everyone collaborates with          | platform is a bottleneck, not self-service         | X-as-a-Service with a clear API; collaborate with one team at a time |
| Permanent enabling team doing the work            | capability never transfers; becomes a service desk | time-box facilitating; hand over, then move to the next team         |
| Complicated-subsystem team for an ordinary module | component team, extra hand-offs                    | give the module to the stream-aligned team that changes it most      |
| Stream-aligned team with many dependencies        | flow blocked by waiting                            | move ownership into the team, or provide the dependency as a service |
| Stream-aligned teams chained along one flow       | each change waits at every hand-over               | one team owns each stream end to end; draw streams as parallel lanes |
| Team collaborating with many teams at once        | overload, blurred ownership                        | at most one or two collaborations; turn the rest into X-as-a-Service |
| Collaboration with no end                         | permanent coupling disguised as teamwork           | name the outcome that ends it and the mode that follows              |
| One "shared services" team for everything         | unclear purpose, unbounded load                    | split into platform services, enabling support and owned components  |
| Many tiny teams with one person each              | not teams; no resilience                           | merge into teams of 5–9 around a stream                              |
| Interactions drawn but not explained              | readers cannot tell intent from accident           | an interaction label or an annotation stating purpose and duration   |
