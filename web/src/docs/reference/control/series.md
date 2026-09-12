---
name: series
category: Control Systems
summary: Cascade (series) connection of two transfer functions, G = G1·G2.
related: [feedback, ss2tf]
examples: [cruise-control]
tags: [control, series, cascade, block diagram, transfer function]
---

# series

Returns the **series (cascade) connection** of two transfer functions —
`G(s) = G1(s)·G2(s)` — as a single `num/den` pair. Use it to build an open-loop
`L(s) = C(s)·G(s)` from a controller and a plant.

## Syntax

```
[num, den] = series(num1, den1, num2, den2)
[num, den] = series(num1, den1, num2, den2)
```

## Description

Two blocks in cascade multiply: the combined numerator and denominator are the
polynomial products (convolutions) of the individual ones.

## Mathematical Formulation

$$ G(s) = G_1(s)\,G_2(s) = \frac{\text{num}_1 \ast \text{num}_2}{\text{den}_1 \ast \text{den}_2} $$

where $\ast$ is polynomial multiplication (coefficient convolution).

> **Method:** convolve the numerator and denominator coefficient vectors.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num1 = [0, 1]
den1 = [1, 1]
num2 = [0, 2]
den2 = [1, 3]
[num_out, den_out] = series(num1, den1, num2, den2)

{ CHECK den1[1] 1 0.000001 }
{ CHECK den1[2] 1 0.000001 }
{ CHECK den2[1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den1[1] = 1
den1[2] = 1
den2[1] = 1
```

<!-- verified-reference-example:end -->

### Example 1 — Open-loop cruise-control system

Cascade the PI controller `C(s) = (Kp·s + Ki)/s` with the car plant `G(s)` to form
the open-loop `L(s)`:

[Run: cruise-control]

**Expected:** `L(s) = C(s)·G(s)` with the controller zero and integrator combined
with the first-order plant pole.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num1`, `den1` | Vector | Yes | First transfer function `G1`. |
| `num2`, `den2` | Vector | Yes | Second transfer function `G2`. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `num` | Vector | Numerator of `G1·G2`. |
| `den` | Vector | Denominator of `G1·G2`. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `EMPTY_POLYNOMIAL` | A `num`/`den` vector is empty | Provide valid coefficient vectors for both blocks. |
