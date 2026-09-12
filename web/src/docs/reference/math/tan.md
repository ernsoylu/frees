---
name: tan
category: Math
summary: Tangent of x
related: []
examples: []
tags: [tan, math]
references: []
---

# tan

Tangent of x


## Syntax

```
tan(x)
```

## Description

Tangent of x

## Mathematical Formulation

$$ \tan(x) = \frac{\sin x}{\cos x}, \qquad x \text{ in radians} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
y = tan(z)
z = 1

{ CHECK y 1.557407725 0.0000015574077246549021 }
{ CHECK z 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 1.557407725
z = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
