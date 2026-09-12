---
name: entropy
category: Fluid Properties
summary: Fluid property: entropy from the real-fluid property backend.
related: []
examples: [rankine-cycle, rankine-cycle, refrigeration-vcr]
tags: [entropy, property, fluid, coolprop]
references: []
---

# entropy

Returns the **entropy** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
entropy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
h1 = Enthalpy(R134a, T=300, x=1)
s1 = Entropy(R134a, T=300, x=1)
P1 = Pressure(R134a, T=300, x=1)
v1 = Volume(R134a, T=300, x=1)

{ CHECK h1 413265.6843 0.4132656843372975 }
{ CHECK P1 702820.6472 0.7028206471670808 }
{ CHECK s1 1715.577416 0.0017155774162300062 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h1 = 413265.6843 [J/kg]
P1 = 702820.6472 [Pa]
s1 = 1715.577416 [J/kg-K]
```

<!-- verified-reference-example:end -->
