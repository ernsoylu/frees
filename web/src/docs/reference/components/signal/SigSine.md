---
name: SigSine
category: Component (signal)
summary: "Sine: bias + amp·sin(2π·freq·t + phase)."
related: []
examples: []
tags: [sigsine, component, signal, acausal]
references: []
---

# SigSine

Sine: bias + amp·sin(2π·freq·t + phase).

freq [Hz], phase [rad].

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigSine inst(amp, freq, phase, bias)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `amp` | Number |
| `freq` | Number |
| `phase` | Number |
| `bias` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= bias + amp\cdot \sin\left(2\,3.141592653589793\cdot freq\cdot time + phase\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigSine: bias + amp*sin(2*pi*freq*t) at t = 0.125 s of a 1 Hz wave
// -> 1 + 2*sin(pi/4) = 1 + sqrt(2).
// EXPECT y = 2.414213562 tol 1e-8
SigSine SN(amp = 2, freq = 1, phase = 0, bias = 1)
time = 0.125
y = SN.out.sig

{ CHECK sn.out.sig 2.414213562 0.0000024142135623730947 }
{ CHECK y 2.414213562 0.0000024142135623730947 }
{ CHECK time 0.125 1.25e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
sn.out.sig = 2.414213562
y = 2.414213562
time = 0.125
```

<!-- verified-reference-example:end -->
