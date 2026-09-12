---
name: atan2
category: Math
summary: Four-quadrant inverse tangent
related: []
examples: []
tags: [atan2, math]
references: []
---

# atan2

Four-quadrant inverse tangent


## Syntax

```
atan2(y, x)
```

## Description

Four-quadrant inverse tangent

## Mathematical Formulation

$$ \operatorname{atan2}(y,x) = \arg(x + jy) \in (-\pi, \pi] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
phi = atan2(1, -1)        { 2.356 rad = 135 deg }

{ CHECK phi 2.35619449 0.0000023561944901923448 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
phi = 2.35619449
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `y` | Number | Yes | Value / second coordinate. |
| `x` | Number | Yes | Vapor quality (0–1). |
