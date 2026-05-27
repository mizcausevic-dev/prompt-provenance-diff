# Changelog

## v0.1.0 — 2026-05-26

- Initial release: `diffProvenance(prev, next, opts?)` → classified diff of two prompt-provenance documents.
- 24 change reasons across 7 dimensions (envelope, prompt, lineage, approval, authorship, intent, evaluations).
- 6 breaking reasons: `provenance-version-changed`, `prompt-id-changed`, `prompt-hash-changed`, `approval-state-regressed`, `lineage-parent-changed`, `intent-out-of-scope-changed`.
- Approval-state machine (`draft → proposed → approved`; terminal `deprecated` / `revoked`) — moves to `deprecated` or `revoked` always classify as `approval-state-regressed` (breaking, consumers must stop using).
- Formatters: `toMarkdown(diff)` (with reason labels) and `toSummary(diff)`.
- CLI: `prompt-provenance-diff <previous.json> <next.json>` with `--format json|markdown|summary`, `--strict`, `--out FILE`.
- 4 fixtures: `previous.json` baseline, `next-tuned.json` (breaking — hash + version + lineage), `next-revoked.json` (breaking — approval revoked), `next-nonbreaking.json` (informational changes only).
- Sibling of `agent-card-diff`, `mcp-tool-card-diff`, and `evidence-bundle-diff` — same shape across A2A / MCP / evidence / prompt sides of the Kinetic Gain Suite.
- Node 20/22 CI (lint, typecheck, coverage, build, demo, `npm audit`), AGPL-3.0-or-later, Dependabot.
