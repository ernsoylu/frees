---
name: Regenerator
category: Component (fluid)
summary: "Effectiveness-rated regenerator/recuperator: Q = ε·Cmin·(Th − Tc) with ε given directly (rate it from the ε-NTU functions for a geometry design)."
related: []
examples: []
tags: [regenerator, component, fluid, acausal]
references: []
---

# Regenerator

Effectiveness-rated regenerator/recuperator: Q = ε·Cmin·(Th − Tc) with ε given directly (rate it from the ε-NTU functions for a geometry design).

Reusable acausal **fluid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/fluid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Regenerator inst(hot$, cold$, eps)
```

## Ports

`hot_in`, `hot_out`, `cold_in`, `cold_out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `hot$` | String | Hot-stream fluid name. |
| `cold$` | String | Cold-stream fluid name. |
| `eps` | Number | Effectiveness on the minimum capacity rate [-]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
hot_{out.mdot} &= hot_{in.mdot} \\
hot_{out.p} &= hot_{in.p} \\
cold_{out.mdot} &= cold_{in.mdot} \\
cold_{out.p} &= cold_{in.p} \\
th &= \text{Temperature}\left(\mathrm{hot\$}, p=hot_{in.p}, h=hot_{in.h}\right) \\
tc &= \text{Temperature}\left(\mathrm{cold\$}, p=cold_{in.p}, h=cold_{in.h}\right) \\
c_{h} &= hot_{in.mdot}\cdot \text{Cp}\left(\mathrm{hot\$}, p=hot_{in.p}, h=hot_{in.h}\right) \\
c_{c} &= cold_{in.mdot}\cdot \text{Cp}\left(\mathrm{cold\$}, p=cold_{in.p}, h=cold_{in.h}\right) \\
q &= eps\cdot \text{min}\left(c_{h}, c_{c}\right)\cdot \left(th - tc\right) \\
hot_{out.h} &= hot_{in.h} - \frac{q}{hot_{in.mdot}} \\
cold_{out.h} &= cold_{in.h} + \frac{q}{cold_{in.mdot}}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Regenerator: effectiveness-rated recuperator (eps given directly), hot
// exhaust preheating compressor-discharge air, balanced 0.5 kg/s streams.
Source      HS(h1, fluid$ = Air, mdot = 0.5 [kg/s], P = 110000 [Pa], T = 700 [K])
Source      CS(c1, fluid$ = Air, mdot = 0.5 [kg/s], P = 300000 [Pa], T = 450 [K])
Regenerator RG(h1, h2, c1, c2, hot$ = Air, cold$ = Air, eps = 0.8)
Sink        SKH(h2)
Sink        SKC(c2)

q      = RG.Q
th_out = SKH.h
tc_out = SKC.h

{ CHECK c1.h 577971.2566 0.5779712566215744 }
{ CHECK c1.mdot 0.5 5e-7 }
{ CHECK c1.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c1.h = 577971.2566
c1.mdot = 0.5
c1.p = 300000
```

<!-- verified-reference-example:end -->
