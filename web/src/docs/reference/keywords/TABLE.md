---
name: TABLE
category: Language Keywords
summary: Declares an inline lookup table that becomes a callable interpolating function.
related: [Interpolate, Interpolate2D, Lookup, PARAMETRIC]
examples: []
tags: [keyword, block, lookup, interpolation, curve, map]
references: []
---

# TABLE

Defines a lookup table in the equation text. Once compiled it is callable like a function: `name(x)` interpolates linearly in column 1, `name(x, p)` interpolates bilinearly across a curve family.

## Syntax

```
TABLE name(x [x_unit]) [y_unit]
  x1   y1
  x2   y2
END

TABLE name(x : p = p1, p2, p3)
  x1   y11  y12  y13
  x2   y21  y22  y23
END
```

## Description

Column 1 is the independent variable. Unit annotations in the header propagate to whatever is computed from the table. A curve family lists its parameter values after `:`; each further column is the curve at that parameter value. Outside the data range the lookup **clamps** to the end value rather than extrapolating. A `TABLE` in the document wins over a GUI Function Table of the same name.

## Mathematical Formulation

$$ y(x) = y_i + \frac{x - x_i}{x_{i+1} - x_i}\,(y_{i+1} - y_i), \qquad x_i \le x \le x_{i+1} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Pump curve and an engine map

```frees
TABLE pump_curve(flow [m^3/s]) [Pa]
  0.0       50000
  0.001     45000
  0.002     32000
  0.003     0
END
dP = pump_curve(0.0015)

TABLE bsfc(rpm : load = 0.25, 0.50, 1.0)
  1000   320   300   290
  3000   280   260   250
  5000   300   270   255
END
g = bsfc(2500, 0.6)

{ CHECK dP 38500 0.000001 }
{ CHECK g 268 0.000001 }
```

Expected output:

```text
dP = 38500 [Pa]
g = 268
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| Result pinned at an end value | The query lies outside the x range (lookups clamp). | Extend the table or check the argument's units. |
