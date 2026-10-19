---
name: tcdf
category: Stats
summary: Student's t distribution — P(T ≤ x).
related: [tpdf, tinv]
examples: []
tags: [tcdf, stats, distribution, student t]
---

# tcdf

Student's t distribution — P(T ≤ x).

## Syntax

```
y = tcdf(x, df)
```

## Description

`tcdf(x, df)` returns the P(T ≤ x) of Student's t distribution with `df` degrees of freedom.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Evaluation point. |
| `df` | Number | Yes | Degrees of freedom (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Cumulative probability in [0, 1]. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a Student-t tail threshold

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = tcdf(2, 9)

{ CHECK result 0.9617235881 9.617235881146496e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.9617235881
```

<!-- verified-reference-example:end -->
