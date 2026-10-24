# Team Topologies Modeler has moved

> [!IMPORTANT]
> This repository is archived and read-only. The Team Topologies Modeler now lives in the
> [Miragon modeler suite](https://github.com/Miragon/modeler-suite), in
> [`modelers/team-topologies`](https://github.com/Miragon/modeler-suite/tree/main/modelers/team-topologies), with its full git history.

Nothing changes for users:

- **npm packages** keep their names and version lines; new releases come from the suite: [`@miragon/team-topologies-schema-model`](https://www.npmjs.com/package/@miragon/team-topologies-schema-model), [`@miragon/team-topologies-renderer`](https://www.npmjs.com/package/@miragon/team-topologies-renderer).
- **VS Code extension** `miragon-gmbh.team-topologies-modeler` stays the same ([Marketplace](https://marketplace.visualstudio.com/items?itemName=miragon-gmbh.team-topologies-modeler), [Open VSX](https://open-vsx.org/extension/miragon-gmbh/team-topologies-modeler)).
- **Web app** stays at [team-topologies.modeler.miragon.io](https://team-topologies.modeler.miragon.io).
- **Claude Code plugin** `team-topologies-modeler` keeps its name and skills; it now comes from the suite's
  marketplace, which replaces the `team-topologies` marketplace of this repository:

  ```text
  /plugin marketplace add Miragon/modeler-suite
  /plugin install team-topologies-modeler@modeler-suite
  ```

**Issues and pull requests** go to [Miragon/modeler-suite](https://github.com/Miragon/modeler-suite/issues); the open issues of
this repository were moved there. Development, CI and releases are described in the suite's
[README](https://github.com/Miragon/modeler-suite#readme) and [CONTRIBUTING.md](https://github.com/Miragon/modeler-suite/blob/main/CONTRIBUTING.md), the
modeler itself in [`modelers/team-topologies/README.md`](https://github.com/Miragon/modeler-suite/blob/main/modelers/team-topologies/README.md).
