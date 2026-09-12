---
name: round
category: Math
summary: Round to nearest integer
related: []
examples: []
tags: [round, math]
references: []
---

# round

Round to nearest integer


## Syntax

```
round(x)
```

## Description

Round to nearest integer

## Mathematical Formulation

$$ \operatorname{round}(x, d) = \frac{\lfloor x\cdot 10^{d} + 0.5\rfloor}{10^{d}} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
val1 = round(3.14159, 3)   { 3.142 }
val2 = floor(2.7)          { 2 }
val3 = step(0.5)           { 1 }

{ CHECK val1 3.142 0.0000031419999999999997 }
{ CHECK val2 2 0.000002 }
{ CHECK val3 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
val1 = 3.142
val2 = 2
val3 = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
