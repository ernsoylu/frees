---
name: EXVCmd
category: Component (ac)
summary: "Signal-commanded EXV: identical orifice physics to EXV, but the opening fraction arrives on a signal port `u` (u.sig ∈ [0,1]) so a controller (SigPID, SigTable schedule, …) can drive it in closed loop."
related: []
examples: []
tags: [exvcmd, component, ac, acausal]
references: []
---

# EXVCmd

Signal-commanded EXV: identical orifice physics to EXV, but the opening fraction arrives on a signal port `u` (u.sig ∈ [0,1]) so a controller (SigPID, SigTable schedule, …) can drive it in closed loop.

Reusable acausal **ac-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/ac.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

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
rho_{in} &= \text{Density}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
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
TwoPhaseSourcePH SA(c1, mdot = 0.04 [kg/s], P = 1000000 [Pa], h = 260000 [J/kg])
EXV              XV(c1, c2, fluid$ = R134a, CdA_max = 5e-6 [m^2], u = 0.8)
TwoPhaseSink     KA(c2)

TwoPhaseSourcePH SB(d1, mdot = 0.04 [kg/s], P = 1000000 [Pa], h = 260000 [J/kg])
SigConstant      CMD(u1, k = 0.8)
EXVCmd           XC(d1, d2, u1, fluid$ = R134a, CdA_max = 5e-6 [m^2])
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
