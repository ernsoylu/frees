---
name: ss2ss
category: Control Systems
summary: Similarity transform x = P·z
related: []
examples: []
tags: [ss2ss, control]
references: []
generated: true
---

# ss2ss

Similarity transform x = P·z

> **Auto-generated** from the function registry. The syntax, description, and arguments are taken directly from the implementation; a worked example and an expanded mathematical derivation are added as the page is curated.

## Syntax

```
CALL ss2ss(A,B,C,D,P : An,Bn,Cn,Dn)
```

## Description

Similarity transform x = P·z Invoked as a `CALL` with the listed inputs and outputs.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Numeric argument. |
| `B` | Number | Yes | Numeric argument. |
| `C` | Number | Yes | Numeric argument. |
| `D` | Number | Yes | Numeric argument. |
| `P` | Number | Yes | Numeric argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `An` | Number/Array | Output value. |
| `Bn` | Number/Array | Output value. |
| `Cn` | Number/Array | Output value. |
| `Dn` | Number/Array | Output value. |

## References

1. Nise, N.S., Control Systems Engineering (7th ed.).
2. Ogata, K., Modern Control Engineering (5th ed.).

