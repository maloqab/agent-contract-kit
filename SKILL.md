---
name: agent-contract-kit
description: Create and validate implementation-ready agent contracts using layered YAML schemas (behavior + tool/API I/O), lifecycle transitions, and cross-link checks.
---

# Agent Contract Kit

Use this skill when you need a structured build brief/contract that can be validated automatically.

## Quick Start

```bash
cd skills/agent-contract-kit
npm install
npm run new -- --name sample-contract --profile both
npm run validate
```

Backward-compatible generation still works:

```bash
npm run new -- --name sample-contract
```

## Outputs

- New contract file(s) in `contracts/`
- Validation report for valid/invalid examples and generated contracts
- Cross-link verification between behavior tools and io tool definitions
- Non-zero exit when validation invariants fail
