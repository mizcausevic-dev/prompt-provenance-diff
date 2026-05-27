# Security Policy

`prompt-provenance-diff` is a pure-transform library and CLI: it reads two JSON files and emits structured diff output. No network listener, no remote fetch, no execution of user-supplied code.

The input may include internal prompt content URIs, evaluation result URIs, and approver identities that are sensitive in your environment. The diff output includes those values verbatim — be deliberate about where you publish the rendered diff (e.g., consider redacting before posting to public PR comments).

## Supported versions

Only the latest tagged release is supported.

## Reporting a vulnerability

Please use GitHub Security Advisories for private disclosure:

- [Open a security advisory](https://github.com/mizcausevic-dev/prompt-provenance-diff/security/advisories/new)

Do not file public issues for security reports.
