---
name: SigGain
category: Component (signal)
summary: Acausal signal-domain component SigGain with ports in, out.
related: []
examples: []
tags: [siggain, component, signal, acausal]
references: []
generated: true
---

# SigGain

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigGain inst(k)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= k\cdot in.sig
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [out] = SigConst(k)
port(out)
  out.sig = k
end
function [in, out] = SigGain(k)
port(in)
port(out)
  out.sig = k * in.sig
end
function [in1, in2, out] = SigSum()
port(in1)
port(in2)
port(out)
  out.sig = in1.sig + in2.sig
end
SigConst SRC(k=2)
SigGain  A(k=3)
SigGain  B(k=5)
connect(SRC.out, A.in, B.in)

{ CHECK a.in.sig 2 0.000002 }
{ CHECK a.out.sig 6 0.000006 }
{ CHECK b.in.sig 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.in.sig = 2
a.out.sig = 6
b.in.sig = 2
```

<!-- verified-reference-example:end -->
