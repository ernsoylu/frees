---
name: viewfactor_perp
category: Heat Transfer
summary: Diffuse radiation view factor between perpendicular rectangles with a common edge.
related: [viewfactor_plates, viewfactor_disks]
examples: [radiation-view-factors]
tags: [radiation, view factor, configuration factor, perpendicular, rectangles, corner]
---

# viewfactor_perp

Returns the **diffuse radiation view factor** `F_{1→2}` between two **perpendicular
rectangles that share a common edge** (an interior corner). Use it for radiation
exchange between adjoining walls without a chart lookup.

## Syntax

```
F = viewfactor_perp(Y, Z, X)
```

## Description

Two rectangles meeting at right angles along a common edge exchange radiation with
a view factor that depends on the two aspect ratios formed against the shared
dimension. `Y` and `Z` are the far extents of the two surfaces; `X` is the common
edge length.

## Mathematical Formulation

With $H = Z/X$ and $W = Y/X$,

$$ F_{1\to 2} = \frac{1}{\pi W}\Bigg( W\tan^{-1}\frac{1}{W} + H\tan^{-1}\frac{1}{H} - \sqrt{H^2+W^2}\,\tan^{-1}\frac{1}{\sqrt{H^2+W^2}} + \frac{1}{4}\ln\Big[\,\cdots\,\Big] \Bigg) $$

(the logarithmic term is the full standard closed-form expression in $H$ and $W$.)

> **Method:** direct evaluation of the standard closed-form view-factor expression.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
F_12 = viewfactor_perp(1 [m], 1 [m], 1 [m])   { ~0.2000 }
F_21 = viewfactor_disks(1 [m], 0.5 [m], 0.4 [m])

{ CHECK F_12 0.2000437761 2.0004377607540316e-7 }
{ CHECK F_21 0.2079839037 2.0798390368117859e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
F_12 = 0.2000437761
F_21 = 0.2079839037
```

<!-- verified-reference-example:end -->

### Example 1 — Perpendicular rectangles sharing an edge

[Run: radiation-view-factors]

**Expected:** `viewfactor_perp(1, 1, 1) ≈ 0.20` (two equal perpendicular squares).

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Y` | Number | Yes | Extent of surface 1 normal to the common edge [m]. |
| `Z` | Number | Yes | Extent of surface 2 normal to the common edge [m]. |
| `X` | Number | Yes | Length of the shared (common) edge [m] (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `F` | Number | View factor F_{1→2} ∈ [0, 1]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `X ≤ 0` or an extent ≤ 0 | All three lengths must be positive. |
