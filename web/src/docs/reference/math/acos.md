---
name: acos
category: Math
summary: Inverse cosine
related: []
examples: []
tags: [acos, math]
references: []
---

# acos

Inverse cosine


## Syntax

```
acos(x)
```

## Description

Inverse cosine

## Mathematical Formulation

$$ y = \arccos(x), \qquad \cos(y) = x,\ \ y \in [0, \pi] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Recover an angle from its cosine

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = acos(0.5)

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
