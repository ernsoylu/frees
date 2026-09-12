---
name: SigRateLimiter
category: Component (signal)
summary: Acausal signal-domain component SigRateLimiter with ports in, out.
related: []
examples: []
tags: [sigratelimiter, component, signal, acausal]
references: []
generated: true
---

# SigRateLimiter

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigRateLimiter inst(rate, tau, y0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `rate` | Number |
| `tau` | Number |
| `y0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(y\right) &= rate\cdot \tanh\left(\frac{in.sig - y}{rate\cdot tau}\right) \\
\text{init}\left(y\right) &= y0 \\
out.sig &= y
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigRateLimiter steady: der -> 0 zeroes the tanh argument, the tracker sits
// on its input. rate*tau = 2 keeps the tanh well-scaled for Newton.
// EXPECT y = 3 tol 1e-6
SigConstant    U(k = 3)
SigRateLimiter RL(rate = 2, tau = 1, y0 = 0)
connect(U.out, RL.in)
y = RL.out.sig

{ CHECK rl.in.sig 3 0.000003 }
{ CHECK rl.out.sig 3 0.000003 }
{ CHECK rl.y 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
rl.in.sig = 3
rl.out.sig = 3
rl.y = 3
```

<!-- verified-reference-example:end -->
