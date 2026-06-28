---
name: nichols
category: Control Systems
summary: Nichols frequency response — open-loop gain (dB) versus phase (deg).
related: [bode, nyquist, margin]
examples: [nichols-chart]
tags: [control, nichols, frequency response, gain, phase, stability]
references:
  - "Nise, N.S., Control Systems Engineering (7th ed.), Ch. 10, §10.10"
  - "Ogata, K., Modern Control Engineering (5th ed.), Ch. 7"
---

# nichols

Returns the **Nichols frequency response** of `G(s) = num/den` over `omega`:
open-loop magnitude (dB) and phase (deg). Plotted as magnitude-versus-phase on the
Nichols chart, it reads off closed-loop gain and stability margins in one view.

## Syntax

```
CALL nichols(num, den, omega : mag, phase)
[mag, phase] = nichols(num, den, omega)
```

## Description

The Nichols chart overlays loci of constant closed-loop magnitude and phase on the
open-loop gain-phase plane, so the closed-loop peak (and hence damping) is read
directly from where the open-loop curve grazes them.

## Mathematical Formulation

$$ \text{mag}(\omega) = 20\log_{10}|G(j\omega)|\ [\text{dB}], \qquad \text{phase}(\omega) = \angle G(j\omega)\ [\text{deg}] $$

plotted as `mag` vs `phase` (Nise §10.10).

> **Method:** evaluate `G(jω)` at each `omega`; return magnitude in dB and phase in
> degrees for the gain-phase plane.

## Examples

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

## References

1. Nise, N.S. *Control Systems Engineering* (7th ed.), Ch. 10, §10.10.
2. Ogata, K. *Modern Control Engineering* (5th ed.), Ch. 7.
