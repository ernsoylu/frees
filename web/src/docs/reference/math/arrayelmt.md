---
name: arrayelmt
category: Math
summary: Select the i-th element of an array range
related: []
examples: []
tags: [arrayelmt, math]
references: []
---

# arrayelmt

Select the i-th element of an array range


## Syntax

```
ArrayElmt(arr[1:n], i)
```

## Description

Select the i-th element of an array range

## Mathematical Formulation

$$ \operatorname{ArrayElmt}(\{a_1,\dots,a_n\}, i) = a_i $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
data[1] = 10
data[2] = 20
data[3] = 30
data[4] = 40
k = 3
v = ArrayElmt(data[1:4], k)

{ CHECK data[1] 10 0.000009999999999999999 }
{ CHECK data[2] 20 0.000019999999999999998 }
{ CHECK data[3] 30 0.000029999999999999997 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
data[1] = 10
data[2] = 20
data[3] = 30
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `arr[1:n]` | Array | Yes | Array range to index into, e.g. `data[1:n]`. |
| `i` | Number | Yes | 1-based index of the element to return. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `n]` | Number/Array | Computed `n]`. |
| `i` | Number/Array | Computed `i`. |
