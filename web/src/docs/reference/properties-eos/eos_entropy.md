---
name: eos_entropy
category: Properties (EOS)
summary: Specific entropy [J/kg-K] (SRK/PR)
related: []
examples: []
tags: [eos, entropy, properties]
---

# eos_entropy

Specific entropy [J/kg-K] (SRK/PR)


## Syntax

```
eos_entropy(fluid$, model$, T, P, phase$)
```

## Description

Specific entropy [J/kg-K] (SRK/PR)

## Mathematical Formulation

$$ s(T,P) = s^{\text{ig}}(T,P) + (s - s^{\text{ig}})_{T,P} \quad\text{(ideal-gas + EOS departure)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Cubic EOS — spot probe across every entry point
{ Exercises all seven eos_* intrinsics, both models, and the alias route
  (r717 -> ammonia). Ground truth is the Java engine via tools/golden-dumper
  with CoolProp loaded; the cubic backend itself needs no CoolProp. }
z_co2_pr = eos_z('co2', 'PR', 320, 4e6, 'vapor')
z_co2_srk = eos_z('co2', 'SRK', 320, 4e6, 'vapor')
z_n2_pr = eos_z('nitrogen', 'PR', 400, 1e5, 'vapor')
v_co2_pr = eos_volume('co2', 'PR', 320, 5e6, 'vapor')
rho_co2_pr = eos_density('co2', 'PR', 350, 5e6, 'vapor')
h_co2_pr = eos_enthalpy('co2', 'PR', 350, 1e6, 'vapor')
s_co2_pr = eos_entropy('co2', 'PR', 350, 1e6, 'vapor')
p_from_v = eos_pressure('co2', 'PR', 320, 0.011)
psat_prop = eos_psat('propane', 'PR', 300)
psat_water_srk = eos_psat('water', 'SRK', 400)
zl_prop = eos_z('propane', 'PR', 300, 1e6, 'liquid')
h_nh3 = eos_enthalpy('ammonia', 'SRK', 300, 5e5, 'vapor')
s_nh3 = eos_entropy('r717', 'SRK', 300, 5e5, 'vapor')

{ CHECK h_co2_pr 37694.99149 0.037694991491934164 }
{ CHECK h_nh3 -12826.05884 0.012826058838730052 }
{ CHECK p_from_v 4344014.54 4.344014539635952 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_co2_pr = 37694.99149 [J/kg]
h_nh3 = -12826.05884 [J/kg]
p_from_v = 4344014.54 [Pa]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | Fluid name (e.g. Water, R134a, Air). |
| `model$` | String | Yes | Selector — One of `SRK`, `PR`. |
| `T` | Number | Yes | Temperature [K]. |
| `P` | Number | Yes | Pressure [Pa]. |
| `phase$` | String | Yes | Selector — One of `vapor`, `liquid`. |
