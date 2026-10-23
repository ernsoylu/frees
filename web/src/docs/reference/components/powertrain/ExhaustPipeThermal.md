---
name: ExhaustPipeThermal
category: Component (powertrain)
summary: "Exhaust pipe with thermal wall: gas duct exchanging with a two-node RC wall whose outer face convects (hA) to the ambient heat port (underhood soak studies)."
related: []
examples: []
tags: [exhaustpipethermal, component, powertrain, acausal]
references: []
---

# ExhaustPipeThermal

Exhaust pipe with thermal wall: gas duct exchanging with a two-node RC wall whose outer face convects (hA) to the ambient heat port (underhood soak studies).

The convective link is what lets the ambient side be a plain temperature source — the wall faces are states and must never be T-pinned.

Reusable acausal **powertrain-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/powertrain.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ExhaustPipeThermal inst(fluid$, UA, hA, C1, C2, R, T10, T20)
```

## Ports

`in`, `out`, `amb`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Exhaust gas name (e.g. Air). |
| `UA` | Number | Gas-to-wall conductance [W/K]. |
| `hA` | Number | Outer-wall-to-ambient conductance [W/K]. |
| `C1` | Number | Heat capacity of the inner wall node [J/K]. |
| `C2` | Number | Heat capacity of the outer wall node [J/K]. |
| `R` | Number | Conduction resistance through the wall [K/W]. |
| `T10` | Number | Initial inner-wall temperature [K]. |
| `T20` | Number | Initial outer-wall temperature [K]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
HeatedDuct D(fluid$=fluid$, UA=UA)
WallRC     W(C1=C1, C2=C2, R=R, T10=T10, T20=T20)
Convection CV(htc=hA / 1 [m^2], area=1 [m^2])
connect(in, D.in)
connect(D.out, out)
connect(D.wall, W.a)
connect(W.b, CV.a)
connect(CV.b, amb)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Exhaust pipe with thermal wall (hierarchical: HeatedDuct + WallRC +
// Convection) at steady soak: 0.05 kg/s of 750 K exhaust gas heats the
// two-node RC wall, whose outer face convects (hA = 8 W/K) to a 300 K
// underhood ambient. The wall faces are states, so the ambient side is a
// plain temperature source behind the built-in convective link.
function [out] = ExhaustSource(P, T, mdot)
port(out)
  out.P    = P
  out.mdot = mdot
  out.h    = Enthalpy(Air, P=P, T=T)
end
ExhaustSource     EXH(P=101325 [Pa], T=750 [K], mdot=0.05 [kg/s])
ExhaustPipeThermal PIPE(fluid$=Air, UA=15 [W/K], hA=8 [W/K], C1=4000 [J/K], C2=4000 [J/K], R=0.08 [K/W], T10=400 [K], T20=350 [K])
Sink              TAIL()
ThermalSource     AMB(T=300 [K])
connect(EXH.out, PIPE.in)
connect(PIPE.out, TAIL.in)
connect(PIPE.amb, AMB.port)
t_gas_out = Temperature(Air, P=TAIL.P, h=TAIL.h)

{ CHECK amb.port.qdot 1599.775965 0.0015997759651071209 }
{ CHECK amb.port.t 300 0.0003 }
{ CHECK exh.out.h 893764.5365 0.8937645364954598 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
amb.port.qdot = 1599.775965
amb.port.t = 300
exh.out.h = 893764.5365
```

<!-- verified-reference-example:end -->
