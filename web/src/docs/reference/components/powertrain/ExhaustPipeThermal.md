---
name: ExhaustPipeThermal
category: Component (powertrain)
summary: Acausal powertrain-domain component ExhaustPipeThermal with ports in, out, amb.
related: []
examples: []
tags: [exhaustpipethermal, component, powertrain, acausal]
references: []
generated: true
---

# ExhaustPipeThermal

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ExhaustPipeThermal inst(fluid$, UA, hA, C1, C2, R, T10, T20)
```

## Ports

`in`, `out`, `amb`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `hA` | Number |
| `C1` | Number |
| `C2` | Number |
| `R` | Number |
| `T10` | Number |
| `T20` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
HeatedDuct D(fluid$=fluid$, UA=UA)
WallRC     W(C1=C1, C2=C2, R=R, T10=T10, T20=T20)
Convection CV(htc=hA, area=1)
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
ExhaustSource     EXH(P=101325, T=750, mdot=0.05)
ExhaustPipeThermal PIPE(fluid$=Air, UA=15, hA=8, C1=4000, C2=4000, R=0.08, T10=400, T20=350)
Sink              TAIL()
ThermalSource     AMB(T=300)
connect(EXH.out, PIPE.in)
connect(PIPE.out, TAIL.in)
connect(PIPE.amb, AMB.port)
t_gas_out = Temperature(Air, P=TAIL.P, h=TAIL.h)

{ CHECK amb.port.qdot -1599.775965 0.0015997759651071209 }
{ CHECK amb.port.t 300 0.0003 }
{ CHECK exh.out.h 893764.5365 0.8937645364954598 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
amb.port.qdot = -1599.775965
amb.port.t = 300
exh.out.h = 893764.5365
```

<!-- verified-reference-example:end -->
