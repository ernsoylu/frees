---
name: LiquidThermostat
category: Component (liquid)
summary: Acausal liquid-domain component LiquidThermostat with ports in, out.
related: []
examples: []
tags: [liquidthermostat, component, liquid, acausal]
references: []
generated: true
---

# LiquidThermostat

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidThermostat inst(fluid$, CdA, rho, Topen, Tband, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `CdA` | Number |
| `rho` | Number |
| `Topen` | Number |
| `Tband` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
u &= 0.5\,\left(1 + \tanh\left(\frac{t_{in} - topen}{tband}\right)\right) \\
in.mdot\cdot \left|in.mdot\right| &= \left(u\cdot cda\right)^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Coolant TMS set. Three-way valve splits 2 kg/s at u=0.3; the check valve
// blocks reverse flow (higher downstream pressure -> ~0) and matches the
// square law forward; the wax thermostat is shut 30 bands below Topen and
// fully open 20 bands above; the head-map pump lifts rho*g*head and heats the
// coolant by g*head/eta.
// EXPECT tw.outa.mdot = 0.6 tol 1e-9
// EXPECT tw.outb.mdot = 1.4 tol 1e-9
// EXPECT cvr.in.mdot = 0 tol 1e-6
// EXPECT d_cv = 0 tol 1e-8
// EXPECT ths.in.mdot = 0 tol 1e-6
// EXPECT d_th = 0 tol 1e-4
// EXPECT d_pp = 0 tol 1e-3
// EXPECT d_ph = 0 tol 1e-4
LiquidSource  LS(fluid$=Water, mdot=2, P=200000, T=300)
LiquidThreeWayValve TW(u=0.3)
LiquidSink KA()
LiquidSink KB()
connect(LS.out, TW.in)
connect(TW.outa, KA.in)
connect(TW.outb, KB.in)

function [out] = LPin(fluid$, P, T, domain$ = liquid)
port(out)
  out.P = P
  out.h = Enthalpy(fluid$, P=P, T=T)
end
function [in] = LPout(P, domain$ = liquid)
port(in)
  in.P = P
end
LPin  CS1(fluid$=Water, P=300000, T=300)
LiquidCheckValve CVF(CdA=1e-5, rho=997, eps=100)
LPout CK1(P=100000)
connect(CS1.out, CVF.in)
connect(CVF.out, CK1.in)
d_cv = CVF.in.mdot - 1e-5 * sqrt(2 * 997 * 200000)
LPin  CS2(fluid$=Water, P=100000, T=300)
LiquidCheckValve CVR(CdA=1e-5, rho=997, eps=100)
LPout CK2(P=300000)
connect(CS2.out, CVR.in)
connect(CVR.out, CK2.in)

LPin  TS1(fluid$=Water, P=300000, T=300)
LiquidThermostat THS(fluid$=Water, CdA=1e-5, rho=997, Topen=360, Tband=2)
LPout TK1(P=100000)
connect(TS1.out, THS.in)
connect(THS.out, TK1.in)
LPin  TS2(fluid$=Water, P=300000, T=400)
LiquidThermostat THO(fluid$=Water, CdA=1e-5, rho=997, Topen=360, Tband=2)
LPout TK2(P=100000)
connect(TS2.out, THO.in)
connect(THO.out, TK2.in)
d_th = THO.in.mdot - 1e-5 * sqrt(2 * 997 * 200000)

TABLE headmap(Q)
  0      10
  0.01   10
END
LiquidSource  PS(fluid$=Water, mdot=1, P=100000, T=300)
LiquidPumpMap PM(rho=997, eta=0.7, map$=headmap)
LiquidSink    PK()
connect(PS.out, PM.in)
connect(PM.out, PK.in)
d_pp = (PM.out.P - PM.in.P) - 97772.3005
d_ph = (PM.out.h - PM.in.h) - 140.095

{ CHECK ck1.in.h 112837.8113 0.1128378113292524 }
{ CHECK ck1.in.mdot 0.1996997747 1.9969977466186585e-7 }
{ CHECK ck1.in.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ck1.in.h = 112837.8113
ck1.in.mdot = 0.1996997747
ck1.in.p = 100000
```

<!-- verified-reference-example:end -->
