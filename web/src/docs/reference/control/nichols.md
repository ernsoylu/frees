---
name: nichols
category: Control Systems
summary: Nichols frequency response — open-loop gain (dB) versus phase (deg).
related: [bode, nyquist, margin]
examples: [nichols-chart]
tags: [control, nichols, frequency response, gain, phase, stability]
---

# nichols

Returns the **Nichols frequency response** of `G(s) = num/den` over `omega`:
open-loop magnitude (dB) and phase (deg). Plotted as magnitude-versus-phase on the
Nichols chart, it reads off closed-loop gain and stability margins in one view.

## Syntax

```
[mag, phase] = nichols(num, den, omega)
[mag, phase] = nichols(num, den, omega)
```

## Description

The Nichols chart overlays loci of constant closed-loop magnitude and phase on the
open-loop gain-phase plane, so the closed-loop peak (and hence damping) is read
directly from where the open-loop curve grazes them.

## Mathematical Formulation

$$ \text{mag}(\omega) = 20\log_{10}|G(j\omega)|\ [\text{dB}], \qquad \text{phase}(\omega) = \angle G(j\omega)\ [\text{deg}] $$

plotted as `mag` vs `phase`.

> **Method:** evaluate `G(jω)` at each `omega`; return magnitude in dB and phase in
> degrees for the gain-phase plane.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num = [0, 0, 1]
den = [1, 0.6, 1]
tv = [0, 0.5, 1, 1.5, 2, 3, 5, 8, 12]
[ys] = step(num, den, tv)
[yi] = impulse(num, den, tv)
uu = [0, 1, 1, 1, 1, 1, 1, 1, 1]
[yl] = lsim(num, den, uu, tv)
[Tr, Tp, Ts2, OS] = stepinfo(tv, ys)
om = [0.1, 0.5, 1, 2, 5, 10]
[mg, ph] = bode(num, den, om)
[re, im] = nyquist(num, den, om)
[nmg, nph] = nichols(num, den, om)
[gm, pm, wg, wp] = margin(num, den)

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 0.6 6e-7 }
{ CHECK den[3] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 0.6
den[3] = 1
```

<!-- verified-reference-example:end -->

### Example 1 — Nichols response of a plant

[Run: nichols-chart]

**Expected:** a gain-phase locus whose proximity to the `0 dB, −180°` point reflects
the gain and phase margins.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients (descending powers of `s`). |
| `omega` | Vector | Yes | Frequencies [rad/s]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `mag` | Vector | Magnitude [dB]. |
| `phase` | Vector | Phase [deg]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `EMPTY_FREQUENCY` | `omega` empty | Provide a frequency vector. |
