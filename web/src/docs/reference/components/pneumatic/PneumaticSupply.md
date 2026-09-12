---
name: PneumaticSupply
category: Component (pneumatic)
summary: A pneumatic pressure supply.
related: []
examples: [pneumatic-spring-actuator, pneumatic-sonic-restriction]
tags: [pneumaticsupply, component, pneumatic, acausal]
references:
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# PneumaticSupply

A pneumatic pressure supply.

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
PneumaticSupply inst(fluid$, P, T, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `P` | Number | Pressure [Pa]. |
| `T` | Number | Temperature [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= p \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =p, p=t\right)
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
PneumaticOrifice    ORI(fluid$=Air, C=1e-8, b=0.3)
PneumaticAtmosphere ATM(P=50000)
connect(SUP.out, ORI.in)
connect(ORI.out, ATM.port)

{ CHECK atm.port.h 424949.9736 0.424949973620621 }
{ CHECK atm.port.mdot 0.008199751902 1e-8 }
{ CHECK atm.port.p 50000 0.049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
atm.port.h = 424949.9736
atm.port.mdot = 0.008199751902
atm.port.p = 50000
```

<!-- verified-reference-example:end -->
