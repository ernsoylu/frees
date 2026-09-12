---
name: polyfit
category: Stats
summary: Reference page for polyfit.
related: []
examples: []
tags: [polyfit]
---

# polyfit

Fits a polynomial by least squares and returns coefficients in ascending powers.

## Syntax

```
[c] = polyfit(x, y, degree)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

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
