---
name: finv
category: Stats
summary: F distribution — inverse CDF (quantile).
related: [fcdf, fpdf]
examples: []
tags: [finv, stats, distribution, f distribution]
---

# finv

F distribution — inverse CDF (quantile).

## Syntax

```
y = finv(p, d1, d2)
```

## Description

`finv(p, d1, d2)` returns the inverse CDF (quantile) of the F distribution with `d1` numerator and `d2` denominator degrees of freedom.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `p` | Number | Yes | Probability in (0, 1). |
| `d1` | Number | Yes | Numerator degrees of freedom (> 0). |
| `d2` | Number | Yes | Denominator degrees of freedom (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Quantile x with P(X ≤ x) = p. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a variance-ratio critical value

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = finv(0.95, 4, 10)

{ CHECK result 3.478049691 0.0000034780496907652303 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3.478049691
```

<!-- verified-reference-example:end -->
