---
name: FlowSensor
category: Component (fluid)
summary: Measures the mass flow of a stream (a pass-through sensor).
related: []
examples: []
tags: [flowsensor, component, fluid, acausal]
---

# FlowSensor

Measures the mass flow of a stream (a pass-through sensor).

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
FlowSensor inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= in.h \\
mdot_{meas} &= in.mdot
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [out] = FSrc(mdot, P, h0)
port(out)
  out.mdot = mdot
  out.P    = P
  out.h    = h0
end
FSrc       SRC(mdot=2.5, P=100000, h0=0)
FlowSensor FS()
Sink       SNK()
connect(SRC.out, FS.in)
connect(FS.out, SNK.in)

{ CHECK fs.in.h 0 1e-8 }
{ CHECK fs.in.mdot 2.5 0.0000024999999999999998 }
{ CHECK fs.in.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
fs.in.h = 0
fs.in.mdot = 2.5
fs.in.p = 100000
```

<!-- verified-reference-example:end -->
