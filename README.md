# Agent Contract Kit (v1)

Agent Contract Kit gives teams a *shared contract language* for AI-agent delivery work:
- behavior/prompt expectations
- tool/API input-output guarantees
- lifecycle and handoff rules

It combines YAML templates with layered JSON Schema validation so teams can catch contract ambiguity and tool mismatches *before* execution.

## Developer use cases (who / when / outcome)

| Who | When | Outcome |
|---|---|---|
| Orchestrators / tech leads | Delegating multi-step implementation work to coding agents | Every task has explicit scope, acceptance criteria, lifecycle status, and handoff owner |
| Agent builders | Defining what an agent may do and how it should respond | Behavior contract prevents prompt/behavior drift across tasks |
| Platform / tooling engineers | Integrating tools/APIs used by agents | I/O contract makes input/output/error expectations explicit and machine-validated |
| Reviewers / QA | Verifying task readiness before implementation/release | One validation command catches structural, lifecycle, and cross-link errors early |

## The concrete pain this solves

Without a contract kit, teams usually hit the same failure modes:

1. *Ambiguous briefs* — tasks move forward with unclear scope and weak acceptance criteria.
2. *Behavior drift* — agents answer differently depending on who authored the prompt.
3. *Tool mismatch* — behavior references tools that are not actually defined in I/O specs.
4. *Late failure discovery* — lifecycle/status and schema issues are found during review or execution, not at authoring time.

This kit standardizes authoring and validates those failure points up front.

## Why this improves developer workflow

### Time
- Scaffold contracts in seconds (`npm run new ...`) instead of rewriting boilerplate.
- Validate all examples/contracts with one command (`npm run validate`).

### Risk
- Enforces lifecycle transitions (no illegal `draft -> done` jumps).
- Enforces cross-links (behavior `toolsUsed[]` must exist in io `tools[].name`).
- Returns non-zero with per-file errors for CI-safe gating.

### Consistency
- One contract shape shared across orchestrator, coder, reviewer workflows.
- Repeatable valid/invalid examples make expected behavior explicit.

## When *not* to use this kit

Do *not* use Agent Contract Kit when:

- You’re doing a one-off personal spike/prototype with no handoff requirements.
- You only need a lightweight checklist (no schema validation needed).
- You need runtime policy enforcement (this kit validates contract *definitions*, not runtime sandbox/security execution).

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
