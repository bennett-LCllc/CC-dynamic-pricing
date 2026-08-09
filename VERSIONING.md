# Versioning Policy for CC Ops

## Overview
This document describes the versioning strategy for the CC Ops monorepo, covering API versioning, package versioning, and deprecation timelines.

## Version Numbering
- **Major version** (`X.0.0`): Incompatible API changes.
- **Minor version** (`0.Y.0`): Backward‑compatible feature additions.
- **Patch version** (`0.0.Z`): Bug fixes and non‑breaking updates.

## Current Version
- **API version (OpenAPI spec)**: 1.0.0
- **Package versions** (`@cc-ops/api-node`, `@cc-ops/web`, etc.): 1.0.0

## API Versioning
- All public API routes are prefixed with `/api/v1`. Future major versions will use `/api/v2`, `/api/v3`, etc.
- Backward compatibility is maintained during major version transitions via dual‑routing (old and new prefixes) for a deprecation period.

## Deprecation Schedule
| Current Version | Deprecation Date | End‑of‑Life |
|----------------|------------------|------------|
| 1.0.0 (initial) | 2026‑10‑01 | 2027‑04‑01 (full removal) |

> **Note:** Deprecation dates may be extended at the team's discretion.

## Migration Process
1. **Feature Freeze**: Two weeks before a major version bump, freeze new feature merges.
2. **Release Candidate**: Publish a RC tag and update documentation.
3. **Migration Guide**: Provide a detailed guide in `MIGRATION.md`.
4. **Monitoring**: Enable deprecation warnings in production logs.

## Version Management Scripts
- `npm version`: Standard version bump tool.
- `./scripts/bump-version.ts`: Custom script for monorepo version alignment.

## Version Control
- All version bumps must be accompanied by a Git tag (`vX.Y.Z`).
- Tags are annotated and pushed to `origin` with the pattern `git tag -a vX.Y.Z -m "Release X.Y.Z"` followed by `git push origin vX.Y.Z`.

## Version Audit
Quarterly audits will verify that:
- Package `version` fields match the documented version.
- OpenAPI `info.version` matches the package version.
- Documentation reflects the current versioning policy.

---  
*Maintained by the CC Ops team. Last updated: 2026‑08‑07.*