---
name: HeatingResistor
category: Component (electrical)
summary: A resistor that dissipates its electrical power as heat (electrical→thermal transducer).
related: []
examples: [pressure-cooker]
tags: [heatingresistor, component, electrical, acausal]
---

# HeatingResistor

A resistor that dissipates its electrical power as heat (electrical→thermal transducer).

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `heat`

## Usage

```
HeatingResistor inst(R)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `R` | Number | Resistance [Ω]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= r\cdot p.i \\
p.i + n.i &= 0 \\
q &= \left(p.v - n.v\right)\cdot p.i \\
heat.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
VoltageSource   VS(E=10)
HeatingResistor HR(R=5)
Ground          G()
Conduction      C(k=2, area=1, L=0.1)
ThermalSource   AMB(T=300)
connect(VS.p, HR.p)
connect(VS.n, HR.n, G.port)
connect(HR.heat, C.a)
connect(C.b, AMB.port)

{ CHECK amb.port.qdot 20 0.000019999999999999998 }
{ CHECK amb.port.t 300 0.0003 }
{ CHECK c.a.qdot 20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
amb.port.qdot = 20
amb.port.t = 300
c.a.qdot = 20
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: pressure-cooker]
