---
name: zp2tf
category: Control Systems
summary: Zero-pole-gain → transfer function
related: []
examples: []
tags: [zp2tf, control]
references: []
generated: true
---

# zp2tf

Zero-pole-gain → transfer function

> **Baseline page** — auto-generated from the function registry. Syntax, description, and arguments are authoritative; worked examples, the mathematical formulation, and literature references are being added incrementally.

## Syntax

```
CALL zp2tf(zr, zi, pr, pi, k : num, den)
```

## Description

Zero-pole-gain → transfer function Invoked as a `CALL` with the listed inputs and outputs.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `zr` | Number | Yes | Numeric argument. |
| `zi` | Number | Yes | Numeric argument. |
| `pr` | Number | Yes | Numeric argument. |
| `pi` | Number | Yes | Numeric argument. |
| `k` | Number | Yes | Numeric argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `num` | Number/Array | Output value. |
| `den` | Number/Array | Output value. |

