---
name: cis
category: Complex
summary: e^(j*theta) = cos(theta) + j*sin(theta)
related: []
examples: []
tags: [cis, complex]
references: []
---

# cis

e^(j*theta) = cos(theta) + j*sin(theta)


## Syntax

```
cis(theta)
```

## Description

e^(j*theta) = cos(theta) + j*sin(theta)

## Mathematical Formulation

$$ \operatorname{cis}(\theta) = e^{j\theta} = \cos\theta + j\sin\theta $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Construct a unit phasor

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = cis(pi#/4)

{ CHECK result 0.7071067812 7.071067811865476e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.7071067812
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `theta` | Number | Yes | Flow-deflection angle [rad]. |
