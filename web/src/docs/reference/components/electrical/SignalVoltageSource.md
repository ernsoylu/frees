---
name: SignalVoltageSource
category: Component (electrical)
summary: "Signal-controlled voltage source: v = k·in."
related: [SignalCurrentSource, SigConstant]
examples: []
tags: [signalvoltagesource, component, electrical, acausal]
references: ["A. S. Sedra and K. C. Smith, Microelectronic Circuits, 7th ed., Oxford University Press, 2014 (dependent sources)"]
---

# SignalVoltageSource

Signal-controlled voltage source: v = k·in.

## What it models

A dependent (controlled) voltage source whose voltage follows a signal wire, scaled by `k` volts per unit. Connect a controller, a table or any signal block to `in` to command a voltage.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `in`

## Usage

```
SignalVoltageSource inst(k)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | Number | Volts per unit of the input signal [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= k\cdot in.sig \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a commanded voltage across a resistor

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A command of 2 sets 1.5 V per unit, 3 V across 3 Ω. }
SigConstant         CMD(k=2)
SignalVoltageSource VS(k=1.5 [V])
Resistor            R(R=3 [ohm])
Ground              G()
connect(CMD.out, VS.in)
connect(VS.p, R.a)
connect(R.b, VS.n, G.port)
i_R = R.a.I

{ CHECK i_r 1 1e-12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
i_r = 1
```

<!-- verified-reference-example:end -->
