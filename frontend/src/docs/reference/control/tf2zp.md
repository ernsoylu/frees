---
name: tf2zp
category: Control Systems
summary: Transfer function → zero-pole-gain
related: []
examples: []
tags: [tf2zp, control]
references: []
generated: true
---

# tf2zp

Transfer function → zero-pole-gain

> **Auto-generated** from the function registry. The syntax, description, and arguments are taken directly from the implementation; a worked example and an expanded mathematical derivation are added as the page is curated.

## Syntax

```
CALL tf2zp(num, den : zr, zi, pr, pi, k)
```

## Description

Transfer function → zero-pole-gain Invoked as a `CALL` with the listed inputs and outputs.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Number | Yes | Numeric argument. |
| `den` | Number | Yes | Numeric argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `zr` | Number/Array | Output value. |
| `zi` | Number/Array | Output value. |
| `pr` | Number/Array | Output value. |
| `pi` | Number/Array | Output value. |
| `k` | Number/Array | Output value. |

## References

1. Nise, N.S., Control Systems Engineering (7th ed.).
2. Ogata, K., Modern Control Engineering (5th ed.).

