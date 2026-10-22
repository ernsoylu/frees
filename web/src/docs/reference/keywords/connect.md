---
name: connect
covers: [variant, require]
category: Language Keywords
summary: Joins component ports; VARIANT/REQUIRE select model fidelity inside a component.
related: [FUNCTION, DYNAMIC, Source, Sink]
examples: []
tags: [keyword, component, port, connect, variant, require, network]
references: []
---

# connect, VARIANT, REQUIRE

`connect(a.port, b.port, …)` joins ports of the same domain into one node. Inside a component definition, `VARIANT name … END` blocks hold model-specific equations and `REQUIRE` names the parameters that variant needs; `model$` selects the variant per instance.

## Syntax

```
function [in, out] = Name(fluid$=Air, model$=default_variant, p1=…)
  port(in)
  port(out)
  shared_equation
  VARIANT name REQUIRE p2, p3
    variant_equation
  END
end

Name INST(fluid$=Air, model$=name, p2=…, p3=…)
connect(A.out, INST.in)
connect(PUMP.out, RAD.in, BYPASS.in)
```

## Description

Connecting a fluid node equates its pressure and enthalpy and sums mass flow; a heat node equates temperature and sums heat flow. Mismatched domains are a hard error. Equations outside any `VARIANT` are shared. `REQUIRE` is validated only for the selected variant. A component for a non-default fluid family declares it with a `domain$=` header parameter (`gas`, `oil`, `moistair`, `liquid`, `twophase`).

## Examples

<!-- verified-reference-example:start -->

### Verified example — A fan with two fidelity levels

The `curve` variant gives $P_{out} = P_{in} + dP_0 - k_Q \dot m^2 = 101325 + 300 - 150$.

```frees
function [in, out] = MyFan(fluid$=Air, model$=simple)
  port(in)
  port(out)
  out.mdot = in.mdot
  out.h    = in.h
  VARIANT simple
    out.P = in.P + 250
  END
  VARIANT curve REQUIRE dP0, kQ
    out.P = in.P + dP0 - kQ * in.mdot^2
  END
end
Source SUP(fluid$=Air, mdot=0.1 [kg/s], P=101325 [Pa], T=293.15 [K])
MyFan  F1(fluid$=Air, model$=curve, dP0=300 [Pa], kQ=1.5e4 [Pa-s^2/kg^2])
Sink   RET()
connect(SUP.out, F1.in)
connect(F1.out, RET.in)
P_out = F1.out.P

{ CHECK P_out 101475 0.000001 }
```

Expected output:

```text
P_out = 101475 [Pa]
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `connect(...): 'ret.nope' is not a port (instance.port) or a stream name.` | Misspelled port. | Use a port the component declares. |
| `Component 'f1' (f): parameter 'dp0' has no value (give it a default or pass dp0=value). (required by the selected 'curve' variant).` | A `REQUIRE` parameter was not supplied. | Pass it on the instance. |
| `Component 'f1' (f): unknown model$ 'other'. Variants: simple.` | `model$` names no variant. | Use a listed variant. |
| `cannot connect a 'fluid' line (sup.out) to a 'gas' line (h1.in). …` | Mismatched fluid families. | Couple them through a heat exchanger. |
