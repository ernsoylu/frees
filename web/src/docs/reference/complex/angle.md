---
name: angle
category: Complex
summary: Argument of z [rad] (alias anglerad)
related: []
examples: []
tags: [angle, complex]
references: []
---

# angle

Argument of z [rad] (alias anglerad)


## Syntax

```
angle(z)
```

## Description

Argument of z [rad] (alias anglerad)

## Mathematical Formulation

$$ \arg(z) = \operatorname{atan2}(b, a)\ \ [\text{rad}] $$

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
result = angle(z)

{ CHECK result_i 0 1e-8 }
{ CHECK result_r 0.927295218 9.272952180016121e-7 }
{ CHECK z_i 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result_i = 0
result_r = 0.927295218
z_i = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `z` | Number | Yes | Argument (complex or real). |
