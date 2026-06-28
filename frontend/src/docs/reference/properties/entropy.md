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

> **Auto-generated** from the function registry. The syntax, description, and arguments are taken directly from the implementation; a worked example and an expanded mathematical derivation are added as the page is curated.

## Syntax

```
entropy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## References

1. Bell, I.H. et al. (2014), Ind. Eng. Chem. Res. 53:2498 — CoolProp.

