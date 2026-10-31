---
name: polyfit
category: Stats
summary: Least-squares polynomial fit; coefficients in ascending powers.
related: [linfit, slope, intercept, r2]
examples: [quadratic-regression]
tags: [polyfit]
---

# polyfit

Least-squares polynomial fit; coefficients in ascending powers.

## Syntax

```
[c] = polyfit(x, y, degree)
```

## Description

`[c] = polyfit(x, y, degree)` fits a polynomial of the given degree to the points `(x, y)` by least squares and returns its coefficients in **ascending** powers: `y ≈ c[1] + c[2]·x + … + c[degree+1]·x^degree`. Note the order — it is the reverse of MATLAB's `polyfit`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Fit a quadratic sensor calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [0, 1, 2, 3]
y = [1, 2, 5, 10]
[c] = polyfit(x, y, 2)

{ CHECK c[1] 1 0.000001 }
{ CHECK c[2] 0 1e-8 }
{ CHECK c[3] 1 0.0000010000000000000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c[1] = 1
c[2] = 0
c[3] = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | Sample abscissae. |
| `y` | Vector | Yes | Sample ordinates (same length as `x`). |
| `degree` | Number | Yes | Polynomial degree (≥ 0, less than the number of points). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `c` | Vector | `degree + 1` coefficients, constant term first. |
