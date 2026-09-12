---
name: cosh
category: Math
summary: Hyperbolic cosine
related: []
examples: []
tags: [cosh, math]
references: []
---

# cosh

Hyperbolic cosine


## Syntax

```
cosh(x)
```

## Description

Hyperbolic cosine

## Mathematical Formulation

$$ \cosh(x) = \frac{e^{x} + e^{-x}}{2} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a symmetric hyperbolic profile

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = cosh(0.5)

{ CHECK result 1.127625965 0.0000011276259652063807 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.127625965
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
