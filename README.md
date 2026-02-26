# Agent Contract Kit (v1)

YAML templates + layered JSON Schema validation for implementation-ready agent contracts.

## What this ships

- Layered schemas
  - `agent-contract.v1.schema.json` (top-level contract)
  - `behavior-contract.v1.schema.json` (behavior/prompt contract)
  - `io-contract.v1.schema.json` (tool/API input-output contract)
  - `defs.lifecycle.json` + `defs.common.json` (shared defs)
- Lifecycle transition enforcement (legal from → to moves)
- Generator CLI (`npm run new`) with backward-compatible UX
- Validation CLI (`npm run validate`) with integrated cross-link checks
- Valid + invalid examples across contract/behavior/io coverage

## Fresh clone: 3-command flow

```bash
npm install
npm run new -- --name sample-contract --profile both
npm run validate
```

> Backward compatibility is preserved:
>
> ```bash
> npm run new -- --name sample-contract
> ```

## Validate behavior

`npm run validate` guarantees:
- PASS all `*.valid.yaml`
- EXPECTED_FAIL all `contract.invalid.*`, `behavior.invalid.*`, `io.invalid.*`
- PASS generated/user files in `contracts/`
- Enforce cross-links for contract files (behavior `toolsUsed[]` must exist in io `tools[].name`)
- Return non-zero with per-file errors for unexpected outcomes

## Commands

```bash
# Existing UX (unchanged)
npm run new -- --name my-contract

# Layered profile generation
npm run new -- --name my-contract --profile both
npm run new -- --name behavior-only --profile behavior
npm run new -- --name io-only --profile io

# Optional full contract template
npm run new -- --name release-gate --template full

# Validate
npm run validate
npm run validate -- --contracts-dir contracts --examples-dir examples
```

## Lifecycle transitions (enforced)

Allowed transitions:
- `draft -> ready | cancelled`
- `ready -> in_progress | cancelled`
- `in_progress -> blocked | in_review | cancelled`
- `blocked -> in_progress | cancelled`
- `in_review -> approved | rejected`
- `rejected -> in_progress | cancelled`
- `approved -> done`

Also enforced: when a transition is present, `lifecycle.status` must match `transition.to`.

## Structure

```text
agent-contract-kit/
  schemas/
  templates/
  examples/
  scripts/
  contracts/
  references/
```
