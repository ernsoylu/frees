---
name: PneumaticVolume
category: Component (pneumatic)
summary: A pneumatic control volume (compressible capacitance).
related: []
examples: []
tags: [pneumaticvolume, component, pneumatic, acausal]
references:
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# PneumaticVolume

A pneumatic control volume (compressible capacitance).

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
PneumaticVolume inst(V, T, R, P0, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `V` | Number | Volume [m³]. |
| `T` | Number | Temperature [K]. |
| `R` | Number | Resistance [Ω]. |
| `P0` | Number | Reference/initial pressure [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in.p \\
out.h &= in.h \\
\text{der}\left(in.p\right) &= \frac{r\cdot t}{v}\cdot \left(in.mdot - out.mdot\right) \\
\text{init}\left(in.p\right) &= p0
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
function [port] = GasCap(domain$ = gas)
port(port)
  port.mdot = 0
end
PneumaticSupply  SUP(fluid$=Air, P=700000, T=300)
PneumaticOrifice ORI(fluid$=Air, C=1e-8, b=0.3)
PneumaticVolume  VOL(V=0.001, T=300, R=287, P0=120000)
GasCap           CAP()
connect(SUP.out, ORI.in)
connect(ORI.out, VOL.in)
connect(VOL.out, CAP.port)
DYNAMIC fill(method = ode23s, time = 0 .. 30, points = 100)
END
Pf = FinalValue('vol.in.p')

{ CHECK Pf 700001.2966 0.7000012966479059 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Pf = 700001.2966
```

<!-- verified-reference-example:end -->
