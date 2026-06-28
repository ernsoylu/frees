---
name: wetbulb
category: Fluid Properties
summary: Humid-air property: wetbulb from a real-fluid (CoolProp) backend.
related: []
examples: []
tags: [wetbulb, property, humid-air, coolprop]
references: []
generated: true
---

# wetbulb

Returns the **wetbulb** of a humid-air (AirH2O) from any valid pair of independent state properties (CoolProp backend).

> **Auto-generated** from the function registry. The syntax, description, and arguments are taken directly from the implementation; a worked example and an expanded mathematical derivation are added as the page is curated.

## Syntax

```
wetbulb(AirH2O, T=, P=, R=)
```

## Description

A humid-air property; supply the dry-bulb T, total pressure P, and one humidity coordinate (R, W, B, or D). Property names are case-insensitive.

## References

1. Bell, I.H. et al. (2014), Ind. Eng. Chem. Res. 53:2498 — CoolProp.

