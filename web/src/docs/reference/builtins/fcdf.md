---
name: fcdf
category: Stats
summary: F distribution — P(X ≤ x).
related: [fpdf, finv]
examples: []
tags: [fcdf, stats, distribution, f distribution]
---

# fcdf

F distribution — P(X ≤ x).

## Syntax

```
y = fcdf(x, d1, d2)
```

## Description

`fcdf(x, d1, d2)` returns the P(X ≤ x) of the F distribution with `d1` numerator and `d2` denominator degrees of freedom.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Evaluation point (≥ 0). |
| `d1` | Number | Yes | Numerator degrees of freedom (> 0). |
| `d2` | Number | Yes | Denominator degrees of freedom (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Cumulative probability in [0, 1]. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a variance-ratio probability

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = fcdf(2, 4, 10)

{ CHECK result 0.8294730742 8.294730741512228e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.8294730742
```

<!-- verified-reference-example:end -->
