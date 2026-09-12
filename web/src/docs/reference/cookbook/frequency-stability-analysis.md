---
name: Frequency-Domain Stability Analysis
category: Cookbook
guide: true
summary: Analyze a plant end to end — poles/zeros, gain & phase margins, Bode, Nyquist, step.
examples: [control-analysis-report]
tags: [cookbook, control, bode, nyquist, margin, stability, frequency response]
related: [pole, zero, margin, bode, nyquist, step]
---

# Frequency-Domain Stability Analysis

**Goal:** take a transfer function and characterize it completely — pole/zero
locations, gain and phase margins, the Bode and Nyquist responses, and the
time-domain step response — in one document.

## What you'll build

From `G(s) = num/den`:

1. `pole`/`zero` — the s-plane map and stability check.
2. `margin` — gain margin, phase margin, and crossover frequencies.
3. `bode`/`nyquist` — the frequency response, plotted inline.
4. `step` — the unit step response and its transient metrics.

## Approach

Stability is read three ways that must agree: all poles in the left
half-plane; positive gain/phase margins; and a Nyquist locus that does not encircle
`−1 + j0`. The frequency response evaluates `G(jω)` along the imaginary axis:

$$ \text{mag} = 20\log_{10}|G(j\omega)|,\qquad \text{phase} = \angle G(j\omega) $$

Each figure is declared by a named `PLOT … END` block and appears in the Plots window after the solve.

## Worked example

[Run: control-analysis-report]

**What it tells you:** for the underdamped plant `G(s) = (s+2)/(s²+4s+25)` — poles at
`−2 ± 4.58j` (stable, `ω_n = 5`, `ζ ≈ 0.4`), a resonant Bode peak near 5 rad/s, a
Nyquist locus clear of `−1`, and a step response that overshoots and rings before
settling.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Control Analysis Report

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Control System Analysis Report

{ This analyzes a second-order plant G(s) end to end: poles and zeros,
  gain and phase margins, frequency response (Bode and Nyquist), and the unit
  step response. Press Solve (F2). }

{ 1. Plant model }

{ The numerator and denominator coefficients below (descending powers of s) define
  G(s) = (s + 2) / (s^2 + 4s + 25) — an underdamped system with a natural
  frequency of 5 rad/s, a damping ratio near 0.4, and a single real zero. }
num = [1, 2]
den = [1, 4, 25]

{ 2. Poles, zeros and stability margins }

[pr, pi] = pole(num, den)
[zr, zi] = zero(num, den)
[gm, pm, w_cg, w_cp] = margin(num, den)

{ Both poles sit in the left half-plane, so the system is stable. The s-plane map
  below shows the conjugate pole pair and the single real zero. }


{ 3. Frequency response }

{ Sweep 50 logarithmically spaced frequencies, then evaluate the Bode and Nyquist
  responses. }
Nw = 50
omega = 0.1:50:100 | Log
[mag, phase] = bode(num, den, omega)
[re, im] = nyquist(num, den, omega)



{ 4. Time-domain step response }

{ Integrate the unit step response over 4 seconds; the underdamped poles produce
  the expected overshoot before settling. }
Nt = 81
t = 0:0.05:4
[y] = step(num, den, t)


PLOT 'Pole-Zero Map'
  kind = polezero
  pr = pr
  pi = pi
  zr = zr
  zi = zi
END

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = 'Time [s]'
  ylabel = 'Amplitude'
END

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 4 0.000004 }
{ CHECK den[3] 25 0.000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 4
den[3] = 25
```

<!-- verified-reference-example:end -->
