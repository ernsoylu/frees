---
name: cube
category: Math
summary: Cube, x³.
related: [sqr]
examples: []
tags: [cube, math, power]
---

# cube

Cube, x³.

## Syntax

```
y = cube(x)
```

## Description

`cube(x)` returns x·x·x.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Any real value. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | x³. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Calculate a cube volume

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = cube(3)

{ CHECK result 27 0.000027 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 27
```

<!-- verified-reference-example:end -->
