---
name: IndirectDirectEvaporativeCooler
category: Component (moistair)
summary: Acausal moistair-domain component IndirectDirectEvaporativeCooler with ports pri_in, pri_out, sec_in, sec_out.
related: []
examples: []
tags: [indirectdirectevaporativecooler, component, moistair, acausal]
references: []
generated: true
---

# IndirectDirectEvaporativeCooler

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
IndirectDirectEvaporativeCooler inst(wbde, eff_sec, eff_dir)
```

## Ports

`pri_in`, `pri_out`, `sec_in`, `sec_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `wbde` | Number |
| `eff_sec` | Number |
| `eff_dir` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
IndirectEvaporativeCooler IEC(wbde=wbde, eff_sec=eff_sec)
EvaporativeCooler         DEC(eff=eff_dir)
connect(pri_in, IEC.pri_in)
connect(IEC.pri_out, DEC.in)
connect(DEC.out, pri_out)
connect(sec_in, IEC.sec_in)
connect(IEC.sec_out, sec_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
IndirectDirectEvaporativeCooler C(wbde=0.7, eff_sec=0.7, eff_dir=0.7)
C.pri_in.mdot = 1 [kg/s]
C.pri_in.P = 101325 [Pa]
C.pri_in.W = 0.012
C.pri_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.sec_in.mdot = 1 [kg/s]
C.sec_in.P = 101325 [Pa]
C.sec_in.W = 0.008
C.sec_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.pri_in.h 60848.84667 0.06084884666848224 }
{ CHECK c.pri_out.h 49638.58799 0.049638587993745695 }
{ CHECK c.pri_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.pri_in.h = 60848.84667
c.pri_out.h = 49638.58799
c.pri_out.mdot = 1
```

<!-- verified-reference-example:end -->
