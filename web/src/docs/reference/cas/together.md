---
name: together
category: CAS (REPL)
summary: Symbolic together (REPL-only Rust CAS operation).
related: []
examples: []
tags: [together, cas, symbolic, repl]
references: []
---

# together

Symbolic computer-algebra operation **together**, available in the REPL terminal (Rust CAS backend; solve a document first).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
together(expr)
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
  "expression": "together(1/x + 1/(x+1))",
  "expectedText": "(1+2*x)/(x*(1+x))"
}
```

Expected REPL output:

```text
(1+2*x)/(x*(1+x))
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `expr` | Number | Yes | Expression to evaluate. |
