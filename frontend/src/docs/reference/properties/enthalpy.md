---
name: enthalpy
category: Fluid Properties
summary: Fluid property: enthalpy from a real-fluid (CoolProp) backend.
related: []
examples: [rankine-cycle, state-tables-multifluid, rankine-cycle, refrigeration-vcr]
tags: [enthalpy, property, fluid, coolprop]
references: []
generated: true
---

# enthalpy

Returns the **enthalpy** of a real fluid from any valid pair of independent state properties (CoolProp backend).

> **Baseline page** — auto-generated from the function registry. Syntax, description, and arguments are authoritative; worked examples, the mathematical formulation, and literature references are being added incrementally.

## Syntax

```
enthalpy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

