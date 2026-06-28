---
name: viscosity
category: Fluid Properties
summary: Fluid property: viscosity from a real-fluid (CoolProp) backend.
related: []
examples: []
tags: [viscosity, property, fluid, coolprop]
references: []
generated: true
---

# viscosity

Returns the **viscosity** of a real fluid from any valid pair of independent state properties (CoolProp backend).

> **Baseline page** — auto-generated from the function registry. Syntax, description, and arguments are authoritative; worked examples, the mathematical formulation, and literature references are being added incrementally.

## Syntax

```
viscosity(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

