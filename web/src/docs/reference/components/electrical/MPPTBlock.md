---
name: MPPTBlock
category: Component (electrical)
summary: "Map-referenced maximum-power-point command: Vmp from an irradiance map (perturb-free analytic tracking; pair with PVSingleDiode + a DC-DC stage)."
related: []
examples: []
tags: [mpptblock, component, electrical, acausal]
references: []
---

# MPPTBlock

Map-referenced maximum-power-point command: Vmp from an irradiance map (perturb-free analytic tracking; pair with PVSingleDiode + a DC-DC stage).

Reusable acausal **electrical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/electrical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MPPTBlock inst(vmp$)
```

## Ports

`G`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `vmp$` | String | Name of the table mapping irradiance to the maximum-power-point voltage. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \text{vmp\$}\left(g.sig\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// PVSingleDiode held at 0.5 V (negligible Rs/Rsh): the diode term subtracts
// 1e-9*(e^10 - 1) = 2.2e-5 from the 6 A photocurrent. MPPT reads the Vmp map.
// EXPECT i_pv = 5.999978 tol 1e-5
// EXPECT v_cmd = 30 tol 1e-9

SigConstant   SUN(k=1000 [W/m^2])
VoltageSource HOLD(E=0.5 [V])
Ground        G1()
PVSingleDiode PV(Isc_ref=6 [A], Gref=1000 [W/m^2], I0d=1e-9 [A], n_d=1.934236, Vt=0.02585 [V], Rs=1e-9 [ohm], Rsh=1e9 [ohm])
connect(PV.p, HOLD.p)
connect(PV.n, HOLD.n, G1.port)
connect(SUN.out, PV.G)
i_pv = -PV.p.I

TABLE vmp(g [W/m^2]) [V]
  0     30
  2000  30
END
SigConstant SUN2(k=800 [W/m^2])
MPPTBlock   MPPT(vmp$=vmp)
connect(SUN2.out, MPPT.G)
v_cmd = MPPT.out.sig

{ CHECK g1.port.i 0 1e-8 }
{ CHECK g1.port.v 0 1e-8 }
{ CHECK hold.n.i -5.999977974 0.000005999977974034204 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g1.port.i = 0
g1.port.v = 0
hold.n.i = -5.999977974
```

<!-- verified-reference-example:end -->
