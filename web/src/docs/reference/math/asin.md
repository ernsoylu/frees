---
name: asin
category: Math
summary: Inverse sine
related: []
examples: []
tags: [asin, math]
references: []
---

# asin

Inverse sine


## Syntax

```
asin(x)
```

## Description

Inverse sine

## Mathematical Formulation

$$ y = \arcsin(x), \qquad \sin(y) = x,\ \ y \in [-\tfrac{\pi}{2}, \tfrac{\pi}{2}] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Recover an angle from its sine

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = asin(0.5)

{ CHECK result 0.5235987756 5.235987755982989e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.5235987756
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
