---
name: product
category: Math
summary: Product series Pi(term) over i = lo..hi
related: []
examples: []
tags: [product, math]
references: []
---

# product

Product series Pi(term) over i = lo..hi


## Syntax

```
product(i, lo, hi, term)
```

## Description

Product series Pi(term) over i = lo..hi

## Mathematical Formulation

$$ \prod_{i=\text{lo}}^{\text{hi}} \text{term}(i) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
x = 5
y = If(x, 10, 100, 200, 300)
total = Sum(i, 1, 4, i^2)
prod = Product(j, 1, 3, j + 1)

{ CHECK prod 24 0.000024 }
{ CHECK total 30 0.000029999999999999997 }
{ CHECK y 100 0.00009999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
prod = 24
total = 30
y = 100
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `i` | Number | Yes | Index. |
| `lo` | Number | Yes | Lower bound. |
| `hi` | Number | Yes | Upper bound. |
| `term` | Number | Yes | Series-term expression. |
