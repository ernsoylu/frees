---
name: Propeller
category: Component (fluid)
summary: Acausal fluid-domain component Propeller with ports shaft, veh.
related: []
examples: []
tags: [propeller, component, fluid, acausal]
references: []
generated: true
---

# Propeller

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Propeller inst(Dp, rhoA, ct$, cpw$, epsn)
```

## Ports

`shaft`, `veh`

## Parameters

| Parameter | Type |
| --- | --- |
| `Dp` | Number |
| `rhoA` | Number |
| `ct$` | String |
| `cpw$` | String |
| `epsn` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
n &= \frac{shaft.w}{2\,3.141592653589793} \\
j &= \frac{veh.vel}{n\cdot dp + epsn} \\
veh.f &= -\text{ct\$}\left(j\right)\cdot rhoa\cdot n^{2}\cdot dp^{4} \\
shaft.tau &= \frac{\text{cpw\$}\left(j\right)\cdot rhoa\cdot n^{2}\cdot dp^{5}}{2\,3.141592653589793}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Propeller on flat Ct/Cp advance-ratio maps: 2 m prop at 20 rev/s
// (w = 40*pi), 30 m/s flight speed -> J = 0.75, inside the 0..2 map span.
// Shaft speed and vehicle velocity are pinned directly on the streams.
TABLE ctmap(j)
  0    0.12
  2    0.12
END
TABLE cpmap(j)
  0    0.05
  2    0.05
END

Propeller PR(sh1, vh1, Dp = 2.0, rhoA = 1.225, ct$ = ctmap, cpw$ = cpmap, epsn = 1e-6)

sh1.w   = 125.66370614359172
vh1.vel = 30
thrust  = -vh1.f
tau_in  = sh1.tau

{ CHECK pr.j 0.7499999813 7.499999812500006e-7 }
{ CHECK pr.n 20 0.000019999999999999998 }
{ CHECK sh1.tau 124.7774754 0.00012477747538404597 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
pr.j = 0.7499999813
pr.n = 20
sh1.tau = 124.7774754
```

<!-- verified-reference-example:end -->
