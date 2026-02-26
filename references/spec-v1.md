# Agent Contract Spec v1

## Layered schemas

- `agent-contract.v1.schema.json` — top-level delivery/lifecycle contract
- `behavior-contract.v1.schema.json` — behavior/prompt contract
- `io-contract.v1.schema.json` — tool/API I/O contract
- `defs.lifecycle.json`, `defs.common.json` — shared definitions

## Agent contract required fields

- `contractVersion` (`1.0.0`)
- `id` (`ac-...` slug)
- `title`
- `objective`
- `scope.in`, `scope.out`
- `deliverables[]` (`name`, `path`, `owner`)
- `constraints[]`
- `acceptanceCriteria[]`
- `verification.commands[]`, `verification.successSignal`
- `handoff.owner`, `handoff.channel`
- `lifecycle.status`

Optional composite sections:
- `behaviorContract` (must satisfy behavior schema)
- `ioContract` (must satisfy io schema)

## Behavior contract required fields

- `role`
- `objective`
- `guardrails[]`
- `escalation.when[]`, `escalation.action`
- `outputContract.format`, `outputContract.requiredSections[]`
- `toolsUsed[]`

## I/O contract required fields

- `tools[]`
- Per tool: `name`, `inputSchema`, `outputSchema`, `errorSchema`, `policy`
- Policy: `timeoutMs`, `retry.maxAttempts`, `retry.backoff`, `retry.idempotent`

## Lifecycle statuses

`draft`, `ready`, `in_progress`, `blocked`, `in_review`, `approved`, `rejected`, `done`, `cancelled`

## Transition rules

When `lifecycle.transition` is present, it must be one allowed pair:

- `draft -> ready | cancelled`
- `ready -> in_progress | cancelled`
- `in_progress -> blocked | in_review | cancelled`
- `blocked -> in_progress | cancelled`
- `in_review -> approved | rejected`
- `rejected -> in_progress | cancelled`
- `approved -> done`

Additionally, if `transition` exists, `transition.to` must match `lifecycle.status`.

## Cross-link rules

When both `behaviorContract` and `ioContract` are present in a contract file:

- Every entry in `behaviorContract.toolsUsed[]` must exist in `ioContract.tools[].name`.
- Violations are reported as `CROSS_LINK` errors by `npm run validate`.
