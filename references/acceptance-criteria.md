# Acceptance Criteria (v1)

A v1 implementation is accepted when all are true:

1. Layered schemas validate:
   - top-level contract structure
   - behavior/prompt contract structure
   - tool/API I/O contract structure
2. Lifecycle transition rules are enforced (not status enum-only).
3. `npm run validate`:
   - passes all `*.valid.yaml`
   - fails all `contract.invalid.*`, `behavior.invalid.*`, `io.invalid.*`
   - includes cross-link checks inside the same command
   - returns non-zero on unexpected validation outcomes
   - prints per-file errors on failures
4. Fresh clone quickstart works in 3 commands:
   - `npm install`
   - `npm run new -- --name <name> --profile both`
   - `npm run validate`
5. Backward compatibility is preserved for existing UX:
   - `npm run new -- --name <name>` still works.
6. Generator writes valid scaffold(s) under `contracts/`.
