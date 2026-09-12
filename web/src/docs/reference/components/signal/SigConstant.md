---
name: SigConstant
category: Component (signal)
summary: Acausal signal-domain component SigConstant with ports out.
related: []
examples: []
tags: [sigconstant, component, signal, acausal]
references: []
generated: true
---

# SigConstant

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigConstant inst(k)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= k
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigLeadLag steady: x -> in, out = x + (T1/T2)*(in - x) = in (DC gain 1).
// EXPECT y = 2 tol 1e-9
SigConstant U(k = 2)
SigLeadLag  LL(T1 = 0.5, T2 = 2, y0 = 0)
connect(U.out, LL.in)
y = LL.out.sig

{ CHECK ll.in.sig 2 0.000002 }
{ CHECK ll.out.sig 2 0.000002 }
{ CHECK ll.x 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ll.in.sig = 2
ll.out.sig = 2
ll.x = 2
```

<!-- verified-reference-example:end -->
