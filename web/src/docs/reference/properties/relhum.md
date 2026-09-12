---
name: relhum
category: Fluid Properties
summary: Humid-air property: relhum from the real-fluid property backend.
related: []
examples: []
tags: [relhum, property, humid-air, coolprop]
references: []
---

# relhum

Returns the **relhum** of a humid-air (AirH2O) from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
relhum(AirH2O, T=, P=, R=)
```

## Description

A humid-air property; supply the dry-bulb T, total pressure P, and one humidity coordinate (R, W, B, or D). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
w = HumRat(AirH2O, T=298.15, P=101325, R=0.5)
rh = RelHum(AirH2O, T=298.15, P=101325, w=w)

{ CHECK rh 0.5 4.999999999999999e-7 }
{ CHECK w 0.009925739296 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
rh = 0.5
w = 0.009925739296
```

<!-- verified-reference-example:end -->
