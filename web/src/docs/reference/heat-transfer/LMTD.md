---
name: LMTD
category: Heat Transfer
summary: Log-mean temperature difference of a heat exchanger.
related: [hx_effectiveness, hx_NTU]
examples: [hx-effectiveness-ntu]
tags: [heat exchanger, lmtd, log-mean, temperature difference, duty]
---

# LMTD

Returns the **log-mean temperature difference** between two streams from their
terminal temperature differences `dT1` and `dT2`. It is the correct mean driving
temperature for the heat-exchanger rate equation `Q = U·A·F·ΔT_lm` — use it when
the inlet and outlet temperatures are known and you need the duty or the required
`UA`.

## Syntax

```
dTlm = LMTD(dT1, dT2)
```

## Description

For an exchanger, the local temperature difference varies along the flow path, so
the duty is driven not by an arithmetic mean but by the *log-mean* of the two
terminal differences. `dT1` and `dT2` are the hot-minus-cold temperature
differences at the two ends. The result feeds the rate equation with an overall
conductance `UA` and a configuration correction factor `F` (1 for pure
counter/parallel flow).

## Mathematical Formulation

$$ \Delta T_{lm} = \frac{\Delta T_1 - \Delta T_2}{\ln(\Delta T_1 / \Delta T_2)} $$

and the heat-exchanger duty, with overall conductance $UA$ and configuration
correction factor $F$,

$$ Q = U A\, F\, \Delta T_{lm} $$

> **Method:** direct evaluation. As $\Delta T_1 \to \Delta T_2$ the ratio is the
> arithmetic mean (the removable singularity of the log form).

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Cr = 0.5
NTU = 1
eps = hx_effectiveness('counterflow', NTU, Cr)
hx_effectiveness('counterflow', NTU_req, Cr) = 0.75
dTlm = LMTD(50, 20)
Q = 1200 * dTlm

{ CHECK dTlm 32.74070004 0.000032740700038118736 }
{ CHECK eps 0.5647334016 5.647334016064161e-7 }
{ CHECK NTU_req 1.832581464 0.0000018325814637483104 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dTlm = 32.74070004
eps = 0.5647334016
NTU_req = 1.832581464
```

<!-- verified-reference-example:end -->

### Example 1 — Counterflow exchanger end-difference

After rating a counterflow water-to-water exchanger by effectiveness–NTU, the
log-mean of its two end temperature differences gives the mean driving ΔT.

[Run: hx-effectiveness-ntu]

**Expected:** with `dT1 = Th_in − Tc_out ≈ 20.3 K` and `dT2 = Th_out − Tc_in ≈ 32.7 K`,
`dTlm ≈ 26.0 K`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `dT1` | Number | Yes | Temperature difference at one end (hot − cold), same sign as `dT2`. |
| `dT2` | Number | Yes | Temperature difference at the other end. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `dTlm` | Number | Log-mean temperature difference [K]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `dT1` and `dT2` have opposite signs, or one is zero | Use consistent hot−cold differences; a sign change implies a temperature cross — check the stream arrangement. |
