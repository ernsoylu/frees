---
name: dtable1
category: Interpolation
summary: Cubic-spline derivative of a table at x — the smooth d/dx of Interpolate1.
related: [dtable, interpolate1, differentiate]
examples: []
tags: [table, derivative, spline, cubic, interpolation, smooth]
---

# dtable1

Returns the derivative of the **natural cubic spline** through the table's first
curve at `x` — the smooth counterpart of `dtable`, matching the interpolant
`Interpolate1` evaluates. Use it when the consumer differentiates again (the
linear interpolant's slope is discontinuous at knots) or when the tabulated data
represents a smooth underlying function.

## Syntax

```
d = dtable1('t', x)
```

## Description

The spline is built over the sorted x column against the first y curve; `x`
clamps to the tabulated range. Tables with fewer than three rows fall back to
the linear-segment slope (same as `dtable`).

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

### Example 1 — spline slope through y = x²

```
TABLE quad(x)
  0   0
  1   1
  2   4
END
s = dtable1('quad', 1)    { = 2 — the natural spline through x² has the exact slope at the middle knot }
```

## See also

`dtable`, `Interpolate1`, `Differentiate`
