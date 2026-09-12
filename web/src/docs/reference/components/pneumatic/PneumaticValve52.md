---
name: PneumaticValve52
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticValve52 with ports sup_in, wa, wb, ea_out, eb_out, u.
related: []
examples: []
tags: [pneumaticvalve52, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticValve52

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticValve52 inst(fluid$, C, b, domain$)
```

## Ports

`sup_in`, `wa`, `wb`, `ea_out`, `eb_out`, `u`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `b` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
t_{s} &= \text{Temperature}\left(\mathrm{fluid}, =sup_{in.p}, p=sup_{in.h}\right) \\
t_{a} &= \text{Temperature}\left(\mathrm{fluid}, =wa.p, p=wa.h\right) \\
t_{b} &= \text{Temperature}\left(\mathrm{fluid}, =wb.p, p=wb.h\right) \\
m_{sa} &= \text{iso6358}\left(u.sig\cdot c, b, sup_{in.p}, t_{s}, wa.p\right) \\
m_{be} &= \text{iso6358}\left(u.sig\cdot c, b, wb.p, t_{b}, eb_{out.p}\right) \\
m_{sb} &= \text{iso6358}\left(\left(1 - u.sig\right)\cdot c, b, sup_{in.p}, t_{s}, wb.p\right) \\
m_{ae} &= \text{iso6358}\left(\left(1 - u.sig\right)\cdot c, b, wa.p, t_{a}, ea_{out.p}\right) \\
sup_{in.mdot} &= m_{sa} + m_{sb} \\
wa.mdot &= m_{sa} - m_{ae} \\
wb.mdot &= m_{sb} - m_{be} \\
ea_{out.mdot} &= m_{ae} \\
eb_{out.mdot} &= m_{be} \\
wa.h &= sup_{in.h} \\
wb.h &= sup_{in.h} \\
ea_{out.h} &= wa.h \\
eb_{out.h} &= wb.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// 5/2 directional valve at u = 0.7 between two work reservoirs: A (5 bar) is
// fed through 0.7 C and bled through 0.3 C; B (2.5 bar) is fed through 0.3 C
// and bled through 0.7 C — four ISO 6358 paths with complementary commands,
// each work port carrying its net flow.
SigConstant         CMD(k=0.7)
PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
PneumaticValve52    V52(fluid$=Air, C=1e-8, b=0.3)
PneumaticAtmosphere WA(P=500000)
PneumaticAtmosphere WB(P=250000)
PneumaticAtmosphere EXA(P=100000)
PneumaticAtmosphere EXB(P=100000)
connect(SUP.out, V52.sup_in)
connect(V52.wa, WA.port)
connect(V52.wb, WB.port)
connect(V52.ea_out, EXA.port)
connect(V52.eb_out, EXB.port)
connect(CMD.out, V52.u)
m_sup = V52.sup_in.mdot
m_a   = V52.wa.mdot
m_b   = V52.wb.mdot

{ CHECK cmd.out.sig 0.7 7e-7 }
{ CHECK exa.port.h 424949.9736 0.424949973620621 }
{ CHECK exa.port.mdot 0.001758387866 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cmd.out.sig = 0.7
exa.port.h = 424949.9736
exa.port.mdot = 0.001758387866
```

<!-- verified-reference-example:end -->
