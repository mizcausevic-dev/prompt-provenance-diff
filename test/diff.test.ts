import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { diffProvenance } from "../src/diff.js";
import { toMarkdown, toSummary } from "../src/format.js";
import type { ProvenanceDoc } from "../src/types.js";

const here = fileURLToPath(new URL(".", import.meta.url));

function load(name: string): ProvenanceDoc {
  return JSON.parse(readFileSync(`${here}/../fixtures/${name}`, "utf8")) as ProvenanceDoc;
}

describe("diffProvenance", () => {
  it("reports no changes when comparing a document to itself", () => {
    const doc = load("previous.json");
    const diff = diffProvenance(doc, doc);
    expect(diff.changes).toHaveLength(0);
    expect(diff.breaking).toBe(false);
    expect(toMarkdown(diff)).toContain("No changes");
    expect(toSummary(diff)).toBe("no changes");
  });

  it("flags a tuned version as breaking on hash + lineage", () => {
    const diff = diffProvenance(load("previous.json"), load("next-tuned.json"));
    const reasons = diff.changes.map((c) => c.reason);
    expect(reasons).toContain("prompt-hash-changed");
    expect(reasons).toContain("prompt-version-changed");
    expect(reasons).toContain("lineage-parent-added");
    expect(reasons).toContain("authorship-reviewer-added");
    expect(reasons).toContain("evaluation-added");
    expect(reasons).toContain("evaluation-removed");
    expect(reasons).toContain("prompt-content-uri-changed");
    expect(diff.breaking).toBe(true);
    expect(toSummary(diff)).toMatch(/^BREAKING /);
  });

  it("flags revocation as approval-state-regressed (BREAKING)", () => {
    const diff = diffProvenance(load("previous.json"), load("next-revoked.json"));
    const reasons = diff.changes.map((c) => c.reason);
    expect(reasons).toContain("approval-state-regressed");
    expect(diff.breaking).toBe(true);
    const md = toMarkdown(diff);
    expect(md).toContain("**BREAKING**");
    expect(md).toContain("Approval state regressed");
    expect(md).toContain("approved → revoked");
  });

  it("treats deprecation as a regression (consumers must stop using)", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.approval.state = "deprecated";
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("approval-state-regressed");
    expect(diff.breaking).toBe(true);
  });

  it("treats draft → approved as approval-state-advanced (non-breaking)", () => {
    const prev = load("previous.json");
    const draft = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    draft.approval.state = "draft";
    const diff = diffProvenance(draft, prev);
    expect(diff.changes.map((c) => c.reason)).toContain("approval-state-advanced");
    expect(diff.breaking).toBe(false);
  });

  it("treats approved → draft as approval-state-regressed (BREAKING)", () => {
    const prev = load("previous.json");
    const draft = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    draft.approval.state = "draft";
    const diff = diffProvenance(prev, draft);
    expect(diff.changes.map((c) => c.reason)).toContain("approval-state-regressed");
    expect(diff.breaking).toBe(true);
  });

  it("flags lineage parent change as breaking", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    prev.lineage = { parent: "old@1.0.0" };
    next.lineage = { parent: "new@1.0.0" };
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("lineage-parent-changed");
    expect(diff.breaking).toBe(true);
  });

  it("flags out-of-scope changes as breaking", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.intent!.out_of_scope = ["root-cause analysis"];
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("intent-out-of-scope-changed");
    expect(diff.breaking).toBe(true);
  });

  it("flags non-breaking metadata changes (purpose, in-scope, models, policy URI, derivation)", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.intent!.purpose = "different purpose";
    next.intent!.in_scope = ["one only"];
    next.intent!.models_supported = ["claude-opus-4-*"];
    next.approval.policy_uri = "https://policy.example.com/v3";
    next.lineage = { parent: prev.lineage?.parent, derivation: "added derivation note" };
    next.prompt.content_type = "text/markdown";
    const diff = diffProvenance(prev, next);
    const reasons = diff.changes.map((c) => c.reason);
    expect(reasons).toContain("intent-purpose-changed");
    expect(reasons).toContain("intent-in-scope-changed");
    expect(reasons).toContain("intent-models-supported-changed");
    expect(reasons).toContain("approval-policy-changed");
    expect(reasons).toContain("lineage-derivation-changed");
    expect(reasons).toContain("prompt-content-type-changed");
    expect(diff.breaking).toBe(false);
  });

  it("flags lineage parent added / removed independently", () => {
    const prev = load("previous.json");
    const withParent = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    withParent.lineage = { parent: "ancestor@0.9.0" };
    expect(diffProvenance(prev, withParent).changes.map((c) => c.reason)).toContain("lineage-parent-added");
    expect(diffProvenance(withParent, prev).changes.map((c) => c.reason)).toContain("lineage-parent-removed");
  });

  it("flags authorship changes for created_by and approved_by", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.authorship.created_by = "new@example.com";
    next.authorship.approved_by = "different-approver@example.com";
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("authorship-created-by-changed");
    expect(diff.changes.map((c) => c.reason)).toContain("authorship-approved-by-changed");
  });

  it("flags reviewer removal", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.authorship.reviewed_by = [];
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("authorship-reviewer-removed");
  });

  it("flags evaluation result changes (passed or score)", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.evaluations![0].passed = false;
    next.evaluations![0].score = 0.3;
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("evaluation-result-changed");
  });

  it("flags provenance-version-changed as breaking", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.provenance_version = "0.2";
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("provenance-version-changed");
    expect(diff.breaking).toBe(true);
  });

  it("flags prompt-id-changed as breaking", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.prompt.id = "incident-summary-v2";
    const diff = diffProvenance(prev, next);
    expect(diff.changes.map((c) => c.reason)).toContain("prompt-id-changed");
    expect(diff.breaking).toBe(true);
  });

  it("throws on malformed documents", () => {
    expect(() => diffProvenance(null as unknown as ProvenanceDoc, load("previous.json"))).toThrow();
    expect(() => diffProvenance(load("previous.json"), {} as ProvenanceDoc)).toThrow();
    expect(() => diffProvenance({ prompt: {} } as unknown as ProvenanceDoc, load("previous.json"))).toThrow();
    expect(() => diffProvenance(
      { prompt: { id: "a", version: "1", hash: "sha256:x" }, approval: { state: "draft" } } as unknown as ProvenanceDoc,
      load("previous.json")
    )).toThrow(/authorship/);
  });

  it("renders Markdown table with reason labels", () => {
    const diff = diffProvenance(load("previous.json"), load("next-tuned.json"));
    const md = toMarkdown(diff);
    expect(md).toContain("| change | detail |");
    expect(md).toContain("Prompt content hash changed");
    expect(md).toContain("Lineage parent added");
  });

  it("toSummary uses singular vs plural", () => {
    const prev = load("previous.json");
    const next = JSON.parse(JSON.stringify(prev)) as ProvenanceDoc;
    next.prompt.version = "1.0.1";
    expect(toSummary(diffProvenance(prev, next))).toBe("1 change");
    next.approval.policy_uri = "https://policy.example.com/v3";
    expect(toSummary(diffProvenance(prev, next))).toBe("2 changes");
  });
});
