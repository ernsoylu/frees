---
name: EjectorMomentum
category: Component (twophase)
summary: "Momentum-based two-phase ejector: the motive stream expands (nozzle efficiency) to the suction pressure, momentum-mixes with the entrained stream at constant area, and the mixed velocity head recovers as the diffuser lift."
related: []
examples: []
tags: [ejectormomentum, component, twophase, acausal]
references: []
---

# EjectorMomentum

Momentum-based two-phase ejector: the motive stream expands (nozzle efficiency) to the suction pressure, momentum-mixes with the entrained stream at constant area, and the mixed velocity head recovers as the diffuser lift.

Total enthalpy is conserved exactly.

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
EjectorMomentum inst(fluid$, eta_n, eta_m, domain$)
```

## Ports

`mot_in`, `suc_in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `eta_n` | Number |
| `eta_m` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
s_{m} &= \text{Entropy}\left(\mathrm{fluid\$}, p=mot_{in.p}, h=mot_{in.h}\right) \\
h_{mi} &= \text{Enthalpy}\left(\mathrm{fluid\$}, p=suc_{in.p}, s=s_{m}\right) \\
v_{m} &= \sqrt{2\,eta_{n}\cdot \left(mot_{in.h} - h_{mi}\right)} \\
out.mdot &= mot_{in.mdot} + suc_{in.mdot} \\
v_{mix} &= \frac{eta_{m}\cdot mot_{in.mdot}\cdot v_{m}}{out.mdot} \\
out.mdot\cdot out.h &= mot_{in.mdot}\cdot mot_{in.h} + suc_{in.mdot}\cdot suc_{in.h} \\
h_{mix} &= out.h - \frac{v_{mix}^{2}}{2} \\
rho_{mix} &= \text{Density}\left(\mathrm{fluid\$}, p=suc_{in.p}, h=h_{mix}\right) \\
out.p &= suc_{in.p} + \frac{rho_{mix}\cdot v_{mix}^{2}}{2}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// EjectorMomentum: 1.2 MPa motive vapor expands (eta_n = 0.8) to the 350 kPa
// suction level, momentum-mixes with the entrained stream and the diffuser
// recovers the mixed velocity head as a pressure lift on the outlet.
TwoPhaseSourcePH MOT(mdot = 0.03 [kg/s], P = 1200000 [Pa], h = 430000 [J/kg])
TwoPhaseSourcePH SUC(mdot = 0.01 [kg/s], P = 350000 [Pa], h = 405000 [J/kg])
EjectorMomentum  EJ(fluid$ = R134a, eta_n = 0.8, eta_m = 0.85)
TwoPhaseSink     SNK()
connect(MOT.out, EJ.mot_in)
connect(SUC.out, EJ.suc_in)
connect(EJ.out, SNK.in)
p_out  = SNK.P
p_lift = SNK.P - 350000

{ CHECK ej.h_mi 404006.4489 0.40400644885197096 }
{ CHECK ej.h_mix 415298.8467 0.41529884668299705 }
{ CHECK ej.mot_in.h 430000 0.43 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ej.h_mi = 404006.4489
ej.h_mix = 415298.8467
ej.mot_in.h = 430000
```

<!-- verified-reference-example:end -->
