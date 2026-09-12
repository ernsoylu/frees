---
name: dewpoint
category: Fluid Properties
summary: Humid-air property: dewpoint from the real-fluid property backend.
related: []
examples: []
tags: [dewpoint, property, humid-air, coolprop]
references: []
---

# dewpoint

Returns the **dewpoint** of a humid-air (AirH2O) from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
dewpoint(AirH2O, T=, P=, R=)
```

## Description

A humid-air property; supply the dry-bulb T, total pressure P, and one humidity coordinate (R, W, B, or D). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
T_wb = WetBulb(AirH2O, T=298.15, P=101325, R=0.5)
T_dp = DewPoint(AirH2O, T=298.15, P=101325, R=0.5)

{ CHECK T_dp 287.0168866 0.0002870168866488805 }
{ CHECK T_wb 291.0334868 0.00029103348681030897 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
T_dp = 287.0168866 [K]
T_wb = 291.0334868 [K]
```

<!-- verified-reference-example:end -->
