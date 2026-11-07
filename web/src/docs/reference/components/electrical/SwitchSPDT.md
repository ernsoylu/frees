---
name: SwitchSPDT
category: Component (electrical)
summary: "Signal-driven changeover switch (SPDT): the common terminal joins a while the control is above the threshold, b below it."
related: [Switch]
examples: []
tags: [switchspdt, component, electrical, acausal]
references: ["P. Horowitz and W. Hill, The Art of Electronics, 3rd ed., Cambridge University Press, 2015 (switches)"]
---

# SwitchSPDT

Signal-driven changeover switch (SPDT): the common terminal joins a while the control is above the threshold, b below it.

## What it models

A single-pole double-throw switch. `com` connects to `a` while `ctrl` is above `thresh` and to `b` below it, each contact blending between `Ron` and `Roff` (tanh, width `eps`). Both contacts change together, with no break-before-make interval.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`com`, `a`, `b`, `ctrl`

## Usage

```
SwitchSPDT inst(Ron, Roff, thresh, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Ron` | Number | Closed contact resistance [ohm]. |
| `Roff` | Number | Open contact resistance [ohm] (leakage). |
| `thresh` | Number | Control level of the changeover [-]. |
| `eps` | Number | Width of the transition in control units [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
w &= 0.5\,\left(1 + \tanh\left(\frac{ctrl.sig - thresh}{eps}\right)\right) \\
a.i &= \left(\frac{w}{ron} + \frac{1 - w}{roff}\right)\cdot \left(a.v - com.v\right) \\
b.i &= \left(\frac{1 - w}{ron} + \frac{w}{roff}\right)\cdot \left(b.v - com.v\right) \\
com.i + a.i + b.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — route a source to one of two loads

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A changeover switch routes a 10 V source to load A (100 Ω) while its
  control is 1; load B (200 Ω) sees only the open-contact leakage. }
VoltageSource VS(E=10 [V])
SigConstant   CMD(k=1)
SwitchSPDT    SW(Ron=0.01 [ohm], Roff=1e9 [ohm], thresh=0.5, eps=0.01)
Resistor      RA(R=100 [ohm])
Resistor      RB(R=200 [ohm])
Ground        G()
connect(CMD.out, SW.ctrl)
connect(VS.p, SW.com)
connect(SW.a, RA.a)
connect(SW.b, RB.a)
connect(RA.b, RB.b, VS.n, G.port)
i_A = RA.a.I
i_B = RB.a.I

{ CHECK i_a 0.0999900009999 1e-09 }
{ CHECK i_b 9.999998e-09 1e-12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
i_a = 0.0999900009999
i_b = 9.999998e-09
```

<!-- verified-reference-example:end -->
