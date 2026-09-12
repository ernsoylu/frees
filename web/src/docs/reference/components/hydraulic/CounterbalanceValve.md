---
name: CounterbalanceValve
category: Component (hydraulic)
summary: Acausal hydraulic-domain component CounterbalanceValve with ports in, out, pilot.
related: []
examples: []
tags: [counterbalancevalve, component, hydraulic, acausal]
references: []
generated: true
---

# CounterbalanceValve

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CounterbalanceValve inst(CdA_max, rho, P_set, R_p, eps_o, domain$)
```

## Ports

`in`, `out`, `pilot`

## Parameters

| Parameter | Type |
| --- | --- |
| `CdA_max` | Number |
| `rho` | Number |
| `P_set` | Number |
| `R_p` | Number |
| `eps_o` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
x_{o} &= 0.5\,\left(1 + \tanh\left(\frac{in.p + r_{p}\cdot pilot.p - p_{set}}{eps_{o}}\right)\right) \\
out.mdot &= in.mdot \\
out.h &= in.h \\
pilot.mdot &= 0 \\
in.mdot\cdot \left|in.mdot\right| &= \left(x_{o}\cdot cda_{max}\right)^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// CounterbalanceValve exactly at its threshold: in.P + R_p*pilot.P = P_set
// opens the sigmoid to precisely one half. Steady.
// EXPECT x_o = 0.5 tol 1e-9

CounterbalanceValve CB(c1, c2, cp1, CdA_max=3e-6, rho=870, P_set=3e6, R_p=3, eps_o=5e4)
c1.P  = 1.5e6
c1.h  = 0
c2.P  = 1e5
cp1.P = 0.5e6
cp1.h = 0
x_o = CB.x_o

{ CHECK c1.mdot 0.07403377608 7.403377607551841e-8 }
{ CHECK c1.p 1500000 1.5 }
{ CHECK c2.h 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c1.mdot = 0.07403377608
c1.p = 1500000
c2.h = 0
```

<!-- verified-reference-example:end -->
