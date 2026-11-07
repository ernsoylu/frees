---
name: Zener
category: Component (electrical)
summary: "Zener diode (p = anode): forward conduction above 0 V and reverse breakdown below −Vz, each a smooth conductance ramp."
related: [Diode]
examples: []
tags: [zener, component, electrical, acausal]
references: ["A. S. Sedra and K. C. Smith, Microelectronic Circuits, 7th ed., Oxford University Press, 2014 (the Zener shunt regulator)"]
---

# Zener

Zener diode (p = anode): forward conduction above 0 V and reverse breakdown below −Vz, each a smooth conductance ramp.

## What it models

A Zener diode as two piecewise-linear branches, each smoothed by a tanh of width `eps`: forward, it conducts like a diode with conductance `Gon`; reversed past `Vz`, it breaks down and holds the voltage near `Vz` with a slope resistance of `1/Gon`. Wire the cathode (`n`) to the regulated node. There is no temperature coefficient or power limit.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Zener inst(Vz, Gon, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Vz` | Number | Reverse breakdown voltage [V]. |
| `Gon` | Number | Conductance in either conducting region [siemens]. |
| `eps` | Number | Smoothing width of each knee [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
vd &= p.v - n.v \\
vr &= -vd - vz \\
p.i &= gon\cdot \left(vd\cdot 0.5\cdot \left(1 + \tanh\left(\frac{vd}{eps}\right)\right) - vr\cdot 0.5\cdot \left(1 + \tanh\left(\frac{vr}{eps}\right)\right)\right) \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a Zener shunt regulator

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A shunt regulator: 12 V through 100 Ω into a 5.1 V Zener (cathode at the
  output). In breakdown the Zener is Vz in series with 1/Gon, so the output
  is Vz + (12 − Vz)/(1 + R·Gon) = 5.10069 V. }
VoltageSource VS(E=12 [V])
Resistor      R(R=100 [ohm])
Zener         Z(Vz=5.1 [V], Gon=100 [siemens], eps=1e-4 [V])
Ground        G()
connect(VS.p, R.a)
connect(R.b, Z.n)
connect(Z.p, VS.n, G.port)
v_out = Z.n.V - Z.p.V
i_z   = Z.n.I

{ CHECK v_out 5.100689931006899 1e-06 }
{ CHECK i_z 0.06899310068993102 1e-06 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_out = 5.100689931006899
i_z = 0.06899310068993102
```

<!-- verified-reference-example:end -->
