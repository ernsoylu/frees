---
name: entropy
category: Fluid Properties
summary: Fluid property: entropy from a real-fluid (CoolProp) backend.
related: []
examples: [rankine-cycle, rankine-cycle, refrigeration-vcr]
tags: [entropy, property, fluid, coolprop]
references: []
generated: true
---

# entropy

Returns the **entropy** of a real fluid from any valid pair of independent state properties (CoolProp backend).

> **Baseline page** — auto-generated from the function registry. Syntax, description, and arguments are authoritative; worked examples, the mathematical formulation, and literature references are being added incrementally.

## Syntax

```
entropy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

