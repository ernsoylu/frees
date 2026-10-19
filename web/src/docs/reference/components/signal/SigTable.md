---
name: SigTable
category: Component (signal)
summary: "Tabulated source: sig = map$(time)."
related: []
examples: []
tags: [sigtable, component, signal, acausal]
references: []
---

# SigTable

Tabulated source: sig = map$(time).

`map$` names a TABLE/FUNCTION declared in the document — THE drive-cycle primitive (WLTP speed trace, scheduled load, setpoint program).

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigTable inst(map$)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `map$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \text{map\$}\left(time\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigTable: tabulated source sig = map$(time), sampled between knots of a
// linear table -> interpolant 6 at t = 1.5.
// EXPECT y = 6 tol 1e-9
TABLE spd(t)
  0   0
  1   4
  2   8
END
SigTable TB(map$ = spd)
time = 1.5
y = TB.out.sig

{ CHECK tb.out.sig 6 0.000006 }
{ CHECK y 6 0.000006 }
{ CHECK time 1.5 0.0000015 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
tb.out.sig = 6
y = 6
time = 1.5
```

<!-- verified-reference-example:end -->
