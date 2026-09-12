---
name: Capacitor
category: Component (electrical)
summary: A capacitor storing charge, with i = C dV/dt.
related: []
examples: [rc-step-charging, series-rlc-resonance]
tags: [capacitor, component, electrical, acausal]
---

# Capacitor

A capacitor storing charge, with `i = C dV/dt`.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Capacitor inst(C, V0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `C` | Number | Capacitance [F]. |
| `V0` | Number | Initial voltage / volume. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
vc &= p.v - n.v \\
\text{der}\left(vc\right) &= \frac{p.i}{c} \\
\text{init}\left(vc\right) &= v0 \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
VoltageSource VS(E=10)
Resistor      R(R=1000)
Capacitor     CAP(C=0.001, V0=0)
Ground        G()
connect(VS.p, R.a)
connect(R.b, CAP.p)
connect(CAP.n, VS.n, G.port)
DYNAMIC charge(method = ode45, time = 0 .. 5, points = 100)
END
V_final = FinalValue('cap.vc')
t_half  = TimeAt('cap.vc', 5)

{ CHECK t_half 0.6934008747 6.934008747029404e-7 }
{ CHECK V_final 9.93262053 0.000009932620529977597 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
t_half = 0.6934008747
V_final = 9.93262053
```

<!-- verified-reference-example:end -->
