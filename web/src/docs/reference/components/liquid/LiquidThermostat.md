---
name: LiquidThermostat
category: Component (liquid)
summary: "Wax thermostat: the element opens smoothly over a temperature band (Topen ± Tband) sensed on the inlet coolant — the engine warm-up bypass switch, no discrete event."
related: []
examples: []
tags: [liquidthermostat, component, liquid, acausal]
references: []
---

# LiquidThermostat

Wax thermostat: the element opens smoothly over a temperature band (Topen ± Tband) sensed on the inlet coolant — the engine warm-up bypass switch, no discrete event.

Reusable acausal **liquid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/liquid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidThermostat inst(fluid$, CdA, rho, Topen, Tband, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Liquid name (e.g. Water, EG50). |
| `CdA` | Number | Fully open discharge coefficient times flow area [m^2]. |
| `rho` | Number | Liquid density [kg/m^3]. |
| `Topen` | Number | Opening temperature [K]. |
| `Tband` | Number | Width of the opening transition [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
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
LiquidSource  LS(fluid$=Water, mdot=2 [kg/s], P=200000 [Pa], T=300 [K])
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
LPin  CS1(fluid$=Water, P=300000 [Pa], T=300 [K])
LiquidCheckValve CVF(CdA=1e-5 [m^2], rho=997 [kg/m^3], eps=100 [Pa])
LPout CK1(P=100000 [Pa])
connect(CS1.out, CVF.in)
connect(CVF.out, CK1.in)
d_cv = CVF.in.mdot - 1e-5 [m^2] * sqrt(2 * 997 [kg/m^3] * 200000 [Pa])
LPin  CS2(fluid$=Water, P=100000 [Pa], T=300 [K])
LiquidCheckValve CVR(CdA=1e-5 [m^2], rho=997 [kg/m^3], eps=100 [Pa])
LPout CK2(P=300000 [Pa])
connect(CS2.out, CVR.in)
connect(CVR.out, CK2.in)

LPin  TS1(fluid$=Water, P=300000 [Pa], T=300 [K])
LiquidThermostat THS(fluid$=Water, CdA=1e-5 [m^2], rho=997 [kg/m^3], Topen=360 [K], Tband=2 [K])
LPout TK1(P=100000 [Pa])
connect(TS1.out, THS.in)
connect(THS.out, TK1.in)
LPin  TS2(fluid$=Water, P=300000 [Pa], T=400 [K])
LiquidThermostat THO(fluid$=Water, CdA=1e-5 [m^2], rho=997 [kg/m^3], Topen=360 [K], Tband=2 [K])
LPout TK2(P=100000 [Pa])
connect(TS2.out, THO.in)
connect(THO.out, TK2.in)
d_th = THO.in.mdot - 1e-5 [m^2] * sqrt(2 * 997 [kg/m^3] * 200000 [Pa])

TABLE headmap(Q [m^3/s]) [m]
  0      10
  0.01   10
END
LiquidSource  PS(fluid$=Water, mdot=1 [kg/s], P=100000 [Pa], T=300 [K])
LiquidPumpMap PM(rho=997 [kg/m^3], eta=0.7, map$=headmap)
LiquidSink    PK()
connect(PS.out, PM.in)
connect(PM.out, PK.in)
d_pp = (PM.out.P - PM.in.P) - 97772.3005 [Pa]
d_ph = (PM.out.h - PM.in.h) - 140.095 [J/kg]

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
