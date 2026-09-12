---
name: magnitude
category: Complex
summary: Modulus |z|
related: []
examples: []
tags: [magnitude, complex]
references: []
---

# magnitude

Modulus |z|


## Syntax

```
magnitude(z)
```

## Description

Modulus |z|

## Mathematical Formulation

$$ |z| = \sqrt{a^2 + b^2} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Inspect an AC phasor in complex mode

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

Use these solve options (the `request` fence attribute records the same settings for verification):

```json
{
  "stopCriteria": {
    "complexMode": true
  }
}
```

```frees request={"stopCriteria":{"complexMode":true}}
z = 3 + 4i
result = magnitude(z)

{ CHECK result_i 0 1e-8 }
{ CHECK result_r 5 0.0000049999999999999996 }
{ CHECK z_i 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result_i = 0
result_r = 5
z_i = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `z` | Number | Yes | Argument (complex or real). |
