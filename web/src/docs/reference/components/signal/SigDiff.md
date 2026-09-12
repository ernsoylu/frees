---
name: SigDiff
category: Component (signal)
summary: Acausal signal-domain component SigDiff with ports in1, in2, out.
related: []
examples: []
tags: [sigdiff, component, signal, acausal]
references: []
generated: true
---

# SigDiff

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigDiff inst(param = value, ...)
```

## Ports

`in1`, `in2`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= in1.sig - in2.sig
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
SigConst R(k=1)
SigGain  FWD(k=8)
function [inp, inm, out] = SigDiff()
port(inp)
port(inm)
port(out)
  out.sig = inp.sig - inm.sig
end
SigDiff  ERR()
connect(R.out, ERR.inp)
connect(ERR.out, FWD.in)
connect(FWD.out, ERR.inm)

{ CHECK err.inm.sig 0.8888888889 8.888888888888888e-7 }
{ CHECK err.inp.sig 1 0.000001 }
{ CHECK err.out.sig 0.1111111111 1.111111111111111e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
err.inm.sig = 0.8888888889
err.inp.sig = 1
err.out.sig = 0.1111111111
```

<!-- verified-reference-example:end -->
