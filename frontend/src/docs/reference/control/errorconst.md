---
name: errorconst
category: Control Systems
summary: Static error constants Kp, Kv, Ka
related: []
examples: []
tags: [errorconst, control]
references: []
generated: true
---

# errorconst

Static error constants Kp, Kv, Ka

> **Auto-generated** from the function registry. The syntax, description, and arguments are taken directly from the implementation; a worked example and an expanded mathematical derivation are added as the page is curated.

## Syntax

```
CALL errorconst(num, den : Kp, Kv, Ka)
```

## Description

Static error constants Kp, Kv, Ka Invoked as a `CALL` with the listed inputs and outputs.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Number | Yes | Numeric argument. |
| `den` | Number | Yes | Numeric argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Kp` | Number/Array | Output value. |
| `Kv` | Number/Array | Output value. |
| `Ka` | Number/Array | Output value. |

## References

1. Nise, N.S., Control Systems Engineering (7th ed.).
2. Ogata, K., Modern Control Engineering (5th ed.).

