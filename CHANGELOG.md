## [1.21.1](https://github.com/simiancraft/google-mcp-suite/compare/v1.21.0...v1.21.1) (2026-09-19)

## [1.21.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.20.0...v1.21.0) (2026-09-17)

### Features

* **host:** serve every service and account over Streamable HTTP ([#106](https://github.com/simiancraft/google-mcp-suite/issues/106)) ([aa1208a](https://github.com/simiancraft/google-mcp-suite/commit/aa1208a1fcc95dbd79a566a275fe94c3a1e09ad0))

### Bug Fixes

* **host:** bind sessions to their route and guard startup and requests ([3db6e1e](https://github.com/simiancraft/google-mcp-suite/commit/3db6e1e82a932019e41c6b1d6c816f09a012ffbc))

### Refactoring

* **auth:** lift the account roster from doctor into auth ([6de7362](https://github.com/simiancraft/google-mcp-suite/commit/6de7362027708d9d2183fe8ca596de15882bd8c3))
* **lib:** split createServer() from the stdio runner; services export their definition ([3013444](https://github.com/simiancraft/google-mcp-suite/commit/3013444e505cc68df49a110eee18689a86378fe5))

### Documentation

* align the service recipe with service.ts and the roster move ([e278f55](https://github.com/simiancraft/google-mcp-suite/commit/e278f5550600615057e2736600182fbc6dbe02f2))
* **host:** correct the supervisor templates and the missing-token message ([890e729](https://github.com/simiancraft/google-mcp-suite/commit/890e729d0452ff3d2ec52232b6659715d5fe70ae))
* **host:** document sharing the host between agents ([fb3fe50](https://github.com/simiancraft/google-mcp-suite/commit/fb3fe5089ae68bdbf6efae7a11abb13c9c8972ca))
* **host:** record observed session close behavior per client ([4cdfd8b](https://github.com/simiancraft/google-mcp-suite/commit/4cdfd8b93cc808c33538713813fc12d4ff3c279a))

## [1.20.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.19.0...v1.20.0) (2026-09-01)

### Features

* **gmail:** add attachment support to compose operations ([#102](https://github.com/simiancraft/google-mcp-suite/issues/102)) ([a58adf1](https://github.com/simiancraft/google-mcp-suite/commit/a58adf1185d7d695aaa79d844e59f08dfb4e219f)), closes [#101](https://github.com/simiancraft/google-mcp-suite/issues/101) [#103](https://github.com/simiancraft/google-mcp-suite/issues/103)

## [1.19.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.18.1...v1.19.0) (2026-08-31)

### Features

* **docs:** curated batchUpdate expansion: formatting, tables, and document structure ([#99](https://github.com/simiancraft/google-mcp-suite/issues/99)) ([a1c7bbd](https://github.com/simiancraft/google-mcp-suite/commit/a1c7bbdf2f96451391dc4d7d17024b7bfbf33d04)), closes [#35](https://github.com/simiancraft/google-mcp-suite/issues/35) [#36](https://github.com/simiancraft/google-mcp-suite/issues/36)

## [1.18.1](https://github.com/simiancraft/google-mcp-suite/compare/v1.18.0...v1.18.1) (2026-07-29)

### Bug Fixes

* **calendar:** finish the ACL role rollout and require the idempotent pin ([#93](https://github.com/simiancraft/google-mcp-suite/issues/93)) ([4bde0d5](https://github.com/simiancraft/google-mcp-suite/commit/4bde0d52b3cd76fd4b96bcfb6595da98a066f4c1)), closes [#88](https://github.com/simiancraft/google-mcp-suite/issues/88) [#19](https://github.com/simiancraft/google-mcp-suite/issues/19) [#96](https://github.com/simiancraft/google-mcp-suite/issues/96)

## [1.18.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.17.0...v1.18.0) (2026-07-29)

### Features

* **calendar:** add access control methods for calendar sharing ([#88](https://github.com/simiancraft/google-mcp-suite/issues/88)) ([fc07dce](https://github.com/simiancraft/google-mcp-suite/commit/fc07dcef2b4a27b81418feaec5cce68a27f5bd4d)), closes [#19](https://github.com/simiancraft/google-mcp-suite/issues/19) [#19](https://github.com/simiancraft/google-mcp-suite/issues/19)

## [1.17.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.16.0...v1.17.0) (2026-07-24)

### Features

* **gmail:** add savePath to download_attachment for disk writes ([1dda2f4](https://github.com/simiancraft/google-mcp-suite/commit/1dda2f491fd74dfddcd0ae96b3f3719318b8beed))

## [1.16.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.15.0...v1.16.0) (2026-07-19)

### Features

* **sheets:** add named-range updates, metadata writes, slicers, and the full chart families ([4cade15](https://github.com/simiancraft/google-mcp-suite/commit/4cade15394569e2ed01cbe42f5ac77d5538167cc))

### Bug Fixes

* **sheets:** derive the filter-clearing mask once, not twice ([4cf4fda](https://github.com/simiancraft/google-mcp-suite/commit/4cf4fda77e632e6fb43f958fdcde2b50c4503290))
* **sheets:** let update_slicer_spec clear a filter ([9a942fd](https://github.com/simiancraft/google-mcp-suite/commit/9a942fd8b1b666b6b7a5429b7015c7c94673f779))
* **sheets:** make the chart curation and metadata contracts exact ([1bbd53c](https://github.com/simiancraft/google-mcp-suite/commit/1bbd53cab9c0959213da0b8ccdeecfa0d33dab63))

## [1.15.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.14.0...v1.15.0) (2026-07-19)

### Features

* **sheets:** add the layout and dimension operations ([bc9a4b5](https://github.com/simiancraft/google-mcp-suite/commit/bc9a4b5f11e6db0c794353c48aa72051b14c3e6b))

### Bug Fixes

* **sheets:** harden the layout operations after review ([f01058e](https://github.com/simiancraft/google-mcp-suite/commit/f01058e91dec72cf9220b8b47fce30fd9cf0e9f7))
* **sheets:** update_embedded_object_position is not idempotent ([83c9ee0](https://github.com/simiancraft/google-mcp-suite/commit/83c9ee06ae5aa75b09cc96511ec6f44da1238050))

## [1.14.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.13.0...v1.14.0) (2026-07-19)

### Features

* **sheets:** add the data operations: sort, filters, and grid editing ([9ed5265](https://github.com/simiancraft/google-mcp-suite/commit/9ed52653e12f4ed297c5372e194352eb1212ae19))

### Bug Fixes

* **sheets:** finish the data-operations convergence pass ([4cb2ecc](https://github.com/simiancraft/google-mcp-suite/commit/4cb2ecc928660338c9a215f0dec21e7c568e54bb))
* **sheets:** harden the data operations after review ([49dfa54](https://github.com/simiancraft/google-mcp-suite/commit/49dfa54fb234f1cf7081cceb4cc4d7641170df5c))
* **sheets:** repair the convergence-pass build ([4b36aab](https://github.com/simiancraft/google-mcp-suite/commit/4b36aab4d9e8b62e27e92ae23d442369ce9fb84f))

## [1.13.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.12.0...v1.13.0) (2026-07-19)

### Features

* **sheets:** add cell content writes: update_cells, merge_cells, unmerge_cells ([54fd148](https://github.com/simiancraft/google-mcp-suite/commit/54fd148ecec7127f9d56609a885cce9bf02c6dea))
* **sheets:** add conditional format rules, data validation, and protected ranges ([f98eba7](https://github.com/simiancraft/google-mcp-suite/commit/f98eba7ab8c04166aec264902597671a3b391b82))

### Bug Fixes

* **sheets:** close the review loop on the reactive layer readout and docs ([b29886b](https://github.com/simiancraft/google-mcp-suite/commit/b29886bf898ccdd822ee48412623df4a1a777c35))
* **sheets:** correct the cell-content contracts after review ([ad02dd4](https://github.com/simiancraft/google-mcp-suite/commit/ad02dd490c18f4c072403038dd00aa11b1ad6942))
* **sheets:** expand the update_cells format mask per subkey ([0969278](https://github.com/simiancraft/google-mcp-suite/commit/0969278c42db18029cad99187254cddb056cb641))
* **sheets:** finish the reactive-layer convergence pass ([9cadfcf](https://github.com/simiancraft/google-mcp-suite/commit/9cadfcfab813789c8bd669e20824450cdcb56d93))
* **sheets:** harden the reactive layer after review ([25c3e79](https://github.com/simiancraft/google-mcp-suite/commit/25c3e7930dc14693d1053872893c950612d5ffc1))

### Documentation

* **sheets:** drop the run-spanning cell-link claim from TextFormatRun ([1e47bfa](https://github.com/simiancraft/google-mcp-suite/commit/1e47bfab8db93cb19c7cf0de68629a80adef9fcd))
* **sheets:** settle the cell-content terminology and link semantics ([68d8417](https://github.com/simiancraft/google-mcp-suite/commit/68d8417d8239f02a2b63dbd85956ab883b7dc077))

## [1.12.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.11.2...v1.12.0) (2026-07-19)

### Features

* **sheets:** add chart methods via batchUpdate ([c36a696](https://github.com/simiancraft/google-mcp-suite/commit/c36a6966d1a67ea240a016fb3a93995782eb24e2)), closes [#27](https://github.com/simiancraft/google-mcp-suite/issues/27)
* **sheets:** add dimension methods via batchUpdate ([c341b89](https://github.com/simiancraft/google-mcp-suite/commit/c341b89190c1b012e859972bbd3bdb70e6210292)), closes [#27](https://github.com/simiancraft/google-mcp-suite/issues/27)
* **sheets:** add formatting methods via batchUpdate ([113578e](https://github.com/simiancraft/google-mcp-suite/commit/113578e7dcffa66d55edd728e745a1e0040baf7b)), closes [#27](https://github.com/simiancraft/google-mcp-suite/issues/27)
* **sheets:** add named-range methods via batchUpdate ([640692d](https://github.com/simiancraft/google-mcp-suite/commit/640692deeaeab02e1e137881cbfee3a308fad52d)), closes [#27](https://github.com/simiancraft/google-mcp-suite/issues/27)
* **sheets:** add sheet management via curated batchUpdate requests ([072fb85](https://github.com/simiancraft/google-mcp-suite/commit/072fb8542628c21c44f15e88f33afb0be4ef9d02)), closes [#27](https://github.com/simiancraft/google-mcp-suite/issues/27)

### Bug Fixes

* **sheets:** enforce the ColorStyle oneof at the carrier ([0715fb9](https://github.com/simiancraft/google-mcp-suite/commit/0715fb9bf32e833a3f03d541e4a3f9fa04a80a42))
* **sheets:** reclassify grid resize as destructive, tighten input domains ([5dbc896](https://github.com/simiancraft/google-mcp-suite/commit/5dbc896e402feccf7d65f4c34644738e0c545896)), closes [#76](https://github.com/simiancraft/google-mcp-suite/issues/76)
* **sheets:** tighten validation and correct describes per review ([ab25cce](https://github.com/simiancraft/google-mcp-suite/commit/ab25cce8140ffafed6db3858ce9c31238a9d1277))

### Refactoring

* **sheets:** split format carriers out of lib/requests ([250435e](https://github.com/simiancraft/google-mcp-suite/commit/250435e7a64aa45100075624ad00fe1313e9dc2d))

### Documentation

* finish the toolset-staleness sweep, source the behavioral claims ([649793f](https://github.com/simiancraft/google-mcp-suite/commit/649793f9226ed87c3d9682124db546f49531ac12))
* **readme:** date the no-MCP-toolset claim for Sheets and Docs ([b244913](https://github.com/simiancraft/google-mcp-suite/commit/b244913e521e70817171278e97b52c65006a6313)), closes [#76](https://github.com/simiancraft/google-mcp-suite/issues/76)
* update front-door operation counts and pin them to the registries ([1f7cdf4](https://github.com/simiancraft/google-mcp-suite/commit/1f7cdf40229bc68872a20707d1912124c2ac547c))

## [1.11.2](https://github.com/simiancraft/google-mcp-suite/compare/v1.11.1...v1.11.2) (2026-07-02)

### Bug Fixes

* **lib:** heal stale instance credentials on invalid_grant ([70b19dc](https://github.com/simiancraft/google-mcp-suite/commit/70b19dc69e775077b9ae880ae23964f01fdc2b10))

## [1.11.1](https://github.com/simiancraft/google-mcp-suite/compare/v1.11.0...v1.11.1) (2026-07-02)

### Bug Fixes

* **doctor:** route unknown-command usage to stderr ([#64](https://github.com/simiancraft/google-mcp-suite/issues/64)) ([38a50a9](https://github.com/simiancraft/google-mcp-suite/commit/38a50a9cf80b2ce8b0d3ecd46d80a4b1ba6e70ca))

## [1.11.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.10.2...v1.11.0) (2026-07-02)

### Features

* **suite:** add google-mcp-suite dispatcher bin ([4a3c5c5](https://github.com/simiancraft/google-mcp-suite/commit/4a3c5c543b78d27899e165fdfbca5fe7d99434b0))

### Bug Fixes

* **suite:** JSON-escape the echoed unknown-service name ([67f04bf](https://github.com/simiancraft/google-mcp-suite/commit/67f04bf6250b57ad54908c4242fba65014be5027))

### Documentation

* describe the suite front-door bin in README and AGENTS.md ([6201b9e](https://github.com/simiancraft/google-mcp-suite/commit/6201b9e06636e0109788a61beee39fd569285847))
* register the dispatcher in the new-service playbooks ([c35c3ea](https://github.com/simiancraft/google-mcp-suite/commit/c35c3eac75f9d3066f686bbcc45c7d8ad2abb34e))

## [1.10.2](https://github.com/simiancraft/google-mcp-suite/compare/v1.10.1...v1.10.2) (2026-06-26)

### Documentation

* **ci:** correct stale actions/checkout version comments ([2f0114e](https://github.com/simiancraft/google-mcp-suite/commit/2f0114e73033e1b30b404fb8c58c1f11a47b84b2))

## [1.10.1](https://github.com/simiancraft/google-mcp-suite/compare/v1.10.0...v1.10.1) (2026-06-13)

### Documentation

* **notice:** drop bare SPDX identifiers from attribution prose ([87c8e72](https://github.com/simiancraft/google-mcp-suite/commit/87c8e7253b6a0acf4c3e96a3616bf7315df9418f))

## [1.10.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.9.1...v1.10.0) (2026-06-12)

### Features

* **lib:** add ownLookup and readJsonFile utils ([c2472d8](https://github.com/simiancraft/google-mcp-suite/commit/c2472d8850da93e70b8b85eb81a13e4b0fce8418))

### Refactoring

* adopt the shared spellings at three stragglers ([8c1776c](https://github.com/simiancraft/google-mcp-suite/commit/8c1776cc7faa7f0384130564ed9e60254d061c22))
* **auth:** route the on-disk JSON boundary through readJsonFile ([9b10783](https://github.com/simiancraft/google-mcp-suite/commit/9b1078325a49bf6f532615eae64420e1975b3db7))
* **lib:** group the protocol surface by idea ([75369af](https://github.com/simiancraft/google-mcp-suite/commit/75369af281e6db8e28461f9b826506871b1122fe))
* **lib:** merge the optionality policy into one root module ([822824b](https://github.com/simiancraft/google-mcp-suite/commit/822824b39aed47a777c3cd9bb70b6d146a720827))
* **lib:** rename consts.ts back to limits.ts and lift the cap refusal ([e5eb2d4](https://github.com/simiancraft/google-mcp-suite/commit/e5eb2d4e46ffa0aee3527d936befd61c4285c184))

### Documentation

* **doctor:** the dependency statement includes lib's shared utilities ([eb018dd](https://github.com/simiancraft/google-mcp-suite/commit/eb018dd8a6cf78274240b657dc9da0029233d975))
* position npm metadata around Google Workspace MCP phrasing ([643aa47](https://github.com/simiancraft/google-mcp-suite/commit/643aa47ee6066b6e93dd94acabb2b354ffb9e559))
* write the lib conventions where contributors will find them ([f520784](https://github.com/simiancraft/google-mcp-suite/commit/f5207846fc3dd5f65c4a828bad4b7d20a8dd38a5))

## [1.9.1](https://github.com/simiancraft/google-mcp-suite/compare/v1.9.0...v1.9.1) (2026-06-11)

### Documentation

* **adopting:** cite doctor's identity mapping in the verify gate ([d3caf77](https://github.com/simiancraft/google-mcp-suite/commit/d3caf776ea2f89bb20ade35276739785a932416b))
* **provisioning:** genericize the Phase 6 example ([012ba39](https://github.com/simiancraft/google-mcp-suite/commit/012ba39d929b3f54c86ad966370c8976f7c3c2ca))
* **readme:** align the quickstart auth and registration examples ([ade3cd4](https://github.com/simiancraft/google-mcp-suite/commit/ade3cd48e8efa73ee0a6f28efa72d57f0b3401c6))

## [1.9.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.8.0...v1.9.0) (2026-06-11)

### Features

* extend strict inputs to every nested object ([74a0aa2](https://github.com/simiancraft/google-mcp-suite/commit/74a0aa25f8ac659274f52ab052be1daf76fc53ee))
* **lib:** prettify validation errors in the tool envelope ([928f504](https://github.com/simiancraft/google-mcp-suite/commit/928f504a6c69f1aaa92f82f122b70cdf96b4f941))
* reject unknown input keys suite-wide (strictObject) ([c334de2](https://github.com/simiancraft/google-mcp-suite/commit/c334de24fddd4566bbfbf14445baafe4edf85a94))

### Bug Fixes

* **auth:** add CSRF state and PKCE to the consent flow ([585c272](https://github.com/simiancraft/google-mcp-suite/commit/585c2727cd90076dae838c6190a430c13bc37c58))
* **auth:** answer absolute-form request targets with 400 ([8cf4801](https://github.com/simiancraft/google-mcp-suite/commit/8cf480117d958b01f708ff889caa37edd9c0952c))
* **auth:** bind the consent callback to loopback only ([d38ef6e](https://github.com/simiancraft/google-mcp-suite/commit/d38ef6e67b5a3a19aa49b6f5e7ff5e53d2048831))
* close the iteration-4 review tail ([42c6b7b](https://github.com/simiancraft/google-mcp-suite/commit/42c6b7ba6e74f5bf44650087edbb7a4bbee3e189))
* **drive:** cap read_file_content at the suite's content ceiling ([26785f5](https://github.com/simiancraft/google-mcp-suite/commit/26785f560afc67b9005b15e5da8587ce956d720a))
* **drive:** guard the conversions map and centralize the cap errors ([b41707a](https://github.com/simiancraft/google-mcp-suite/commit/b41707ac3c86474e87055d49949d455d76637c06))
* harden the consent flow edges and cap the suggest scan ([8069ec5](https://github.com/simiancraft/google-mcp-suite/commit/8069ec58aaee7b296d61930ad2cf0d0064e66a77))

### Refactoring

* centralize the media cast and the transfer ceiling ([52273c1](https://github.com/simiancraft/google-mcp-suite/commit/52273c14c34914b7adbd4116ba8af34a602394bb))
* derive enum narrows from entities and harden projections ([160ed92](https://github.com/simiancraft/google-mcp-suite/commit/160ed92b4fab7eaa49025a5e75958c4a6c5df667))
* **drive:** make the last map lookup and cap call sites uniform ([0f695f9](https://github.com/simiancraft/google-mcp-suite/commit/0f695f9f12e52cb7356f2104e3cb4f9fed08563f))
* **lib:** lift capabilities ceremony and vocabulary sentence ([3dfe462](https://github.com/simiancraft/google-mcp-suite/commit/3dfe46220430138d20fc2277a565ae6658a28bac))
* **lib:** lift the wing surface-pin ceremony into one helper ([70cbe07](https://github.com/simiancraft/google-mcp-suite/commit/70cbe0794be561a5285711f68085283f9e2fafc7))

### Documentation

* cite the Drive operational matrix ([#44](https://github.com/simiancraft/google-mcp-suite/issues/44)) alongside the others ([a4fbebd](https://github.com/simiancraft/google-mcp-suite/commit/a4fbebde9d31702a0522f3b800918fe54c0dcc8b))
* correct the security policy, license attribution, and stale claims ([cdfbc82](https://github.com/simiancraft/google-mcp-suite/commit/cdfbc827605b133162c32b9a20dfc0dacbacb8f4))
* **gmail:** backfill .describe() on operation schemas ([9d53bda](https://github.com/simiancraft/google-mcp-suite/commit/9d53bda747972b289c723383a0326c917b3c7fe0))
* iteration-3 prose corrections ([aedd84b](https://github.com/simiancraft/google-mcp-suite/commit/aedd84b361536de7ce2f7d5ec94d57b85a2f8495))
* sweep the guides and READMEs current with the shipped tree ([b720d51](https://github.com/simiancraft/google-mcp-suite/commit/b720d51727496383bfb1ab642db587e8ea6acf12))

# [1.8.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.7.0...v1.8.0) (2026-06-11)


### Features

* **pkg:** ship the adoption docs in the npm tarball ([2ac73f3](https://github.com/simiancraft/google-mcp-suite/commit/2ac73f37bc10b2cb3eb9498f24a821b8e5568b65))

# [1.7.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.6.0...v1.7.0) (2026-06-11)


### Features

* **doctor:** register drive as implemented with a live probe ([ab0c4a0](https://github.com/simiancraft/google-mcp-suite/commit/ab0c4a0cc455a192ebd37eab46fac6e21fc3793d))
* **drive:** add the comment and reply methods ([bf5fcc1](https://github.com/simiancraft/google-mcp-suite/commit/bf5fcc1f14798578bdc3da8239c7af5d2d01e232))
* **drive:** add the file content tools ([db94e44](https://github.com/simiancraft/google-mcp-suite/commit/db94e441e253bf46bc1af50a966ddce5b77c5275)), closes [#38](https://github.com/simiancraft/google-mcp-suite/issues/38)
* **drive:** add the file metadata methods ([e358a50](https://github.com/simiancraft/google-mcp-suite/commit/e358a50f4c54f5020e9b12a137e4ecc0bc530134))
* **drive:** add the file read tools ([9120cab](https://github.com/simiancraft/google-mcp-suite/commit/9120cab26b24b6bcd95c8d5af3cdfd4c522aeb0c))
* **drive:** add the file write tools ([236e5a5](https://github.com/simiancraft/google-mcp-suite/commit/236e5a57655d3cf6ed8e41fbdd8dc20e7ef823af))
* **drive:** add the revision methods ([777b8c3](https://github.com/simiancraft/google-mcp-suite/commit/777b8c383f7377d3d1ac1821a64d4d9d3d9cf9d2))
* **drive:** add the shared drive and about methods ([94d9300](https://github.com/simiancraft/google-mcp-suite/commit/94d9300e4c50344d5bc9fa06980f4d615eaebb22))
* **drive:** scaffold the drive service skeleton ([9f96f90](https://github.com/simiancraft/google-mcp-suite/commit/9f96f9082f50c2badd7a34e447f1de0436a131b5))

# [1.6.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.5.0...v1.6.0) (2026-06-11)


### Bug Fixes

* **docs:** apply the styling panel's findings ([202187f](https://github.com/simiancraft/google-mcp-suite/commit/202187f4a6a27ce32000643ce5716af4dbe93046))


### Features

* **docs:** add the bullet operations ([506d063](https://github.com/simiancraft/google-mcp-suite/commit/506d0635b216f265cd305d61af6beb64ed8898da))
* **docs:** add the paragraph styling operation ([e2d2d02](https://github.com/simiancraft/google-mcp-suite/commit/e2d2d02e6719de95764e0fc60d01c0cdd9bbd48f))
* **docs:** add the text styling operation ([535651e](https://github.com/simiancraft/google-mcp-suite/commit/535651ead9e316467517ee3e4a13b9886e43302e))

# [1.5.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.4.1...v1.5.0) (2026-06-11)


### Bug Fixes

* **docs:** apply the review panel's findings ([5255a64](https://github.com/simiancraft/google-mcp-suite/commit/5255a64f59e9a20c5d064fb8d34f12c4206f42f2)), closes [#41](https://github.com/simiancraft/google-mcp-suite/issues/41)


### Features

* **docs:** add document creation ([f8f3464](https://github.com/simiancraft/google-mcp-suite/commit/f8f34648f3fc59c446df3b7366232d98e04bfbdc))
* **docs:** add the curated text-editing operations ([b98eefe](https://github.com/simiancraft/google-mcp-suite/commit/b98eefebaa77868309d95b3ce88c372c3eedc609)), closes [#35](https://github.com/simiancraft/google-mcp-suite/issues/35)
* **docs:** add the document read path ([d2b9f07](https://github.com/simiancraft/google-mcp-suite/commit/d2b9f07dfcd9d0159fd7253a8da99912b5b97ee8))
* **docs:** scaffold the docs service skeleton ([97b7ede](https://github.com/simiancraft/google-mcp-suite/commit/97b7ededad58ce0568e9696912960158e892dcb2))
* **doctor:** register docs as implemented with a sentinel probe ([252211d](https://github.com/simiancraft/google-mcp-suite/commit/252211d8812b2b43f929ffa069622b2374c13995))

## [1.4.1](https://github.com/simiancraft/google-mcp-suite/compare/v1.4.0...v1.4.1) (2026-06-11)

Documentation-only release: the recipe docs (EXTENDING.md,
ADDING-A-SERVICE.md, AGENTS.md) updated for the operation-definition
enhancements (annotations, source provenance, server identity). The notes
preset in use through v1.7.0 rendered no docs section; releases cut after
the conventionalcommits preset change will.

# [1.4.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.3.0...v1.4.0) (2026-06-11)


### Bug Fixes

* **lib:** make the capability link unconditional ([998a9bd](https://github.com/simiancraft/google-mcp-suite/commit/998a9bdfc2edb83338a49324ed21b657e5f92e40))


### Features

* cite the source reference page on every operation ([7fa46a2](https://github.com/simiancraft/google-mcp-suite/commit/7fa46a2a62afc351329f312ca5b1ee4f219bd04a))
* **lib:** serve provenance, identity metadata, and instructions ([c06d854](https://github.com/simiancraft/google-mcp-suite/commit/c06d8543a8a4917a540c49f3d567e278f95533b9))
* serve per-service instructions and identity metadata ([5ce7ccd](https://github.com/simiancraft/google-mcp-suite/commit/5ce7ccdf8a88839d1e0b750d7ef1a590df6875f8))

# [1.3.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.2.0...v1.3.0) (2026-06-11)


### Features

* **calendar:** annotate every operation with the four MCP hints ([737eaef](https://github.com/simiancraft/google-mcp-suite/commit/737eaef76e17e6ac6594da21b29cb6452abe1272))
* **gmail:** annotate every operation with the four MCP hints ([2813fd4](https://github.com/simiancraft/google-mcp-suite/commit/2813fd44c15825b6846ed87d9653031e03147377))
* **lib:** carry MCP tool annotations on operations ([51d98bd](https://github.com/simiancraft/google-mcp-suite/commit/51d98bdf7d84ac3ae58eabc1505a498c64946f15))
* **sheets:** annotate every operation with the four MCP hints ([b26d65e](https://github.com/simiancraft/google-mcp-suite/commit/b26d65e156fdfa29aeee2c04f4c2bb49771dcee9))

# [1.2.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.1.0...v1.2.0) (2026-06-11)


### Bug Fixes

* **calendar:** drop unknown reminder methods instead of coercing to popup ([b5f8aa3](https://github.com/simiancraft/google-mcp-suite/commit/b5f8aa3c7f3ef67606796a030e1dd04568bfa845))
* **calendar:** reject malformed working-hour bounds in suggestSlots ([87936da](https://github.com/simiancraft/google-mcp-suite/commit/87936da23d7edfe938104eb9b9c632399668a2af))
* **lib:** derive the capabilities header from the rendered groups ([6614b68](https://github.com/simiancraft/google-mcp-suite/commit/6614b688344069cbff69f0f5bb9f264119ab60a4))
* **lib:** guard operation dispatch against inherited Object keys ([52a1a96](https://github.com/simiancraft/google-mcp-suite/commit/52a1a960cd99896497091b1539dc2d1b82737651))
* **sheets:** drop the typographic apostrophe from copy_sheet's description ([9a5c89f](https://github.com/simiancraft/google-mcp-suite/commit/9a5c89fc279b0e2dfa6e9ed9d73d26581b8300e0))


### Features

* **doctor:** register sheets as implemented with a live probe ([c24140e](https://github.com/simiancraft/google-mcp-suite/commit/c24140ed6340c6f090a14e4b36c3771e6048df11))
* **sheets:** add the batch values operations ([913ec4c](https://github.com/simiancraft/google-mcp-suite/commit/913ec4ceed7d7214e9046e507c5bd02438a1f91a))
* **sheets:** add the data-filter values operations ([d06b175](https://github.com/simiancraft/google-mcp-suite/commit/d06b1755e86c1861deaa32cf1943d8d97d122e11))
* **sheets:** add the developer metadata operations ([dd8e8b3](https://github.com/simiancraft/google-mcp-suite/commit/dd8e8b37ebbb6b43ed174c1a5b0596847266212e))
* **sheets:** add the sheet copy operation ([38729c1](https://github.com/simiancraft/google-mcp-suite/commit/38729c10df6321a8358bf3d4d147250040cba996))
* **sheets:** add the spreadsheet and values read path ([6757dc7](https://github.com/simiancraft/google-mcp-suite/commit/6757dc7f35d8b6c5f332b19defc14d493b11f0ad)), closes [#28](https://github.com/simiancraft/google-mcp-suite/issues/28)
* **sheets:** add the spreadsheet and values write path ([99c6ac0](https://github.com/simiancraft/google-mcp-suite/commit/99c6ac03a0e2f96983e372a7763d1dd5f880b541))
* **sheets:** scaffold the sheets service skeleton ([fb3268f](https://github.com/simiancraft/google-mcp-suite/commit/fb3268f981d66b93ac5666e257cf32f08e9c7dab))

# [1.1.0](https://github.com/simiancraft/google-mcp-suite/compare/v1.0.0...v1.1.0) (2026-06-10)


### Bug Fixes

* **calendar:** refuse suggest_time on unreadable calendars; bound pageSize; lift Meet helper ([0ed36ca](https://github.com/simiancraft/google-mcp-suite/commit/0ed36ca454b22ec02ec971d0757b3228964a8f66))


### Features

* **calendar:** add availability and account methods (freebusy, colors, settings) ([fd69d85](https://github.com/simiancraft/google-mcp-suite/commit/fd69d85b4d3a0d346392dd3f3aebbab7a000a0fe)), closes [#21](https://github.com/simiancraft/google-mcp-suite/issues/21)
* **calendar:** add calendar entry methods (get, add, update, remove) ([95e99bc](https://github.com/simiancraft/google-mcp-suite/commit/95e99bc929c23d3d042f26fca17bfb4e996bc702))
* **calendar:** add calendar resource methods (get, create, update, delete, clear) ([c1c3532](https://github.com/simiancraft/google-mcp-suite/commit/c1c35329f8be00ade2323630144f92ab8b30dfc1))
* **calendar:** add event methods (instances, move, quickAdd, patch) ([5b07b59](https://github.com/simiancraft/google-mcp-suite/commit/5b07b59938da3e605d759fceb7b447f64d7d33fd))
* **calendar:** add event read tools (list_events, get_event) ([85ccd0e](https://github.com/simiancraft/google-mcp-suite/commit/85ccd0e2fa57590def7fd30c4db2fc9a76ca2b76))
* **calendar:** add event write tools (create, update, delete, respond) ([dd33a0a](https://github.com/simiancraft/google-mcp-suite/commit/dd33a0a83990f5ac654811b79ea9076562007bae))
* **calendar:** add list_calendars and suggest_time; 8-tool mirror complete ([e2d09d1](https://github.com/simiancraft/google-mcp-suite/commit/e2d09d16164e86ee3a6eb44f38bfc15a37d36627))
* **calendar:** scaffold the calendar service skeleton ([bfb67f2](https://github.com/simiancraft/google-mcp-suite/commit/bfb67f2798ca283d0ec50a9027efc7aa5ffe9b5a))
* **doctor:** register calendar as implemented with a live probe ([89d1ae7](https://github.com/simiancraft/google-mcp-suite/commit/89d1ae769850a477023fc600e67ede6af3e6ba3d))

# 1.0.0 (2026-06-10)


### Bug Fixes

* **ci:** build workspace dependencies before dependents ([b9f54f8](https://github.com/simiancraft/google-mcp-suite/commit/b9f54f8940bd38169b1e8df7b9749c2b5cc32a00))
* **gmail:** block header injection in compose; mark create_filter destructive ([6d10841](https://github.com/simiancraft/google-mcp-suite/commit/6d1084102c011ffcc28d7be04f8338652eece044))
* **gmail:** bound address and MIME parsing against hostile input ([ed1a87f](https://github.com/simiancraft/google-mcp-suite/commit/ed1a87f2915f39427babd8687475a980e0ea6952))
* **gmail:** parse address headers with addressparser ([f8f434b](https://github.com/simiancraft/google-mcp-suite/commit/f8f434b88e8adfcf9b8a4745d4a9cf0a3825d551))
* **lib:** source server version from package.json ([a796cfa](https://github.com/simiancraft/google-mcp-suite/commit/a796cfaa40d08a99df3a1b01266e5cd8131d2038))


### Features

* **auth:** add shared OAuth with per-account tokens ([8679e5a](https://github.com/simiancraft/google-mcp-suite/commit/8679e5aecf9f62db9c936646170674659f670e4a))
* **auth:** front-load the scope union for all planned services ([f90fe31](https://github.com/simiancraft/google-mcp-suite/commit/f90fe317c3812d4e02d2ff3720d54f60f9d9dd58))
* **doctor:** add provisioning and auth-health micro-CLI ([5172615](https://github.com/simiancraft/google-mcp-suite/commit/517261547ee45f3a87f857737b8aeb20e4c2fcd0))
* **gmail:** add filters, batch ops, and HTML body extraction ([229569b](https://github.com/simiancraft/google-mcp-suite/commit/229569b5dd65ea5dbd6b555178706f0f27f7e65a)), closes [#4](https://github.com/simiancraft/google-mcp-suite/issues/4) [#5](https://github.com/simiancraft/google-mcp-suite/issues/5)
* **gmail:** add list_labels tool with Label/LabelColor entities ([e81c096](https://github.com/simiancraft/google-mcp-suite/commit/e81c096f7e7ba75f6b148bd86ad701c59ccec979))
* **gmail:** add REST methods alongside MCP tools ([ccbb166](https://github.com/simiancraft/google-mcp-suite/commit/ccbb166eb651c4ff8e86c8928e2111de4862429e))
* **gmail:** add the remaining nine Tier-1 tools ([fcb1ae0](https://github.com/simiancraft/google-mcp-suite/commit/fcb1ae02214d188c6079aca3c80572bcf60036f9))
* **gmail:** bind operations to the Gmail client via gmailOperation ([0b2f989](https://github.com/simiancraft/google-mcp-suite/commit/0b2f9897a77ba44d830af2014e0a314479c56b4c))
* **gmail:** complete Batch 1 REST methods (parity) ([5f6bbd2](https://github.com/simiancraft/google-mcp-suite/commit/5f6bbd2e7df856137aef95d8104715741956cd91))
* **gmail:** compose messages with mail-mime-builder ([b87cd43](https://github.com/simiancraft/google-mcp-suite/commit/b87cd433ef37f43ae41ecfce86cac40ef9083fa6))
* **gmail:** generate CAPABILITIES.md and document the tool surface ([7210300](https://github.com/simiancraft/google-mcp-suite/commit/7210300c12b5eddef2c8a37422875ec397dbbdf6))
* **gmail:** project sender and recipients as structured EmailAddress ([6644648](https://github.com/simiancraft/google-mcp-suite/commit/6644648a4b12177845f985b1be727f089da3aed7))
* **gmail:** scaffold the service shell ([8dabeee](https://github.com/simiancraft/google-mcp-suite/commit/8dabeee8738dd3f546db4fdd080ef7ad7a1ba21b))
* **gmail:** tighten zod on forwarding address and label colors ([1cb1c65](https://github.com/simiancraft/google-mcp-suite/commit/1cb1c6559afc2eadd0f6adf6ebc568070bae3285))
* **harness:** add shared tool factory and server ([ae9a2bf](https://github.com/simiancraft/google-mcp-suite/commit/ae9a2bfbbb31b527ffd92cc6d7ecfd008da6cfd6))
* **harness:** render a registry as a Markdown capability table ([11b4a7b](https://github.com/simiancraft/google-mcp-suite/commit/11b4a7b736f8dd66c9708fa08e3ca08e2f28472b))
* **lib:** add a Source column to the capability table ([8fa201b](https://github.com/simiancraft/google-mcp-suite/commit/8fa201b9256872cb5688359080cad9c0919f77db))
* **lib:** add Optional type and the forGoogle boundary adapter ([fc56f1b](https://github.com/simiancraft/google-mcp-suite/commit/fc56f1bcf16d2f1ee08ed969374404c80c2d178c))
* **lib:** reject duplicate wire names when merging operations ([947a06f](https://github.com/simiancraft/google-mcp-suite/commit/947a06ff45fb276ccd42b16ce5a95df3a02b7f80))


### Performance Improvements

* **gmail:** bound list fan-out (fix eager over-fetch) ([3c66f47](https://github.com/simiancraft/google-mcp-suite/commit/3c66f479341310854aa95d4ae4ab2ea7315108b4))
* **gmail:** memoize sender address per client (no dataloader) ([2d41ea5](https://github.com/simiancraft/google-mcp-suite/commit/2d41ea55cac025b4dd6a9be99c58ac70181caec9))
