[Topic: thermo]
# Thermophysical Properties Reference (CoolProp & Gas)

frees includes a high-precision properties database for fluid calculations.

## Material Classes
1. **CoolProp Real Fluids:** Multi-phase real fluids (e.g., `Water`, `R134a`, `Ammonia`, `CarbonDioxide`). Lookups require exactly **two** independent properties.
2. **Ideal Gases:** Spelled formulas (e.g., `CO2`, `N2`, `CH4`, `O2`) evaluated using NASA thermodynamic polynomials.
3. **Aqueous Glycols:** Incompressible coolants represented by base + mass percentage (e.g., `EG50` for 50% Ethylene Glycol, `PG30` for 30% Propylene Glycol). Queries require Temperature ($T$) and Pressure ($P$).

## Standard Property Functions
Every property function accepts the fluid name as the first argument, followed by coordinate variables:

| Function | Property | SI Unit | Example |
| --- | --- | --- | --- |
| `Temperature` | Absolute Temperature | K | `T = Temperature(Water, P=P1, h=h1)` |
| `Pressure` | Absolute Pressure | Pa | `P = Pressure(R134a, T=T1, x=1)` |
| `Enthalpy` | Specific Enthalpy | J/kg | `h = Enthalpy(Steam, T=T1, P=P1)` |
| `Entropy` | Specific Entropy | J/kg-K | `s = Entropy(Nitrogen, T=T1, P=P1)` |
| `Density` | Mass Density | kg/m³ | `rho = Density(EG50, T=T1, P=P1)` |
| `Volume` | Specific Volume | m³/kg | `v = Volume(Water, P=P1, x=0)` |
| `IntEnergy` | Specific Internal Energy | J/kg | `u = IntEnergy(Water, T=T1, P=P1)` |
| `Gibbs` | Specific Gibbs Free Energy | J/kg | `g = Gibbs(Water, T=T1, P=P1)` |
| `Cp` or `Specheat` | Specific heat ($C_p$) | J/kg-K | `c = Cp(Air, T=T1, P=P1)` |
| `Cv` | Specific heat ($C_v$) | J/kg-K | `c_v = Cv(Air, T=T1, P=P1)` |
| `Viscosity` | Dynamic Viscosity | Pa-s | `mu = Viscosity(Water, T=T1, P=P1)` |
| `Conductivity` | Thermal Conductivity | W/m-K | `k = Conductivity(Water, T=T1, P=P1)` |
| `SoundSpeed` | Speed of Sound | m/s | `c = SoundSpeed(Air, T=T1, P=P1)` |

[Diagram: DependentProperties]

## Thermophysical Utility Functions
- **`P_sat(Fluid, T=t):`** Saturation pressure at temperature $T$.
- **`T_sat(Fluid, P=p):`** Saturation temperature at pressure $P$.
- **`MolarMass(Fluid):`** Returns molar mass (kg/mol) of CoolProp fluids, ideal-gas species, or arbitrary chemical formulas (e.g. `C8H18`, `Ca(OH)2`).
- **`HeatingValue(Fuel, LHV/HHV):`** Returns lower heating value (LHV) or higher heating value (HHV) in J/kg for a fuel.
- **`StoichAFR(Fuel):`** Returns stoichiometric air-fuel ratio (mass basis) for combustion.
- **`IsIdealGas(Fluid):`** Returns 1 if treated as ideal, 0 otherwise.
- **`Phase$(Fluid, T=t, P=p):`** Returns phase state as a string (e.g., `'liquid'`, `'gas'`, `'twophase'`, `'supercritical'`).
- **`P_crit(Fluid) / T_crit(Fluid) / v_crit(Fluid) / T_triple(Fluid):`** Fluid critical and triple points constants.
- **`CompressibilityFactor(Fluid, T=t, P=p):`** Returns compressibility factor $Z = Pv/(RT)$ (dimensionless).
- **`StagnationTemp(T, V, cp):`** Stagnation temperature $T_0 = T + V^2 / (2 c_p)$ (K).
- **`StagnationPres(P, T, T0, k):`** Stagnation pressure $P_0 = P (T_0/T)^{k/(k-1)}$ (Pa).
- **`SurfaceTension(Fluid, T=t):`** Surface tension (N/m).
- **`Fugacity(Fluid, T=t, P=p):`** Fugacity coefficient.
- **`Enthalpy_fusion(Fluid):`** Latent heat of melting (J/kg).
- **`Dipole(Fluid):`** Dipole moment.

[Topic: solid-materials]
# Solid & Incompressible Material Properties Reference

frees supports property lookups for solid materials (e.g., `Copper`, `Iron`, `Aluminum`, `Concrete`, `Glass`) and incompressible liquids (e.g., `EngineOil`).

## Material Property Functions
- **`c_(Material, T=t):`** Specific heat capacity (J/kg-K).
- **`k_(Material, T=t):`** Thermal conductivity (W/m-K).
- **`rho_(Material):`** Solid density (kg/m³).
- **`mu_(Material, T=t):`** Dynamic viscosity (Pa-s) for liquids.
- **`Pv_(Material, T=t):`** Vapor pressure (Pa).
- **`E_(Material):`** Young's modulus (Pa).
- **`nu_(Material):`** Poisson's ratio.
- **`epsilon_(Material):`** Surface emissivity (0–1).
- **`VolExpCoef(Material):`** Volumetric expansion coefficient (1/K).
- **`FreezingPt(Material):`** Freezing point temperature (K).
- **`DELTAL\L_293(Material, T=t):`** Linear thermal expansion ratio relative to 293 K.
- **`ek_LJ(Material) / sigma_LJ(Material):`** Lennard-Jones parameters.

### Material Lookup Example
```
k_copper = k_(Copper, T=300 [K])
mod_steel = E_(Steel)
```

[Topic: humidair]
# Psychrometrics (AirH2O / Humid Air)

Humid air calculations are performed using the special fluid name `AirH2O`. Every property query requires exactly **three** independent coordinates, one of which must be Total Pressure (`P`).

## Psychrometric Property Indicators
- **`T`:** Dry-bulb temperature [K]
- **`P`:** Total (atmospheric) pressure [Pa]
- **`R`:** Relative humidity [0–1]
- **`W`:** Humidity ratio [kg water / kg dry air]
- **`D`:** Dew-point temperature [K]
- **`B`:** Wet-bulb temperature [K]
- **`H`:** Specific enthalpy of moist air [J/kg dry air]

## Dedicated Psychrometric Functions
- **`HumRat(AirH2O, T=t, P=p, R=phi):`** Returns humidity ratio $\omega$.
- **`RelHum(AirH2O, T=t, P=p, W=w):`** Returns relative humidity $\phi$.
- **`WetBulb(AirH2O, T=t, P=p, R=phi):`** Returns wet-bulb temperature.
- **`DewPoint(AirH2O, T=t, P=p, R=phi):`** Returns dew-point temperature.

### Psychrometric Example
```
T_db = 25 [C]
P_atm = 101325 [Pa]
phi = 0.60
w = HumRat(AirH2O, T=T_db, P=P_atm, R=phi)
```

[Topic: state-tables]
# Fluid State Tables (STATE TABLE)

A `STATE TABLE` groups variables representing thermodynamic states in a circuit and binds them to a specific fluid.

## Declaring State Tables
List the state variables in the block header and declare the fluid inside the block:
```
STATE TABLE WaterLoop(P1, T1, h1, P2, T2, h2)
  FLUID = Water
END
```

## Why Use State Tables?
- **Fluid Isolation:** If you have a water circuit and an R134a circuit, variables like `P1` and `T1` in different tables stay isolated.
- **Auto-Fill Properties:** After solving, you can click **Fill Missing Values** in the Fluid States window to compile all other properties (e.g. `s`, `v`, `x`) from the backend database using the table's declared fluid.
- **Plot Overlay:** Allows you to overlay entire cycles directly onto property charts.

[Topic: chemistry]
# Chemistry & Combustion

frees supports chemical calculations and combustion analysis for hydrocarbons, alcohols, and common species.

## Molar Mass Calculations
The `MolarMass` function resolves CoolProp fluids, ideal-gas species, or arbitrary chemical formulas from the periodic table:
```
M = MolarMass(CarbonDioxide)   { 0.04401 kg/mol }
M2 = MolarMass(C8H18)          { 0.11423 kg/mol }
M3 = MolarMass('Al2(SO4)3')    { quote formulas containing parentheses }
```
Formulas are case-sensitive. Quote ones with parentheses.

## Combustion Functions
- **`HeatingValue(Fuel, mode):`** Computes the heating value of a fuel in J/kg. `mode` can be `'LHV'` (Lower Heating Value, water as vapor) or `'HHV'` (Higher Heating Value, water as liquid).
- **`StoichAFR(Fuel):`** Computes the stoichiometric air-fuel ratio on a mass basis.

### Combustion Example
```
{ Stoichiometric combustion of octane }
LHV = HeatingValue(C8H18, 'LHV')   { ~44.4 MJ/kg }
afr = StoichAFR(C8H18)            { ~15.0 }
```
