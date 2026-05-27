# prompt-provenance-diff

[![CI](https://github.com/mizcausevic-dev/prompt-provenance-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/prompt-provenance-diff/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)

Diff two **prompt-provenance** JSON documents (per [prompt-provenance-spec v0.1](https://github.com/mizcausevic-dev/prompt-provenance-spec)) and surface a **breaking-change flag** for downstream consumers.

Sibling of [`agent-card-diff`](https://github.com/mizcausevic-dev/agent-card-diff), [`mcp-tool-card-diff`](https://github.com/mizcausevic-dev/mcp-tool-card-diff), and [`evidence-bundle-diff`](https://github.com/mizcausevic-dev/evidence-bundle-diff). Same shape, same vibe.

Part of the [Kinetic Gain Suite](https://suite.kineticgain.com/).

---

## Why

A prompt's `provenance.json` is the contract between a prompt registry and every downstream consumer (RAG pipeline, agent, evaluation harness). When the prompt is re-released, downstream consumers need to know **what specifically changed** and whether the change invalidates prior assumptions. A `prompt-hash-changed` or `approval-state-regressed → revoked` event is a **breaking** signal that should block deploys until re-evaluated; a `lineage-derivation-changed` note is informational.

This tool classifies every change in 24 reasons across 7 dimensions:

| dimension | reasons |
|---|---|
| envelope | `provenance-version-changed` |
| prompt | `prompt-id-changed`, `prompt-version-changed`, `prompt-hash-changed`, `prompt-content-uri-changed`, `prompt-content-type-changed` |
| lineage | `lineage-parent-added`, `lineage-parent-removed`, `lineage-parent-changed`, `lineage-derivation-changed` |
| approval | `approval-state-advanced`, `approval-state-regressed`, `approval-policy-changed` |
| authorship | `authorship-created-by-changed`, `authorship-approved-by-changed`, `authorship-reviewer-added`, `authorship-reviewer-removed` |
| intent | `intent-purpose-changed`, `intent-in-scope-changed`, `intent-out-of-scope-changed`, `intent-models-supported-changed` |
| evaluations | `evaluation-added`, `evaluation-removed`, `evaluation-result-changed` |

## Breaking reasons

These reasons set `diff.breaking = true` and the CLI exits `1`:

- `provenance-version-changed` — schema bump, consumers may not parse
- `prompt-id-changed` — identity changed; this is a different prompt
- `prompt-hash-changed` — content rewritten, prior evals don't apply
- `approval-state-regressed` — either backwards in the approval state machine, OR moved to `deprecated` / `revoked`. Consumers must stop using.
- `lineage-parent-changed` — derivation chain rewritten
- `intent-out-of-scope-changed` — guardrail surface changed

## CLI

```bash
prompt-provenance-diff previous.json next.json [--format json|markdown|summary] [--strict] [--out FILE]
```

Exit codes:

- `0` — no changes OR only non-breaking changes
- `1` — diff is breaking (or `--strict` and any change exists)
- `2` — usage / I/O error or malformed document

## Library API

```ts
import { diffProvenance, toMarkdown, toSummary } from "prompt-provenance-diff";
import type { ProvenanceDoc } from "prompt-provenance-diff";

const prev: ProvenanceDoc = JSON.parse(readFileSync("v1.json", "utf8"));
const next: ProvenanceDoc = JSON.parse(readFileSync("v2.json", "utf8"));

const diff = diffProvenance(prev, next);
console.log(diff.breaking, diff.changes.length, diff.evaluations);
console.log(toMarkdown(diff));
```

## License

[AGPL-3.0-or-later](LICENSE)
