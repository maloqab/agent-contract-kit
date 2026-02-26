# Changelog

## 1.1.0 - 2026-02-26

- Added layered composition schemas:
  - `behavior-contract.v1.schema.json`
  - `io-contract.v1.schema.json`
  - `defs.lifecycle.json`
- Updated `agent-contract.v1.schema.json` to compose behavior + io sections
- Added generator profile support:
  - backward-compatible default contract generation
  - new `--profile both` (plus `behavior` and `io`)
- Added integrated cross-link validation in `npm run validate`
  - validates behavior `toolsUsed[]` against io `tools[].name`
- Added behavior/io valid+invalid example coverage
- Added invalid cross-link contract example
- Updated docs/spec/acceptance references for layered v1 scope

## 1.0.0 - 2026-02-26

- Initial v1 release
- Added YAML templates (`minimal`, `full`)
- Added JSON Schema validation (`agent-contract.v1.schema.json`)
- Enforced lifecycle transition rules
- Added generator CLI (`new-contract.mjs`)
- Added validation CLI (`validate-contracts.mjs`)
- Added valid and invalid examples
- Added docs and quickstart
