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

> **Auto-generated** from the function registry. The syntax, description, and arguments are taken directly from the implementation; a worked example and an expanded mathematical derivation are added as the page is curated.

## Syntax

```
enthalpy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## References

1. Bell, I.H. et al. (2014), Ind. Eng. Chem. Res. 53:2498 — CoolProp.

