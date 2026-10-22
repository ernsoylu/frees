---
name: PneumaticValve32
category: Component (pneumatic)
summary: "3/2 directional valve: the spool command u blends supply->work (u·C) against work->exhaust ((1-u)·C), both ISO 6358 paths — u=1 pressurizes, u=0 vents."
related: []
examples: []
tags: [pneumaticvalve32, component, pneumatic, acausal]
references: []
---

# PneumaticValve32

3/2 directional valve: the spool command u blends supply->work (u·C) against work->exhaust ((1-u)·C), both ISO 6358 paths — u=1 pressurizes, u=0 vents.

Reusable acausal **pneumatic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/pneumatic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticValve32 inst(fluid$, C, b, domain$)
```

## Ports

`sup_in`, `work`, `exh_out`, `u`

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
t_{s} &= \text{Temperature}\left(\mathrm{fluid\$}, p=sup_{in.p}, h=sup_{in.h}\right) \\
t_{w} &= \text{Temperature}\left(\mathrm{fluid\$}, p=work.p, h=work.h\right) \\
m_{in} &= \text{iso6358}\left(u.sig\cdot c, b, sup_{in.p}, t_{s}, work.p\right) \\
m_{out} &= \text{iso6358}\left(\left(1 - u.sig\right)\cdot c, b, work.p, t_{w}, exh_{out.p}\right) \\
sup_{in.mdot} &= m_{in} \\
work.mdot &= m_{in} - m_{out} \\
exh_{out.mdot} &= m_{out} \\
work.h &= sup_{in.h} \\
exh_{out.h} &= work.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// 3/2 directional valve at u = 0.6 metering into a 4 bar work reservoir:
// supply->work carries 0.6 C of ISO 6358 flow, work->exhaust bleeds 0.4 C,
// and the work port delivers the net (m_in - m_out) at the reservoir pressure.
SigConstant         CMD(k=0.6)
PneumaticSupply     SUP(fluid$=Air, P=700000 [Pa], T=300 [K])
PneumaticValve32    V32(fluid$=Air, C=1e-8 [m^3/s-Pa], b=0.3)
PneumaticAtmosphere WRK(P=400000 [Pa])
PneumaticAtmosphere ATM(P=100000 [Pa])
connect(SUP.out, V32.sup_in)
connect(V32.work, WRK.port)
connect(V32.exh_out, ATM.port)
connect(CMD.out, V32.u)
m_sup  = V32.sup_in.mdot
m_net  = V32.work.mdot
m_exh  = V32.exh_out.mdot

{ CHECK atm.port.h 424949.9736 0.424949973620621 }
{ CHECK atm.port.mdot 0.001876312644 1e-8 }
{ CHECK atm.port.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
atm.port.h = 424949.9736
atm.port.mdot = 0.001876312644
atm.port.p = 100000
```

<!-- verified-reference-example:end -->
