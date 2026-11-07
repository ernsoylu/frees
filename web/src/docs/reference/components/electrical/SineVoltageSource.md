---
name: SineVoltageSource
category: Component (electrical)
summary: "Sinusoidal voltage source: v = Voff + Vamp·sin(2π·freq·t + phase)."
related: [SineCurrentSource, VoltageSource, Capacitor]
examples: []
tags: [sinevoltagesource, component, electrical, acausal]
references: ["J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019 (sinusoidal sources and the RC frequency response)"]
---

# SineVoltageSource

Sinusoidal voltage source: v = Voff + Vamp·sin(2π·freq·t + phase).

## What it models

An ideal AC voltage source. It holds the terminal voltage to the sinusoid whatever current flows, with no internal impedance. In a steady solve it takes the value at the document's `time`; in a `DYNAMIC` block it drives the transient.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
SineVoltageSource inst(Vamp, freq, phase, Voff)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Vamp` | Number | Amplitude [V]. |
| `freq` | Number | Frequency [Hz]. |
| `phase` | Number | Phase at t = 0 [rad]. |
| `Voff` | Number | DC offset [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= voff + vamp\cdot \sin\left(2\,3.141592653589793\cdot freq\cdot time + phase\right) \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — an RC low-pass driven at its corner frequency

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 10 V, 159.155 Hz sine drives an RC low-pass (1 kΩ, 1 µF) at its corner
  frequency, ωτ = 1. The exact response from rest is
  v_C = A/(1+(ωτ)²)·(sin ωt − ωτ·cos ωt) + A·ωτ/(1+(ωτ)²)·e^(−t/τ). }
SineVoltageSource VS(Vamp=10 [V], freq=159.1549430918953 [Hz], phase=0 [rad], Voff=0 [V])
Resistor          R(R=1000 [ohm])
Capacitor         CAP(C=1e-6 [farad], V0=0 [V])
Ground            G()
connect(VS.p, R.a)
connect(R.b, CAP.p)
connect(CAP.n, VS.n, G.port)

DYNAMIC drive (method = ida, time = 0 .. 0.02, points = 2001)
END
v_5ms  = ODEValue('cap.vc', 0.005) * 1 [V]
v_20ms = ODEValue('cap.vc', 0.02) * 1 [V]

{ CHECK v_5ms -6.179242565636392 1e-05 }
{ CHECK v_20ms 2.524315954876901 0.0001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_5ms = -6.179242565636392
v_20ms = 2.524315954876901
```

<!-- verified-reference-example:end -->
