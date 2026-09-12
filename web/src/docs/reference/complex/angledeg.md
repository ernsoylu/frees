---
name: angledeg
category: Complex
summary: Argument of z [deg]
related: []
examples: []
tags: [angledeg, complex]
references: []
---

# angledeg

Argument of z [deg]


## Syntax

```
angledeg(z)
```

## Description

Argument of z [deg]

## Mathematical Formulation

$$ \arg(z) = \operatorname{atan2}(b, a)\cdot\tfrac{180}{\pi}\ \ [\text{deg}] $$

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
result = angledeg(z)

{ CHECK result_i 0 1e-8 }
{ CHECK result_r 53.13010235 0.000053130102354155975 }
{ CHECK z_i 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result_i = 0
result_r = 53.13010235
z_i = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `z` | Number | Yes | Argument (complex or real). |
