---
name: atan
category: Math
summary: Inverse tangent
related: []
examples: []
tags: [atan, math]
references: []
---

# atan

Inverse tangent


## Syntax

```
atan(x)
```

## Description

Inverse tangent

## Mathematical Formulation

$$ y = \arctan(x), \qquad \tan(y) = x $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a slope angle

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = atan(1)

{ CHECK result 0.7853981634 7.853981633974482e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.7853981634
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
