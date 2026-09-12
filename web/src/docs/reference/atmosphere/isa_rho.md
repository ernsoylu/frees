---
name: isa_rho
category: Atmosphere
summary: ISA 1976 density [kg/m^3] at geopotential altitude [m]
related: []
examples: []
tags: [isa, rho, atmosphere]
references:
  - "U.S. Standard Atmosphere, 1976 (NOAA/NASA/USAF)"
---

# isa_rho

ISA 1976 density [kg/m^3] at geopotential altitude [m]


## Syntax

```
isa_rho(alt)
```

## Description

ISA 1976 density [kg/m^3] at geopotential altitude [m]

## Mathematical Formulation

$$ \rho(h) = \frac{P(h)\,M}{R\,T(h)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
T0   = isa_T(0)
T5   = isa_T(5000)
P5   = isa_P(5000)
rho5 = isa_rho(5000)
T11  = isa_T(11000)

{ CHECK P5 54020.4954 0.05402049540145998 }
{ CHECK rho5 0.7361106665 7.361106665094329e-7 }
{ CHECK T0 288.15 0.00028815 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
P5 = 54020.4954 [Pa]
rho5 = 0.7361106665 [kg/m^3]
T0 = 288.15 [K]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `alt` | Number | Yes | Geopotential altitude [m]. |

## References

1. U.S. Standard Atmosphere, 1976 (NOAA/NASA/USAF).
