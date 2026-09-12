---
name: ProportionalReliefValve
category: Component (twophase)
summary: A pressure-relief valve whose opening rises proportionally above the set pressure.
related: []
examples: [pressure-cooker]
tags: [proportionalreliefvalve, component, twophase, acausal]
---

# ProportionalReliefValve

A pressure-relief valve whose opening rises proportionally above the set pressure.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
ProportionalReliefValve inst(fluid$, Pcrack, grad, eps, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `Pcrack` | Number | Cracking (relief) pressure [Pa]. |
| `grad` | Number | Road grade (rise/run). |
| `eps` | Number | Effectiveness / roughness. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
dpv &= in.p - pcrack \\
in.mdot &= grad\cdot 0.5\cdot \left(dpv + \sqrt{dpv\cdot dpv + eps\cdot eps}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Pressure Cooker (transient boil-off)
{ A 5 L rigid stainless cooker holds 3 L of tap water at 20 C, lid sealed,
  heated by a 220 V resistive element (32.27 ohm -> 1.5 kW). A spring relief
  valve vents steam to the atmosphere to hold the cooker near its 2 atm
  setpoint, where water boils at about 121 C. The run lasts 20 minutes.

  A full multi-domain transient, every block from the component library:
    - an ELECTRICAL heater (source + resistor + ground) whose ohmic heat
      I^2*R crosses into a thermal STEEL body, which heats the water through a
      conductive link;
    - a rigid two-phase WATER vessel whose pressure, temperature and vapour
      fraction come from a density / internal-energy flash of its conserved
      mass and energy (the BoilingVessel state vars are mass and internal
      energy, integrated in time);
    - a PROPORTIONAL relief valve that lifts with overpressure to regulate the
      cooker to its setpoint (a fixed orifice would instead over-pressurise).

  Press Solve, then open the Plots tab to chart, over time:
    (1) water temperature (cook.t_cv)  - climbs to ~121 C and holds,
    (2) heater current    (I_heater)   - constant ~6.8 A,
    (3) water mass        (cook.mass)  - flat until boiling, then falls as
        steam vents,
    (4) vapour fraction   (cook.x_cv)  - the cooker stays almost all liquid. }

{ ---- Electrical heater: 220 V across a 32.27 ohm element = 1.5 kW ---- }
VoltageSource   SUP(E=220)
HeatingResistor HTR(R=32.2667)
Ground          GND()
I_heater = 220 / 32.2667                 { heater current by Ohm's law, A }

{ ---- Steel body heated by the element, passing heat to the water ---- }
ThermalMass STEEL(C=750, T0=293.15)      { 750 J/K steel thermal mass }
Convection  S2W(htc=333.33, area=1)      { steel -> water link, 333 W/K }

{ ---- Rigid 5 L two-phase water vessel + lifting relief valve to air ---- }
BoilingVessel   COOK(fluid$=Water, V=0.005, m0=2.994, T0=293.15)
ProportionalReliefValve PRV(fluid$=Water, Pcrack=202600, grad=6e-7, eps=2000)
TwoPhasePressureSink ATM(P=101300)

connect(SUP.p, HTR.p)
connect(SUP.n, HTR.n, GND.port)          { circuit return tied to ground }
connect(HTR.heat, STEEL.port, S2W.a)     { element dissipates into the steel }
connect(S2W.b, COOK.wall)                { steel heats the water }
connect(COOK.vent, PRV.in)
connect(PRV.out, ATM.in)

DYNAMIC cooker (method = ida, time = 0 .. 1200, points = 241, rtol = 1e-5, atol = 1e-4)
END

{ CHECK I_heater 6.818174775 0.0000068181747746128355 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
I_heater = 6.818174775
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: pressure-cooker]
