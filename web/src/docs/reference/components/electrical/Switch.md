---
name: Switch
category: Component (electrical)
summary: "Signal-driven switch: a conductance that moves from 1/Roff to 1/Ron as its control signal passes a threshold."
related: [SwitchSPDT, SigStep, Capacitor]
examples: []
tags: [switch, component, electrical, acausal]
references: ["J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019 (the step response of RC circuits)"]
---

# Switch

Signal-driven switch: a conductance that moves from 1/Roff to 1/Ron as its control signal passes a threshold.

## What it models

An on/off switch between `p` and `n`, closed while `ctrl` is above `thresh` and open below it. The change is a smooth blend of conductance (tanh, width `eps` in control units), not a change of the circuit: the equations are the same open or closed, so a transient runs straight through the switching instant. Drive `ctrl` from a step, pulse, table or controller output. The open switch keeps the small leakage `1/Roff`; there is no arc, bounce or contact wear.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `ctrl`

## Usage

```
Switch inst(Ron, Roff, thresh, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Ron` | Number | Closed resistance [ohm]. |
| `Roff` | Number | Open resistance [ohm] (leakage). |
| `thresh` | Number | Control level at which the switch is half closed [-]. |
| `eps` | Number | Width of the transition in control units [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
w &= 0.5\,\left(1 + \tanh\left(\frac{ctrl.sig - thresh}{eps}\right)\right) \\
g &= \frac{w}{ron} + \frac{1 - w}{roff} \\
p.i &= g\cdot \left(p.v - n.v\right) \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a switch closes onto an RC circuit

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A switch closes at t = 1 ms, when its control steps from 0 to 1, and a
  10 V source starts charging 1 µF through 1 kΩ. One time constant later the
  capacitor has covered 63.2 % of the step: v = E·(1 − e^(−1)), with
  τ = (R + Ron)·C. }
VoltageSource VS(E=10 [V])
SigStep       CMD(t0=0.001, before=0, after=1, eps=1e-9)
Switch        SW(Ron=0.01 [ohm], Roff=1e9 [ohm], thresh=0.5, eps=0.01)
Resistor      R(R=1000 [ohm])
Capacitor     CAP(C=1e-6 [farad], V0=0 [V])
Ground        G()
connect(CMD.out, SW.ctrl)
connect(VS.p, SW.p)
connect(SW.n, R.a)
connect(R.b, CAP.p)
connect(CAP.n, VS.n, G.port)

DYNAMIC charge (method = ida, time = 0 .. 0.004, points = 401)
END
v_open = ODEValue('cap.vc', 0.0009) * 1 [V]    { still open: no charge yet }
v_tau  = ODEValue('cap.vc', 0.002) * 1 [V]    { one time constant after closing }

{ CHECK v_open 8.99999595e-06 1e-07 }
{ CHECK v_tau 6.321168800525399 0.0001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_open = 8.99999595e-06
v_tau = 6.321168800525399
```

<!-- verified-reference-example:end -->
