---
name: volume
category: Fluid Properties
summary: Fluid property: volume from a real-fluid (CoolProp) backend.
related: []
examples: [rankine-cycle, thermo-compliance, rankine-cycle, engine-cycle-wiebe]
tags: [volume, property, fluid, coolprop]
references: []
generated: true
---

# volume

Returns the **volume** of a real fluid from any valid pair of independent state properties (CoolProp backend).

> **Baseline page** — auto-generated from the function registry. Syntax, description, and arguments are authoritative; worked examples, the mathematical formulation, and literature references are being added incrementally.

## Syntax

```
volume(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

