---
name: Electrolyzer
category: Component (electrical)
summary: "PEM electrolyzer stack (reverse fuel cell): reversible potential + activation (ln(i/i0 + 1), regular at zero current) + ohmic overpotentials; hydrogen production from Faraday's law; heat above the thermoneutral voltage Eth."
related: []
examples: []
tags: [electrolyzer, component, electrical, acausal]
references: []
---

# Electrolyzer

PEM electrolyzer stack (reverse fuel cell): reversible potential + activation (ln(i/i0 + 1), regular at zero current) + ohmic overpotentials; hydrogen production from Faraday's law; heat above the thermoneutral voltage Eth.

Reusable acausal **electrical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/electrical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Electrolyzer inst(ncells, area, i0, Rohm, E0, alpha, Eth, T)
```

## Ports

`p`, `n`, `heat`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ncells` | Number | Cells in the stack [-]. |
| `area` | Number | Active area per cell [m^2]. |
| `i0` | Number | Exchange current density [A/m^2]. |
| `Rohm` | Number | Area-specific ohmic resistance [ohm-m^2]. |
| `E0` | Number | Reversible cell voltage [V]. |
| `alpha` | Number | Charge-transfer coefficient [-]. |
| `Eth` | Number | Thermoneutral cell voltage [V]. |
| `T` | Number | Stack temperature [K]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
i_{cell} &= p.i \\
i &= \frac{i_{cell}}{area} \\
v_{cell} &= e0 + \frac{8.314\,\left[kg m^2/s^2-K-mol\right]\,t}{alpha\cdot 96485\,\left[s A/mol\right]}\cdot \ln\left(\frac{i}{i0} + 1\right) + i\cdot rohm \\
p.v - n.v &= ncells\cdot v_{cell} \\
p.i + n.i &= 0 \\
mdot_{h2} &= \frac{ncells\cdot i_{cell}\cdot 0.002016\,\left[kg/mol\right]}{2\,96485\,\left[s A/mol\right]} \\
q &= i_{cell}\cdot ncells\cdot \left(v_{cell} - eth\right) \\
heat.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Supercapacitor: 10 A into 100 F for 50 s -> Vc rises 5 V (ESR adds 0.1 V at
// the terminal).
// CC-CV charger against a 3.6 V battery: far from Vmax it sources Imax.
// EXPECT icc = 10 tol 1e-3
// Thermal fuse driven at 100 A (rating 50 A, kR=100): R = 0.1*101 -> 1010 V.
// EXPECT vfuse = 1010 tol 0.1
// Harness at 350 K: R = 0.012274, drop 0.12274 V at 10 A.
// EXPECT dvh = 0.12274 tol 1e-5
// Electrolyzer at 20 A: stack 19.8435 V, heat 100.870 W, H2 2.0894e-6 kg/s.
// EXPECT vel = 19.84348 tol 1e-3
// EXPECT qel = 100.8697 tol 1e-2
// EXPECT mh2 = 2.0894e-6 tol 1e-9
// Solar array at 1000 W/m2 into 1 ohm, far from Voc: I = Isc = 8 A.
// EXPECT isol = 8 tol 1e-3
ChargerCCCV CH(Imax=10 [A], Vmax=4.2 [V], epsV=0.01 [V])
Battery     BT(Voc=3.6 [V], R0=0.01 [ohm])
Ground      GC()
connect(CH.p, BT.p)
connect(CH.n, BT.n, GC.port)
icc = BT.p.I

ThermalFuse   FU(R0=0.1 [ohm], Iblow=50 [A], kR=100, epsI=1 [A])
CurrentSource CF(I=100 [A])
Ground        GF()
connect(FU.p, CF.p)
connect(FU.n, CF.n, GF.port)
vfuse = FU.p.V - FU.n.V

HarnessResistance HR(R20=0.01 [ohm], alphaT=0.004 [1/K])
CurrentSource     CHR(I=10 [A])
Ground            GH()
ThermalSource     THW(T=350 [K])
connect(HR.a, CHR.p)
connect(HR.b, CHR.n, GH.port)
connect(HR.heat, THW.port)
dvh = HR.a.V - HR.b.V

Electrolyzer  EL(ncells=10, area=0.01 [m^2], i0=10 [A/m^2], Rohm=1e-4 [ohm-m^2], E0=1.48 [V], alpha=0.5, Eth=1.48 [V], T=333 [K])
CurrentSource CE(I=20 [A])
Ground        GE()
ThermalSource TE(T=333 [K])
connect(EL.p, CE.p)
connect(EL.n, CE.n, GE.port)
connect(EL.heat, TE.port)
vel = EL.p.V - EL.n.V
qel = EL.Q
mh2 = EL.mdot_h2

SigConstant IRR(k=1000 [W/m^2])
SolarArray  SA(Isc_ref=8 [A], Gref=1000 [W/m^2], Voc=40 [V], epsV=0.5 [V])
Resistor    RS(R=1 [ohm])
Ground      GA()
connect(IRR.out, SA.G)
connect(SA.p, RS.a)
connect(RS.b, SA.n, GA.port)
isol = RS.a.I

{ CHECK bt.n.i -10 0.000009999999999999999 }
{ CHECK bt.n.v 0 1e-8 }
{ CHECK bt.p.i 10 0.000009999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bt.n.i = -10
bt.n.v = 0
bt.p.i = 10
```

<!-- verified-reference-example:end -->
