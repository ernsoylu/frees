---
name: arccos
category: Math
summary: Inverse cosine [rad] (alias of acos)
related: []
examples: []
tags: [arccos, math]
references: []
---

# arccos

Inverse cosine [rad] (alias of acos)


## Syntax

```
arccos(x)
```

## Description

Inverse cosine [rad] (alias of acos)

## Mathematical Formulation

$$ y = \arccos(x), \qquad \cos(y) = x,\ \ y \in [0, \pi] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = arccos(0.5)

{ CHECK result 1.047197551 0.0000010471975511965978 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.047197551
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
