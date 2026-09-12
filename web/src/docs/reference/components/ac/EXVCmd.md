---
name: EXVCmd
category: Component (ac)
summary: Acausal ac-domain component EXVCmd with ports in, out, u.
related: []
examples: []
tags: [exvcmd, component, ac, acausal]
references: []
generated: true
---

# EXVCmd

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
EXVCmd inst(fluid$, CdA_max, domain$)
```

## Ports

`in`, `out`, `u`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `CdA_max` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot\cdot \left|in.mdot\right| &= \left(u.sig\cdot cda_{max}\right)^{2}\cdot 2\cdot rho_{in}\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Domain family: AC / vapour-compression accessories (ac.frees). EXV and EXVCmd
// are the two leaf components of that file that need no humid-air backend; the
// signal-driven one also crosses the SIGNAL domain into the twophase bond,
// which is exactly the multi-domain case the connect rules must keep separate.
TwoPhaseSourcePH SA(c1, mdot = 0.04, P = 1000000, h = 260000)
EXV              XV(c1, c2, fluid$ = R134a, CdA_max = 5e-6, u = 0.8)
TwoPhaseSink     KA(c2)

TwoPhaseSourcePH SB(d1, mdot = 0.04, P = 1000000, h = 260000)
SigConstant      CMD(u1, k = 0.8)
EXVCmd           XC(d1, d2, u1, fluid$ = R134a, CdA_max = 5e-6)
TwoPhaseSink     KB(d2)

rho_xv = XV.rho_in
dp_xv  = c1.P - c2.P
rho_xc = XC.rho_in
u_cmd  = u1.sig

{ CHECK c1.h 260000 0.26 }
{ CHECK c1.mdot 0.04 4e-8 }
{ CHECK c1.p 1000000 1 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c1.h = 260000
c1.mdot = 0.04
c1.p = 1000000
```

<!-- verified-reference-example:end -->
