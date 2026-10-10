# Changelog

## [0.10.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.9.0...v0.10.0) (2026-10-10)


### Features

* **vscode:** file icon for *.ttm.json ([#105](https://github.com/Miragon/team-topologies-modeler/issues/105)) ([e63b177](https://github.com/Miragon/team-topologies-modeler/commit/e63b1770f756d8b8e38db9ea3b56fd5cc6be83dc))

## [0.9.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.8.0...v0.9.0) (2026-10-08)


### Features

* use the Team Topologies modeler icon for app, favicon and .tt files ([#101](https://github.com/Miragon/team-topologies-modeler/issues/101)) ([6aa6016](https://github.com/Miragon/team-topologies-modeler/commit/6aa60163982e0db0e877c2f504e3e3df8a16261e))

## [0.8.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.7.1...v0.8.0) (2026-09-28)


### ⚠ BREAKING CHANGES

* DOCUMENT_VERSION is 3 and TtDocument has a required `annotations` array (v1/v2 documents migrate on parse; an empty list is not serialised, so re-saving a v2 file only changes its version). isTtElement() now matches shapes only; annotation connectors are TtAssociation.

### Features

* multi-selection, text annotations and in-place label editing ([#94](https://github.com/Miragon/team-topologies-modeler/issues/94)) ([533e49a](https://github.com/Miragon/team-topologies-modeler/commit/533e49a113dcea50315b98def48afaf28364b880))

## [0.7.1](https://github.com/Miragon/team-topologies-modeler/compare/v0.7.0...v0.7.1) (2026-09-22)


### Bug Fixes

* **deps:** publish shared runtime libs as ranged peerDependencies ([#88](https://github.com/Miragon/team-topologies-modeler/issues/88)) ([90f1aa5](https://github.com/Miragon/team-topologies-modeler/commit/90f1aa56a74310bf5d63261929e3c9541d75b7eb))

## [0.7.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.6.0...v0.7.0) (2026-09-18)


### Features

* **webapp:** left-align legal footer and add dynamic copyright ([#57](https://github.com/Miragon/team-topologies-modeler/issues/57)) ([069620c](https://github.com/Miragon/team-topologies-modeler/commit/069620c3c7589d641ee82f35dea7ba27e8edf238))

## [0.6.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.5.0...v0.6.0) (2026-07-17)


### Features

* adopt Miragon corporate identity ([#52](https://github.com/Miragon/team-topologies-modeler/issues/52)) ([900be13](https://github.com/Miragon/team-topologies-modeler/commit/900be13fdba1377789d66f27f7cd260fb3888b49))
* **renderer:** add copy & paste of elements ([#56](https://github.com/Miragon/team-topologies-modeler/issues/56)) ([b9b13a3](https://github.com/Miragon/team-topologies-modeler/commit/b9b13a3b754c6314f258c086952d18f0004c57bc))

## [0.5.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.4.0...v0.5.0) (2026-07-09)


### Features

* **webapp:** add empty-state welcome card and start empty ([#47](https://github.com/Miragon/team-topologies-modeler/issues/47)) ([3376b87](https://github.com/Miragon/team-topologies-modeler/commit/3376b87120bc34a3e668d5ee9c8885f720580e66))

## [0.4.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.3.1...v0.4.0) (2026-07-07)


### Features

* **dev:** adopt documented Portless setup for worktree-aware dev URLs ([#31](https://github.com/Miragon/team-topologies-modeler/issues/31)) ([2155439](https://github.com/Miragon/team-topologies-modeler/commit/2155439858dea3af7023cf2cf0156a1b071fdabc))
* **vscode:** add Get Started walkthrough and align README with Miragon Modeler reference ([#41](https://github.com/Miragon/team-topologies-modeler/issues/41)) ([a4afbad](https://github.com/Miragon/team-topologies-modeler/commit/a4afbad61606a87fa77fedac6448c9a2130e9794))

## [0.3.1](https://github.com/Miragon/team-topologies-modeler/compare/v0.3.0...v0.3.1) (2026-06-22)


### Bug Fixes

* README badges + repository URL casing for npm provenance (0.3.1) ([#27](https://github.com/Miragon/team-topologies-modeler/issues/27)) ([9a09a36](https://github.com/Miragon/team-topologies-modeler/commit/9a09a36b5308156a8d5dfd9b1a39870e48785790))

## [0.3.0](https://github.com/Miragon/team-topologies-modeler/compare/v0.2.0...v0.3.0) (2026-06-22)


### Features

* setup vs-code plugin ([#2](https://github.com/Miragon/team-topologies-modeler/issues/2)) ([91f8103](https://github.com/Miragon/team-topologies-modeler/commit/91f81036b9079ddab129db0c92a548ca167e8a94))
* **webapp:** legal notice footer + Portless named dev URL ([#16](https://github.com/Miragon/team-topologies-modeler/issues/16)) ([77f7ab4](https://github.com/Miragon/team-topologies-modeler/commit/77f7ab431d59c64fcc4105e8d6eb96113b4c8402))


### Bug Fixes

* **deps:** clear all npm audit advisories + Miragon favicon ([#21](https://github.com/Miragon/team-topologies-modeler/issues/21)) ([bf1d090](https://github.com/Miragon/team-topologies-modeler/commit/bf1d090074201de690aa924a6f75b72b09f8306c))
* **deps:** clear all npm audit advisories + Miragon favicon ([#21](https://github.com/Miragon/team-topologies-modeler/issues/21)) ([7095661](https://github.com/Miragon/team-topologies-modeler/commit/70956619aa2e157d76bdbf591b97db56b6000ee5))
* stop elements gluing together and unify the platform team border ([#13](https://github.com/Miragon/team-topologies-modeler/issues/13)) ([10ff90f](https://github.com/Miragon/team-topologies-modeler/commit/10ff90f6e71034e1368691668d7d42a91abb0eb8))
