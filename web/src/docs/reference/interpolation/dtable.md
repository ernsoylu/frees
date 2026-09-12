---
name: dtable
category: Interpolation
summary: Analytic slope of a table's linear interpolant — the exact derivative of t(x).
related: [dtable1, interpolate, differentiate]
examples: []
tags: [table, derivative, slope, interpolation, cam, feedforward, map]
---

# dtable

Returns the **exact derivative of the interpolant** a bare table call evaluates: for
`t(x)` (piecewise-linear), `dtable('t', x)` is the slope of the segment containing
`x`. Unlike `Differentiate` (a general column-vs-column numerical derivative), the
first y-curve against the x column is implied — the 1-D map-call convention.

## Syntax

```
d = dtable('t', x)
```

Inside a component, a `map$`-style string parameter works directly — this is the
feedforward/cam idiom the function exists for:

```
function [shaft, rod] = CamFollower(prof$)
  port(shaft)
  port(rod)
  lift    = prof$(theta)
  rod.vel = dtable(prof$, theta) * shaft.w   { chain rule: dl/dθ · dθ/dt }
  ...
end
```

## Description

Because the slope is read from the interpolant itself (not finite-differenced),
it is exact everywhere for the linear interpolant — including between knots — and
piecewise-constant across a segment. At a knot the right-segment slope is
returned; outside the tabulated range the edge segment's slope extends. For a
smooth derivative use `dtable1` (cubic spline).

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | String | Yes | Name of a `TABLE` block (or a bound `map$` parameter). |
| `x` | Number | Yes | Evaluation point, in the table's x units. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// E1 — dtable(): analytic derivative of a table interpolant.
// lin is y = 3x, so the linear-interpolant slope is exactly 3 everywhere,
// including between knots and at a knot. quad holds y = x^2 at x = 0,1,2;
// the natural cubic spline through those points has slope exactly 2 at x = 1
// (hand value: M1 = 3 from the tridiagonal system, y' = 1 + 2*M1/6 = 2).
// The Cam-style component proves the map$-baking path: dtable(prof$, x)
// resolves against the document TABLE bound to the prof$ parameter.
// EXPECT s_mid = 3
// EXPECT s_knot = 3
// EXPECT s_spline = 2 tol 1e-9
// EXPECT c.lift = 9 tol 1e-9
// EXPECT c.vel = 6 tol 1e-9

TABLE lin(x)
  0   0
  1   3
  2   6
  4   12
END

TABLE quad(x)
  0   0
  1   1
  2   4
END

s_mid    = dtable('lin', 0.5)
s_knot   = dtable('lin', 2)
s_spline = dtable1('quad', 1)

function [out] = CamProfile(prof$, w)
port(out)
  theta   = time * w
  lift    = prof$(theta)
  vel     = dtable(prof$, theta) * w
  out.sig = lift
end

time = 1.5
CamProfile c(prof$=lin, w=2)
probe = c.out.sig

{ CHECK c.lift 9 0.000009 }
{ CHECK c.out.sig 9 0.000009 }
{ CHECK c.theta 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.lift = 9
c.out.sig = 9
c.theta = 3
```

<!-- verified-reference-example:end -->

### Example 1 — exact slope of a linear table

```
TABLE lin(x)
  0   0
  1   3
  2   6
END
s = dtable('lin', 0.5)    { = 3, exactly }
```

## See also

`dtable1`, `Interpolate`, `Differentiate`
