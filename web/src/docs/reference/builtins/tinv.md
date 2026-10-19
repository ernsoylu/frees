---
name: tinv
category: Stats
summary: Student's t distribution — inverse CDF (quantile).
related: [tcdf, tpdf]
examples: []
tags: [tinv, stats, distribution, student t]
---

# tinv

Student's t distribution — inverse CDF (quantile).

## Syntax

```
y = tinv(p, df)
```

## Description

`tinv(p, df)` returns the inverse CDF (quantile) of Student's t distribution with `df` degrees of freedom.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `p` | Number | Yes | Probability in (0, 1). |
| `df` | Number | Yes | Degrees of freedom (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Quantile t with P(T ≤ t) = p. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a two-sided 95 percent t threshold

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = tinv(0.975, 9)

{ CHECK result 2.262157163 0.0000022621571627982053 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2.262157163
```

<!-- verified-reference-example:end -->
