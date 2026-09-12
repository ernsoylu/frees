---
name: Nozzle
category: Component (fluid)
summary: Accelerates a flow, converting enthalpy into kinetic energy.
related: []
examples: [cd-nozzle-shock]
tags: [nozzle, component, fluid, acausal]
---

# Nozzle

Accelerates a flow, converting enthalpy into kinetic energy.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Nozzle inst(k, R, A_throat, A_exit, P_amb, T0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | Number | Stiffness / conductivity. |
| `R` | Number | Resistance [Ω]. |
| `A_throat` | Number | Throat area [m²]. |
| `A_exit` | Number | Exit area [m²]. |
| `P_amb` | Number | Ambient pressure [Pa]. |
| `T0` | Number | Reference/initial temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
m_{exit} &= \text{mach\_a\_astar}\left(\frac{a_{exit}}{a_{throat}}, k, \text{'supersonic'}\right) \\
out.p &= \frac{in.p}{\text{p0\_p}\left(m_{exit}, k\right)} \\
t_{exit} &= \frac{t0}{\text{t0\_t}\left(m_{exit}, k\right)} \\
v_{exit} &= m_{exit}\cdot \sqrt{k\cdot r\cdot t_{exit}} \\
out.h &= in.h - \frac{v_{exit}^{2}}{2} \\
thrust &= in.mdot\cdot v_{exit} + \left(out.p - p_{amb}\right)\cdot a_{exit}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Nozzle N(s_in, s_out, k=1.4, R=287, A_throat=0.01, A_exit=0.04, P_amb=0, T0=500)
s_in.P    = 1000000
s_in.mdot = 2
s_in.h    = 300000

{ CHECK n.m_exit 2.940179169 0.00000294017916931255 }
{ CHECK n.t_exit 183.2219478 0.0001832219477957242 }
{ CHECK n.thrust 2786.981066 0.0027869810659831803 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
n.m_exit = 2.940179169
n.t_exit = 183.2219478
n.thrust = 2786.981066
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: cd-nozzle-shock]
