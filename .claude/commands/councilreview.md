# Multi-Expert Council Review

You are a panel of 5 independent expert reviewers. Each expert analyzes the same diff but from their specialized perspective. Experts do not coordinate -- they review independently and may contradict each other.

## Step 1: Get the diff

Run `git diff HEAD~1` to get the changes from the last commit. If on a feature branch, use `git diff main...HEAD` instead.

Read the full diff. Then read the complete file for every changed file (not just the diff context).

## Step 2: Run 5 independent expert reviews

### Expert 1: Security Architect

Focus areas:
- Attack surface changes -- new endpoints, new user inputs, new external data flows
- Authentication and authorization -- bypasses, missing checks, privilege escalation
- Cryptographic usage -- weak algorithms, static keys, improper random generation
- Injection vectors -- SQL, NoSQL, command, SSRF, XSS, path traversal, URL injection
- Secrets management -- hardcoded credentials, secrets in logs, keys in error responses
- OWASP Top 10 applicability to this change
- For this project: x402/MPP payment bypass, escrow integrity, API key handling (SHA-256 hashed), MCP protocol auth

Output 1-3 findings. Each finding must have severity (CRITICAL/HIGH/MEDIUM/LOW), the file and line, the issue, and a concrete fix.

Verdict: PASS / CONCERN / BLOCK

---

### Expert 2: Performance Engineer

Focus areas:
- Latency impact -- new synchronous operations in hot paths, blocking I/O
- Throughput -- N+1 queries, unbounded result sets, missing pagination
- Memory -- leaks (uncleaned listeners, growing maps), large allocations per request
- Scaling bottlenecks -- single-threaded locks, global state, connection pool exhaustion
- Caching -- missing cache for expensive operations, incorrect TTL, cache invalidation bugs
- Database -- missing indexes, full table scans, unoptimized JOIN patterns
- For this project: Redis single-flight dedup, per-tool cache TTL, Prisma connection pool limits (API: 20, Worker: 10), provider timeout 10s, max response 1MB

Output 1-3 findings with severity, file:line, issue, fix.

Verdict: PASS / CONCERN / BLOCK

---

### Expert 3: Reliability Engineer

Focus areas:
- Failure modes -- what happens when this code fails? Crash? Silent corruption? Retry storm?
- Error recovery -- are errors caught, classified, and handled appropriately?
- Graceful degradation -- does a non-critical failure take down the whole request?
- Timeout handling -- external calls without timeouts, missing circuit breakers
- Idempotency -- is the operation safe to retry? Are side effects guarded?
- State consistency -- partial writes, missing transactions, orphaned resources
- For this project: 13-stage pipeline invariants, fail-closed on Redis failure, escrow + ledger write in single PG transaction, idempotency key enforcement, graceful shutdown sequence

Output 1-3 findings with severity, file:line, issue, fix.

Verdict: PASS / CONCERN / BLOCK

---

### Expert 4: API Designer

Focus areas:
- Contract stability -- does this change break existing clients?
- Backward compatibility -- removed fields, changed types, new required parameters
- Response consistency -- does the new endpoint follow the same shape as existing ones?
- Validation -- are inputs validated with clear error messages? Do errors include expected vs received?
- Documentation -- are new endpoints/tools discoverable? Are schemas updated?
- Developer experience -- can a consumer figure out how to use this without reading source code?
- For this project: MCP tool naming (3-level mcpName), Zod schema .describe() on every field, tool-definitions.ts annotations, server-card.json sync, OpenAPI spec sync

Output 1-3 findings with severity, file:line, issue, fix.

Verdict: PASS / CONCERN / BLOCK

---

### Expert 5: Domain Expert (MCP Gateway / Fintech / Crypto Payments)

This expert understands the specific business domain of this project: a unified MCP gateway for AI agents with x402 USDC micropayments, 150+ upstream API providers, and a 13-stage request pipeline.

Focus areas:
- Business logic correctness -- pricing calculations, escrow flow, ledger entries
- Edge cases specific to this domain -- provider API downtime, partial responses, rate limit exhaustion
- Regulatory compliance -- append-only ledger, no double-charging, financial audit trail
- Agent interaction patterns -- will an AI agent understand the error? Can it self-correct?
- Provider integration correctness -- auth method matches upstream docs, response normalization preserves data
- Pipeline invariants -- stage order (AUTH through RESPONSE), escrow before provider call, refund on failure
- Payment integrity -- cache hit billing (direct charge, no escrow), idempotency prevents duplicate charges
- Tool catalog consistency -- tool counts match across homepage/README/discovery files/server-card.json

Output 1-3 findings with severity, file:line, issue, fix.

Verdict: PASS / CONCERN / BLOCK

---

## Step 3: Council Summary

After all 5 expert reviews, output:

```
===================================================================
COUNCIL SUMMARY
===================================================================

Votes:
  Security Architect:    [PASS|CONCERN|BLOCK]
  Performance Engineer:  [PASS|CONCERN|BLOCK]
  Reliability Engineer:  [PASS|CONCERN|BLOCK]
  API Designer:          [PASS|CONCERN|BLOCK]
  Domain Expert:         [PASS|CONCERN|BLOCK]

Council Decision: [APPROVE | APPROVE WITH CONDITIONS | REQUEST CHANGES | BLOCK]

Critical items (must fix before merge):
  - [list or "None"]

Conditions (should fix, not blocking):
  - [list or "None"]
```

Decision rules:
- Any expert votes BLOCK = Council Decision is BLOCK
- 2+ experts vote CONCERN = Council Decision is REQUEST CHANGES
- 1 expert votes CONCERN = Council Decision is APPROVE WITH CONDITIONS
- All experts vote PASS = Council Decision is APPROVE

## Operating rules

- Each expert is independent. They do not see each other's findings.
- Experts may find the same issue from different angles -- that is fine, it reinforces severity.
- Do NOT soften findings to reach consensus. Disagreement between experts is valuable signal.
- Do NOT praise the code. Only report problems and concerns.
- If an expert finds zero issues, they vote PASS and state "No issues found in my domain."
- For BLOCK votes, the expert must cite a specific CRITICAL or HIGH finding that justifies the block.
- Read the FULL file for context, not just the diff. Many domain-specific bugs require understanding the surrounding architecture.
