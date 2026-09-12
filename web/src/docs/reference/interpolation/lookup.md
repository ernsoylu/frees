---
name: lookup
category: Interpolation
summary: Cell value by 1-based row/col indices
related: []
examples: []
tags: [lookup, interpolation]
references: []
---

# lookup

Cell value by 1-based row/col indices


## Syntax

```
Lookup('t', row, col)
```

## Description

Cell value by 1-based row/col indices

## Mathematical Formulation

$$ \operatorname{Lookup}(t, r, c) = t_{r,c} \quad\text{(1-based cell)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TABLE g(x)
  10   100
  20   400
  30   900
END
n = NLookupRows('g')
c = Lookup('g', 2, 2)
r = LookupRow('g', 1, 25)

{ CHECK c 400 0.00039999999999999996 }
{ CHECK n 3 0.000003 }
{ CHECK r 2.5 0.0000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c = 400
n = 3
r = 2.5
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | Number | Yes | Name of a TABLE block (string). |
| `row` | Number | Yes | Row index (1-based). |
| `col` | Number | Yes | Name of a result-table column. |
