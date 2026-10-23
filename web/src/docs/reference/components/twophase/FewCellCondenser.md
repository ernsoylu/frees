---
name: FewCellCondenser
category: Component (twophase)
summary: "Packaged 3-cell condenser: the same private-state C-R chain (heat leaves through the walls when they run colder than the refrigerant)."
related: []
examples: []
tags: [fewcellcondenser, component, twophase, acausal]
references: []
---

# FewCellCondenser

Packaged 3-cell condenser: the same private-state C-R chain (heat leaves through the walls when they run colder than the refrigerant).

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FewCellCondenser inst(fluid$, V, Cc, UA, Kv, P0, h0, domain$)
```

## Ports

`in`, `out`, `w1`, `w2`, `w3`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Refrigerant name (e.g. R134a, R744, R1234yf). |
| `V` | Number | Refrigerant volume of each of the three cells [m^3]. |
| `Cc` | Number | Mass capacitance of each cell [kg/Pa]. |
| `UA` | Number | Wall conductance of each cell [W/K]. |
| `Kv` | Number | Flow conductance between adjacent cells [kg/s-Pa]. |
| `P0` | Number | Initial pressure of every cell [Pa]. |
| `h0` | Number | Initial enthalpy of every cell [J/kg]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
in.mdot &= kv\cdot \left(in.p - p1\right) \\
m2 &= kv\cdot \left(p1 - p2\right) \\
m3 &= kv\cdot \left(p2 - p3\right) \\
out.mdot &= kv\cdot \left(p3 - out.p\right) \\
\text{der}\left(p1\right) &= \frac{in.mdot - m2}{cc} \\
\text{init}\left(p1\right) &= p0 \\
\text{der}\left(p2\right) &= \frac{m2 - m3}{cc} \\
\text{init}\left(p2\right) &= p0 \\
\text{der}\left(p3\right) &= \frac{m3 - out.mdot}{cc} \\
\text{init}\left(p3\right) &= p0 \\
t1 &= \text{Temperature}\left(\mathrm{fluid\$}, p=p1, h=h1\right) \\
t2 &= \text{Temperature}\left(\mathrm{fluid\$}, p=p2, h=h2\right) \\
t3 &= \text{Temperature}\left(\mathrm{fluid\$}, p=p3, h=h3\right) \\
q1 &= ua\cdot \left(w1.t - t1\right) \\
q2 &= ua\cdot \left(w2.t - t2\right) \\
q3 &= ua\cdot \left(w3.t - t3\right) \\
w1.qdot &= q1 \\
w2.qdot &= q2 \\
w3.qdot &= q3 \\
rho1 &= \text{Density}\left(\mathrm{fluid\$}, p=p1, h=h1\right) \\
rho2 &= \text{Density}\left(\mathrm{fluid\$}, p=p2, h=h2\right) \\
rho3 &= \text{Density}\left(\mathrm{fluid\$}, p=p3, h=h3\right) \\
\text{der}\left(h1\right) &= \frac{in.mdot\cdot \left(in.h - h1\right) + q1}{rho1\cdot v} \\
\text{init}\left(h1\right) &= h0 \\
\text{der}\left(h2\right) &= \frac{m2\cdot \left(h1 - h2\right) + q2}{rho2\cdot v} \\
\text{init}\left(h2\right) &= h0 \\
\text{der}\left(h3\right) &= \frac{m3\cdot \left(h2 - h3\right) + q3}{rho3\cdot v} \\
\text{init}\left(h3\right) &= h0 \\
out.h &= h3
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Simulate a component transient and inspect its final state

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// FewCellCondenser: the mirrored 3-cell C-R chain at the high side — saturated
// R134a vapor at 1.22 MPa condenses against three 305 K wall nodes (Tsat ~
// 319.6 K). Integrated on ida from in-dome initial states (the steady limit of
// this block stalls Newton on the high-pressure (P,h) flash; the transient is
// the component's intended C-R-C usage anyway). Pressure chain settles in
// ~Cc/Kv = 25 ms, the enthalpy states in a few seconds.
TwoPhasePressureSource SUP(fluid$ = R134a, P = 1220000 [Pa], x = 1)
FewCellCondenser       CND(fluid$ = R134a, V = 0.001 [m^3], Cc = 1e-7 [kg/Pa], UA = 30 [W/K], Kv = 4e-6 [kg/s-Pa], P0 = 1210000 [Pa], h0 = 400000 [J/kg])
ThermalSource          W1(T = 305 [K])
ThermalSource          W2(T = 305 [K])
ThermalSource          W3(T = 305 [K])
TwoPhasePressureSink   RET(P = 1200000 [Pa])
connect(SUP.out, CND.in)
connect(CND.out, RET.in)
connect(CND.w1, W1.port)
connect(CND.w2, W2.port)
connect(CND.w3, W3.port)

DYNAMIC settle (method = ida, time = 0 .. 30, points = 61, rtol = 1e-6, atol = 1e-2)
END

final_state = FinalValue('cnd$p1')

{ CHECK final_state 1215000 1.2149999999984138 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
final_state = 1215000
```

<!-- verified-reference-example:end -->
