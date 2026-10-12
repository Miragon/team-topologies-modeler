# Team Topologies Modeler — Claude Code plugin

Two skills that teach Claude [Team Topologies](https://teamtopologies.com/) and the `.tt` /
`.ttm.json` file format used by the
[Team Topologies Modeler](https://github.com/Miragon/team-topologies-modeler).

| Skill             | What it covers                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `team-topologies` | The method after Skelton & Pais: the four team types, the three interaction modes, cognitive load, fracture planes, designing a topology, and reviews with feedback annotations.     |
| `tt-format`       | The file format: every field, top-left coordinates, sizes, interactions as overlapping shapes, the upward X-as-a-Service triangle, stacking order, a layout grid and canonical form. |

`tt-format` ships a dependency-free checker (`scripts/check.mjs`, Node ≥ 18) that validates a file
exactly like the modeler does, spells out which teams every interaction connects, flags layout
mistakes and rewrites the file in canonical form — so Claude can check a diagram it drew without
seeing it. Two worked example diagrams live in `skills/tt-format/examples/`.

## Install

```
/plugin marketplace add Miragon/team-topologies-modeler
/plugin install team-topologies-modeler@team-topologies
```

From a local checkout instead:

```
/plugin marketplace add /path/to/team-topologies-modeler
/plugin install team-topologies-modeler@team-topologies
```

Once installed the skills are available everywhere as `team-topologies-modeler:team-topologies` and
`team-topologies-modeler:tt-format`. They load on demand.

## Using them

Nothing to invoke by hand. The skills trigger when you ask Claude to work on Team Topologies:

- "Draw a team topology for our three product teams and the platform team" → both
- "Review `org.tt` — where are we overloading teams?" → `team-topologies` (+ `tt-format` to annotate)
- "Why does my X-as-a-Service triangle point the wrong way?" → `tt-format`

You can also call them explicitly with `/team-topologies-modeler:tt-format`.

Open the result in the `miragon-gmbh.team-topologies-modeler` VS Code extension, in the
[web app](https://team-topologies.modeler.miragon.io) (Menu → Import…, `.ttm.json`), or in designIQ.

## Development

The skills are plain markdown under `skills/`. After editing, validate them:

```bash
claude plugin validate plugins/team-topologies-modeler --strict
claude plugin validate .            # the marketplace manifest
```

The checker hand-mirrors `@miragon/team-topologies-schema-model` (notation sizes, schema,
serializer). `packages/schema-model/src/plugin-check.sync.test.ts` fails as soon as the two diverge,
so `npm test` catches drift. The plugin `version` here and in the repository's
`.claude-plugin/marketplace.json` is bumped by release-please together with the packages.

## License

MIT — see the [repository LICENSE](https://github.com/Miragon/team-topologies-modeler/blob/main/LICENSE).
