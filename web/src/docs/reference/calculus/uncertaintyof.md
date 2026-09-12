---
name: uncertaintyof
category: Calculus
summary: Propagated uncertainty of X (resolved in a second solve pass)
related: []
examples: [correlated-temperature-heat-loss, uncertain-tank-inventory]
tags: [uncertaintyof, calculus]
references:
  - "JCGM 100:2008 (GUM)"
---

# uncertaintyof

Propagated uncertainty of X (resolved in a second solve pass)


## Syntax

```
UncertaintyOf(X)
```

## Description

Propagated uncertainty of X (resolved in a second solve pass)

## Mathematical Formulation

$$ u(X) = \text{user-supplied or RSS-propagated uncertainty of } X $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

Use these solve options (the `request` fence attribute records the same settings for verification):

```json
{
  "variableInfo": [
    {
      "name": "x",
      "guess": 5,
      "uncertainty": 0.15
    }
  ]
}
```

```frees request={"variableInfo":[{"name":"x","guess":5,"uncertainty":0.15}]}
// frees-language: 2
y = x
x = 5
u_y = UncertaintyOf(y)

{ CHECK u_y 0.15 1.5e-7 }
{ CHECK uncertaintyof$u_y 0 1e-8 }
{ CHECK uncertaintyof$x 0.15 1.5e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
u_y = 0.15
uncertaintyof$u_y = 0
uncertaintyof$x = 0.15
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `X` | Number | Yes | Lockhart–Martinelli parameter. |

## References

1. JCGM 100:2008 — Evaluation of measurement data: Guide to the expression of uncertainty in measurement (GUM).
