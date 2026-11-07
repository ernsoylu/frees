---
name: SigChirp
category: Component (signal)
summary: "Linear chirp: a sine whose frequency sweeps from f0 at t = 0 to f1 at t = T."
related: [SigSine]
examples: []
tags: [sigchirp, component, signal, acausal]
references: ["A. V. Oppenheim and R. W. Schafer, Discrete-Time Signal Processing, 3rd ed., Pearson, 2010 (linear frequency modulation)"]
---

# SigChirp

Linear chirp: a sine whose frequency sweeps from f0 at t = 0 to f1 at t = T.

## What it models

A swept-sine test signal, bias + amp·sin(2π·(f0·t + (f1 − f0)·t²/(2T))). The instantaneous frequency f0 + (f1 − f0)·t/T rises linearly, reaching f1 at T and continuing at the same rate after it. Feed it to a plant to see its response change with frequency in one run.

## Domain

A **causal signal-domain** block — each port carries one value `sig`; a signal wire copies the output's value to the inputs it feeds. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
SigChirp inst(amp, f0, f1, T, bias)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `amp` | Number | Amplitude [-]. |
| `f0` | Number | Frequency at t = 0 [Hz]. |
| `f1` | Number | Frequency at t = T [Hz]. |
| `T` | Number | Sweep duration [s]. |
| `bias` | Number | Offset [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.sig &= bias + amp\cdot \sin\left(2\,3.141592653589793\cdot \left(f0\cdot time + \frac{\left(f1 - f0\right)\cdot time^{2}}{2\,t}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a chirp's value and instantaneous frequency

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A unit chirp sweeping 1 Hz → 11 Hz over 1 s, read at t = 50 ms. Its phase
  is 2π·(f0·t + (f1 − f0)·t²/(2T)) = 2π·0.0625, so the value is sin(π/8), and
  its instantaneous frequency f0 + (f1 − f0)·t/T is 1.5 Hz. }
time = 0.05 [s]
SigChirp CH(amp=1, f0=1 [Hz], f1=11 [Hz], T=1 [s], bias=0)
y      = CH.out.sig
f_inst = 1 [Hz] + (11 [Hz] - 1 [Hz]) * time / 1 [s]

{ CHECK y 0.38268343236508984 1e-12 }
{ CHECK f_inst 1.5 1e-12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 0.38268343236508984
f_inst = 1.5
```

<!-- verified-reference-example:end -->
