---
name: SigSampleHold
category: Component (signal)
summary: "Sample-and-hold: tracks the input during a short aperture around every sample instant and holds it between them."
related: [SigQuantize, SigFirstOrder]
examples: []
tags: [sigsamplehold, component, signal, acausal]
references: ["W. Kester (ed.), The Data Conversion Handbook, Analog Devices / Newnes, 2005 (track-and-hold amplifiers, aperture and acquisition time)"]
---

# SigSampleHold

Sample-and-hold: tracks the input during a short aperture around every sample instant and holds it between them.

## What it models

A track-and-hold stage, as built in hardware. For an aperture `ta` centred on every instant k·Ts, the output follows the input with time constant `tau`, and for the rest of the period it holds the value it reached. Keep tau a small fraction of ta: the acquisition error is about e^(−ta/tau). The aperture is a smooth periodic gate with edges a tenth of ta, so the integrator never meets a jump; it is not an instantaneous, event-driven sampler. It needs a `DYNAMIC` block.

## Domain

A **causal signal-domain** block — each port carries one value `sig`; a signal wire copies the output's value to the inputs it feeds. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
SigSampleHold inst(Ts, ta, tau, y0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Ts` | Number | Sample period [s]. |
| `ta` | Number | Aperture (tracking window) [s]. |
| `tau` | Number | Tracking time constant [s]. |
| `y0` | Number | Initial held value [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
ca &= \cos\left(\frac{3.141592653589793\,ta}{ts}\right) \\
u &= \frac{\cos\left(\frac{2\,3.141592653589793\cdot time}{ts}\right) - ca}{1 - ca} \\
g &= 0.5\,\left(1 + \tanh\left(\frac{u}{0.1}\right)\right) \\
\text{der}\left(y\right) &= \frac{g\cdot \left(in.sig - y\right)}{tau} \\
\text{init}\left(y\right) &= y0 \\
out.sig &= y
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a step between samples waits for the next one

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A sample-and-hold every 100 ms (1 ms aperture, 20 µs tracking) sees its
  input step from 0 to 1 at t = 30 ms, between samples. It holds 0 until the
  aperture around t = 100 ms, then holds 1: the aperture lasts about fifty
  tracking time constants, so the residue e^(−50) is far below the CHECK. }
SigStep       IN(t0=0.03, before=0, after=1, eps=1e-4)
SigSampleHold SH(Ts=0.1 [s], ta=0.001 [s], tau=2e-5 [s], y0=0)
SigFirstOrder VIEW(tau=1 [s], y0=0)
connect(IN.out, SH.in)
connect(SH.out, VIEW.in)
DYNAMIC hold (method = ida, time = 0 .. 0.2, points = 2001)
END
y_before = ODEValue('sh.out.sig', 0.09)
y_after  = ODEValue('sh.out.sig', 0.15)

{ CHECK y_before 0 1e-09 }
{ CHECK y_after 1 1e-06 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y_before = 0
y_after = 1
```

<!-- verified-reference-example:end -->
