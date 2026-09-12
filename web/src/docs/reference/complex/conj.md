---
name: conj
category: Complex
summary: Complex conjugate
related: []
examples: []
tags: [conj, complex]
references: []
---

# conj

Complex conjugate


## Syntax

```
conj(z)
```

## Description

Complex conjugate

## Mathematical Formulation

$$ \bar z = \overline{a + jb} = a - jb $$

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
result = conj(z)

{ CHECK result_i -4 0.000004 }
{ CHECK result_r 3 0.000003 }
{ CHECK z_i 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result_i = -4
result_r = 3
z_i = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `z` | Number | Yes | Argument (complex or real). |
