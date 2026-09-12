---
name: errorconst
category: Control Systems
summary: Static error constants Kp, Kv, Ka of an open-loop system.
related: [margin, feedback, step]
examples: []
tags: [control, error constant, steady state error, position, velocity, acceleration]
---

# errorconst

Returns the **static error constants** — position `Kp`, velocity `Kv`, and
acceleration `Ka` — of an open-loop system `num/den`. They set the steady-state
tracking error of the unity-feedback closed loop to step, ramp, and parabolic
inputs.

## Syntax

```
[Kp, Kv, Ka] = errorconst(num, den)
[Kp, Kv, Ka] = errorconst(num, den)
```

## Mathematical Formulation

For open-loop `G(s)`:

$$ K_p = \lim_{s\to 0} G(s), \quad K_v = \lim_{s\to 0} s\,G(s), \quad K_a = \lim_{s\to 0} s^2 G(s) $$

with steady-state errors `e_step = 1/(1+Kp)`, `e_ramp = 1/Kv`, `e_parabola = 1/Ka`.

> **Method:** evaluate the low-frequency limits from the system type (number of
> integrators).

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num = [0, 1, 3]
den = [1, 3, 2]
[rr, ri, pr2, pi2, kk] = residue(num, den)
dr = [1, 1, 2, 8]
[nrhp, stable] = routh(dr)
[lk, lcpr, lcpi] = rlocus(num, den)
[Kpos, Kvel, Kacc] = errorconst(num, den)

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 3 0.000003 }
{ CHECK den[3] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 3
den[3] = 2
```

<!-- verified-reference-example:end -->

```
{ [Kp, Kv, Ka] = errorconst(num, den); a type-1 system has finite Kv, infinite Kp }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Open-loop numerator (descending powers of `s`). |
| `den` | Vector | Yes | Open-loop denominator. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Kp` | Number | Position error constant. |
| `Kv` | Number | Velocity error constant. |
| `Ka` | Number | Acceleration error constant. |
