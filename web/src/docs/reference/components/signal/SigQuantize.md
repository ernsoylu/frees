---
name: SigQuantize
category: Component (signal)
summary: "Quantizer: rounds the input to the nearest multiple of q, each step smoothed over a fraction eps of q."
related: [SigSampleHold]
examples: []
tags: [sigquantize, component, signal, acausal]
references: ["A. V. Oppenheim and R. W. Schafer, Discrete-Time Signal Processing, 3rd ed., Pearson, 2010 (quantization)"]
---

# SigQuantize

Quantizer: rounds the input to the nearest multiple of q, each step smoothed over a fraction eps of q.

## What it models

The amplitude quantization of an analog-to-digital converter: the output is q·round(in/q). Each step is smoothed by a tanh over a fraction `eps` of the step (eps = 0.01 is sharp), so a solver can pass through it. Combine it with `SigSampleHold` to model a sampled converter: quantization in amplitude, sample-and-hold in time.

## Domain

A **causal signal-domain** block — each port carries one value `sig`; a signal wire copies the output's value to the inputs it feeds. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
SigQuantize inst(q, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `q` | Number | Quantization step [-]. |
| `eps` | Number | Smoothing width as a fraction of q [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.sig &= q\cdot \left(\text{floor}\left(\frac{in.sig}{q}\right) + 0.5\,\left(1 + \tanh\left(\frac{\frac{in.sig}{q} - \text{floor}\left(\frac{in.sig}{q}\right) - 0.5}{eps}\right)\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — round two levels to a 0.25 step

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A quantizer with a 0.25 step rounds 0.30 to 0.25 and 0.40 to 0.50. }
SigConstant LO(k=0.30)
SigConstant HI(k=0.40)
SigQuantize QL(q=0.25, eps=0.01)
SigQuantize QH(q=0.25, eps=0.01)
connect(LO.out, QL.in)
connect(HI.out, QH.in)
y_lo = QL.out.sig
y_hi = QH.out.sig

{ CHECK y_lo 0.25 1e-09 }
{ CHECK y_hi 0.5 1e-08 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y_lo = 0.25
y_hi = 0.5
```

<!-- verified-reference-example:end -->
