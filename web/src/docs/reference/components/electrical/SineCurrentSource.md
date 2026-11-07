---
name: SineCurrentSource
category: Component (electrical)
summary: "Sinusoidal current source: i = Ioff + Iamp·sin(2π·freq·t + phase), driven out of p."
related: [SineVoltageSource, CurrentSource]
examples: []
tags: [sinecurrentsource, component, electrical, acausal]
references: ["J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019 (sinusoidal sources)"]
---

# SineCurrentSource

Sinusoidal current source: i = Ioff + Iamp·sin(2π·freq·t + phase), driven out of p.

## What it models

An ideal AC current source. It forces the sinusoidal current out of `p`, through the external circuit and back into `n`, whatever voltage that takes.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
SineCurrentSource inst(Iamp, freq, phase, Ioff)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Iamp` | Number | Amplitude [A]. |
| `freq` | Number | Frequency [Hz]. |
| `phase` | Number | Phase at t = 0 [rad]. |
| `Ioff` | Number | DC offset [A]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.i &= -\left(ioff + iamp\cdot \sin\left(2\,3.141592653589793\cdot freq\cdot time + phase\right)\right) \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a sine current through a resistor at one instant

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 2 A, 50 Hz sine current through 5 Ω, evaluated at the instant t = 2.5 ms
  (an eighth of a period): v = R·Iamp·sin(2π·f·t) = 10·sin(π/4) = 7.0711 V.
  In a DYNAMIC block the same source drives a transient. }
time = 0.0025 [s]
SineCurrentSource IS(Iamp=2 [A], freq=50 [Hz], phase=0 [rad], Ioff=0 [A])
Resistor          R(R=5 [ohm])
Ground            G()
connect(IS.p, R.a)
connect(R.b, IS.n, G.port)
v_R = R.a.V - R.b.V

{ CHECK v_r 7.0710678118654755 1e-09 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_r = 7.0710678118654755
```

<!-- verified-reference-example:end -->
