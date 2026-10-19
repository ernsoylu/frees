---
name: tpdf
category: Stats
summary: Student's t distribution — probability density.
related: [tcdf, tinv]
examples: []
tags: [tpdf, stats, distribution, student t]
---

# tpdf

Student's t distribution — probability density.

## Syntax

```
y = tpdf(x, df)
```

## Description

`tpdf(x, df)` returns the probability density of Student's t distribution with `df` degrees of freedom.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Evaluation point. |
| `df` | Number | Yes | Degrees of freedom (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Density value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a Student-t density

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = tpdf(0, 9)

{ CHECK result 0.3880349089 3.880349088716686e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.3880349089
```

<!-- verified-reference-example:end -->
