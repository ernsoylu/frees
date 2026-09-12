---
name: arcsin
category: Math
summary: Inverse sine [rad] (alias of asin)
related: []
examples: []
tags: [arcsin, math]
references: []
---

# arcsin

Inverse sine [rad] (alias of asin)


## Syntax

```
arcsin(x)
```

## Description

Inverse sine [rad] (alias of asin)

## Mathematical Formulation

$$ y = \arcsin(x), \qquad \sin(y) = x,\ \ y \in [-\tfrac{\pi}{2}, \tfrac{\pi}{2}] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = arcsin(0.5)

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
