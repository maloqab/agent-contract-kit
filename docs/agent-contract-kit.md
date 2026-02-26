# Agent Contract Kit - Build Brief (v1)

## Purpose

Provide a reusable, implementation-ready contract format for agent task handoff with machine validation.

## Implemented approach

Option 2 (layered composition):
- YAML templates
- Layered JSON Schema (`agent` + `behavior` + `io`)
- CLI generator + integrated validator

This keeps v1 lightweight while enforcing structure and cross-contract consistency.

## Scope included

- Templates (`minimal`, `full`, `behavior`, `io`)
- Lifecycle transition enforcement
- Behavior/prompt contract validation
- Tool/API I/O contract validation
- Cross-link validation (behavior tool refs must map to io tool defs)
- Backward-compatible generator UX + new `--profile both`
- Valid/invalid coverage across contract/behavior/io
- Packaging + docs

## Repo paths

- Kit root: `/Users/jarvisz/clawd/skills/agent-contract-kit/`
- Companion doc: `/Users/jarvisz/clawd/docs/agent-contract-kit.md`

## Command UX (fresh clone)

```bash
cd /Users/jarvisz/clawd/skills/agent-contract-kit
npm install
npm run new -- --name sample-contract --profile both
npm run validate
```

Backward-compatible flow still works:

```bash
npm run new -- --name sample-contract
```

## Validation contract

`npm run validate` guarantees:

1. All `*.valid.yaml` are valid
2. All `contract.invalid.*`, `behavior.invalid.*`, `io.invalid.*` are invalid
3. Cross-link checks run inside the same command (no manual extra step)
4. Any unexpected outcome returns non-zero
5. Failures print per-file errors

## Lifecycle policy (enforced)

Allowed transitions:

- `draft -> ready | cancelled`
- `ready -> in_progress | cancelled`
- `in_progress -> blocked | in_review | cancelled`
- `blocked -> in_progress | cancelled`
- `in_review -> approved | rejected`
- `rejected -> in_progress | cancelled`
- `approved -> done`

Also enforced: when transition is present, `lifecycle.status` must equal `transition.to`.
