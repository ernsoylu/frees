---
name: sum
category: Stats
summary: Sum of vector elements
related: []
examples: []
tags: [sum, stats]
references: []
---

# sum

Sum of vector elements


## Syntax

```
sum(x)
```

## Description

Sum of vector elements

## Mathematical Formulation

$$ \sum_{i=1}^{n} x_i $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
v = 1:1:10
total = Sum(v[1:10])

{ CHECK total 55 0.000054999999999999995 }
{ CHECK v[10] 10 0.000009999999999999999 }
{ CHECK v[1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
total = 55
v[10] = 10
v[1] = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
