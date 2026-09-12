---
name: cv
category: Fluid Properties
summary: Fluid property: cv from the real-fluid property backend.
related: []
examples: []
tags: [cv, property, fluid, coolprop]
references: []
---

# cv

Returns the **cv** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
cv(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
ThermalSource SURF(T=350)
Convection CV(htc=10, area=2)
Radiation  RD(emis=0.9, area=2)
ThermalSource AIR(T=300)
ThermalSource SUR(T=300)
connect(SURF.port, CV.a, RD.a)
connect(CV.b, AIR.port)
connect(RD.b, SUR.port)

{ CHECK air.port.qdot 1000 0.001 }
{ CHECK air.port.t 300 0.0003 }
{ CHECK cv.a.qdot 1000 0.001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
air.port.qdot = 1000
air.port.t = 300
cv.a.qdot = 1000
```

<!-- verified-reference-example:end -->
