---
name: feedback
category: Control Systems
summary: Close a feedback loop, T = G1/(1 + G1·G2).
related: [series, margin, pole]
examples: [cruise-control]
tags: [control, feedback, closed loop, block diagram, transfer function]
---

# feedback

Returns the **closed-loop transfer function** of a feedback interconnection —
`T(s) = G1(s) / (1 + G1(s)·G2(s))` — as a single `num/den` pair. With `G2 = 1`
(unity feedback) it gives the standard reference-to-output closed loop.

## Syntax

```
[num, den] = feedback(num1, den1, num2, den2)
[num, den] = feedback(num1, den1, num2, den2)
```

## Description

`G1` is the forward path and `G2` the feedback path (default negative feedback).
The closed-loop poles — the roots of `1 + G1·G2` — set the stability and transient
behavior of the loop.

## Mathematical Formulation

For negative feedback,

$$ T(s) = \frac{G_1(s)}{1 + G_1(s)\,G_2(s)} = \frac{\text{num}_1\,\text{den}_2}{\text{den}_1\,\text{den}_2 + \text{num}_1\,\text{num}_2} $$

> **Method:** form the closed-loop numerator and denominator by polynomial
> multiplication and addition.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num1 = [0, 1]
den1 = [1, 1]
num2 = [1]
den2 = [1]
[num_out, den_out] = feedback(num1, den1, num2, den2)

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

### Example 1 — Closed-loop cruise control

Close the open-loop `L(s)` with unity feedback (`H(s) = 1`) to get the
reference-to-velocity closed loop `T(s)`:

[Run: cruise-control]

**Expected:** `T(s) = L/(1 + L)` — a stable closed loop tracking the set speed,
with the PI integrator giving zero steady-state error.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num1`, `den1` | Vector | Yes | Forward-path transfer function `G1`. |
| `num2`, `den2` | Vector | Yes | Feedback-path transfer function `G2` (use `[1],[1]` for unity feedback). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `num` | Vector | Closed-loop numerator. |
| `den` | Vector | Closed-loop denominator (roots = closed-loop poles). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `IMPROPER_LOOP` | Forward path improper | Ensure `G1` is proper so the closed loop is realizable. |
