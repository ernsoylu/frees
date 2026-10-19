---
name: fpdf
category: Stats
summary: F distribution — probability density.
related: [fcdf, finv]
examples: []
tags: [fpdf, stats, distribution, f distribution]
---

# fpdf

F distribution — probability density.

## Syntax

```
y = fpdf(x, d1, d2)
```

## Description

`fpdf(x, d1, d2)` returns the probability density of the F distribution with `d1` numerator and `d2` denominator degrees of freedom.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Evaluation point (≥ 0). |
| `d1` | Number | Yes | Numerator degrees of freedom (> 0). |
| `d2` | Number | Yes | Denominator degrees of freedom (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Density value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a variance-ratio density

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = fpdf(1, 4, 10)

{ CHECK result 0.4553496296 4.5534962958825516e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.4553496296
```

<!-- verified-reference-example:end -->
