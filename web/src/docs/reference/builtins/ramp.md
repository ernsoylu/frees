---
name: ramp
category: Math
summary: Ramp function max(x, 0).
related: [step, max, abs]
examples: []
tags: [ramp, math, positive part]
---

# ramp

Ramp function max(x, 0).

## Syntax

```
y = ramp(x)
```

## Description

`ramp(x)` returns x for x ≥ 0 and 0 otherwise — the positive part of x.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Any real value. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | max(x, 0), in the units of x. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Positive part of a signed flow

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
q_in  = ramp(-2)     { a reverse flow clips to zero }
q_out = ramp(3.5)

{ CHECK q_in 0 0.000001 }
{ CHECK q_out 3.5 0.0000035 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
q_in = 0
q_out = 3.5
```

<!-- verified-reference-example:end -->
