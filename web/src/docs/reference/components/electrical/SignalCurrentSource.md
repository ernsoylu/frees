---
name: SignalCurrentSource
category: Component (electrical)
summary: "Signal-controlled current source: i = k·in, driven out of p."
related: [SignalVoltageSource, SigConstant]
examples: []
tags: [signalcurrentsource, component, electrical, acausal]
references: ["A. S. Sedra and K. C. Smith, Microelectronic Circuits, 7th ed., Oxford University Press, 2014 (dependent sources)"]
---

# SignalCurrentSource

Signal-controlled current source: i = k·in, driven out of p.

## What it models

A dependent (controlled) current source whose current follows a signal wire, scaled by `k` amperes per unit.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `in`

## Usage

```
SignalCurrentSource inst(k)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | Number | Amperes per unit of the input signal [A]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.i &= -k\cdot in.sig \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a commanded current through a resistor

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A command of 2 sets 0.25 A per unit, 0.5 A through 8 Ω. }
SigConstant         CMD(k=2)
SignalCurrentSource IS(k=0.25 [A])
Resistor            R(R=8 [ohm])
Ground              G()
connect(CMD.out, IS.in)
connect(IS.p, R.a)
connect(R.b, IS.n, G.port)
v_R = R.a.V - R.b.V

{ CHECK v_r 4 1e-12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_r = 4
```

<!-- verified-reference-example:end -->
