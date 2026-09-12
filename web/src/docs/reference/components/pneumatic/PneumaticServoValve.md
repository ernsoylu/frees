---
name: PneumaticServoValve
category: Component (pneumatic)
summary: A pneumatic servo valve with a commanded spool position.
related: []
examples: []
tags: [pneumaticservovalve, component, pneumatic, acausal]
references:
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# PneumaticServoValve

A pneumatic servo valve with a commanded spool position.

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
PneumaticServoValve inst(fluid$, Cmax, b, u, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `Cmax` | Number | Maximum capacity rate [W/K]. |
| `b` | Number | Critical pressure ratio / coefficient. |
| `u` | Number | Specific internal energy [J/kg]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.h &= in.h \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot &= \text{iso6358}\left(u\cdot cmax, b, in.p, t_{in}, out.p\right) \\
out.mdot &= in.mdot
\end{aligned}
$$

## References

1. ISO 6358 — Pneumatic fluid power: flow-rate characteristics.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
PneumaticServoValve SV(fluid$=Air, Cmax=1e-8, b=0.3, u=0.5)
PneumaticAtmosphere ATM(P=100000)
connect(SUP.out, SV.in)
connect(SV.out, ATM.port)

{ CHECK atm.port.h 424949.9736 0.424949973620621 }
{ CHECK atm.port.mdot 0.004099875951 1e-8 }
{ CHECK atm.port.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
atm.port.h = 424949.9736
atm.port.mdot = 0.004099875951
atm.port.p = 100000
```

<!-- verified-reference-example:end -->
