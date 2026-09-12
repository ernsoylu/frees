---
name: SigMap
category: Component (signal)
summary: Acausal signal-domain component SigMap with ports in, out.
related: []
examples: []
tags: [sigmap, component, signal, acausal]
references: []
generated: true
---

# SigMap

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigMap inst(map$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `map$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \text{map\$}\left(in.sig\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TABLE-driven lookup blocks: 1-D map (slope-2 line -> 6 at 3) and a 2-D
// curve family (midway between U=x and U=3x at x=5 -> 10).
// EXPECT m1.out.sig = 6
// EXPECT m2.out.sig = 10
TABLE lin(x)
  0   0
  10  20
END
TABLE fam(x : y = 0, 10)
  0    0    0
  10   10   30
END
SigConstant X(k=3)
SigConstant X2(k=5)
SigMap   M1(map$=lin)
SigMap2  M2(map$=fam)
connect(X.out, M1.in)
connect(X2.out, M2.in1, M2.in2)

{ CHECK m1.in.sig 3 0.000003 }
{ CHECK m1.out.sig 6 0.000006 }
{ CHECK m2.in1.sig 5 0.0000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
m1.in.sig = 3
m1.out.sig = 6
m2.in1.sig = 5
```

<!-- verified-reference-example:end -->
