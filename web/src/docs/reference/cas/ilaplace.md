---
name: ilaplace
category: CAS (REPL)
summary: Symbolic ilaplace (REPL-only Rust CAS operation).
related: []
examples: []
tags: [ilaplace, cas, symbolic, repl]
references: []
---

# ilaplace

Symbolic computer-algebra operation **ilaplace**, available in the REPL terminal (Rust CAS backend; solve a document first).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
ilaplace(expr)
```

## Description

A REPL-only symbolic transform — it operates on an algebraic expression rather than a solved numeric value, so it is not available in the editor document body.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Transform an engineering expression in the REPL

Solve the setup document in the editor, then enter the expression in the REPL. This JSON request records both steps for automated verification.

```json
{
  "operation": "repl_evaluate",
  "text": "setup = 1",
  "expression": "ilaplace(1/(s+2),s,t)",
  "expectedText": "E^((-2)*t)"
}
```

Expected REPL output:

```text
E^((-2)*t)
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `expr` | Number | Yes | Expression to evaluate. |
