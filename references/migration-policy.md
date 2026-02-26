# Migration Policy

## Versioning

- v1 schema file is immutable once released except for critical bug fixes.
- Breaking changes require a new schema file (`agent-contract.v2.schema.json`).

## Forward compatibility

- Keep old validators in place while introducing new versions.
- Migrate templates and examples per version directory if needed.

## Deprecation

- Announce deprecation windows in `CHANGELOG.md`.
- Keep at least one prior version validator available during migration.
