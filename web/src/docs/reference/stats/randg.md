---
name: randg
category: Stats
summary: Gaussian (normal) random number
related: []
examples: []
tags: [randg, stats]
---

# randg

Gaussian (normal) random number


## Syntax

```
randg(mu, sigma)
```

## Description

Gaussian (normal) random number

## Mathematical Formulation

$$ X \sim \mathcal{N}(\mu, \sigma^2) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Generate a reproducible measurement sample

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = randg(20, 0.5, 42)

{ CHECK result 20.57095266 0.000020570952657736525 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 20.57095266
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `mu` | Number | Yes | Dynamic viscosity [Pa·s]. |
| `sigma` | Number | Yes | Surface tension [N/m]. |
