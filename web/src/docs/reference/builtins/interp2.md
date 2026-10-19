---
name: interp2
category: Interpolation
summary: Regular-grid 2-D interpolation z = f(x, y).
related: [interpolate, interpolate2d]
examples: []
tags: [interp2, interpolation, 2d, grid]
---

# interp2

Regular-grid 2-D interpolation z = f(x, y).

## Syntax

```
zq = interp2(x, y, Z, xq, yq)
zq = interp2(xq, yq, x, y, Z)
```

## Description

`interp2(x, y, Z, xq, yq)` interpolates the grid `Z` (rows along `x`, columns along `y`) at the query point (xq, yq). The query-first order `interp2(xq, yq, x, y, Z)` is also accepted; the 2-D grid argument tells the two apart. Grids with at least 5 nodes per axis use a piecewise Akima bicubic spline; smaller grids are interpolated bilinearly. Queries outside the grid clamp to the boundary.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | Grid coordinates along the first axis (ascending). |
| `y` | Vector | Yes | Grid coordinates along the second axis (ascending). |
| `Z` | Matrix | Yes | Grid values, length(x) × length(y). |
| `xq, yq` | Number | Yes | Query point. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `zq` | Number | Interpolated value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Interpolate a calibration grid

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [0, 1]
y = [0, 1]
z = [0, 1; 2, 3]
[result] = interp2(x, y, z, 0.5, 0.5)

{ CHECK result 1.5 0.0000015 }
{ CHECK x[1] 0 1e-8 }
{ CHECK x[2] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.5
x[1] = 0
x[2] = 1
```

<!-- verified-reference-example:end -->
