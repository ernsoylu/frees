import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Title,
  Text,
  Container,
  Code,
  List,
  Paper,
  Stack,
  Table,
  Badge,
  Alert,
  Card,
  Button,
  SimpleGrid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

function CopyButton({ code }: Readonly<{ code: string }>) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      size="xs"
      variant="light"
      color={copied ? "green" : "blue"}
      onClick={handleCopy}
      style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
    >
      {copied ? "Copied!" : "Copy Code"}
    </Button>
  );
}

const CYCLE_EXAMPLES = [
  {
    value: "reheat-rankine",
    title: "Power Cycles: Reheat Rankine Cycle with Moisture Limit",
    description: "A reheat Rankine cycle where the condenser pressure is itself an unknown, fixed by the requirement that turbine-exit moisture not exceed 5%. frees finds it implicitly from the quality constraint.",
    note: "Verified against the textbook: condenser pressure 9.73 kPa, net power 10.2 MW, thermal efficiency 36.9%.",
    code: `{ Reheat Rankine Cycle with Moisture Limit }
{ Find the condenser pressure that limits turbine-exit moisture to 5%,
  then the net power output and thermal efficiency. }
m_dot = 7.7 [kg/s]
P[3] = 12500 [kPa]   { HP turbine inlet }
T[3] = 550 [C]
P[4] = 2000 [kPa]    { Reheat pressure }
T[5] = 450 [C]       { Reheat temperature }
P[5] = P[4]
eta_turb = 0.85
eta_pump = 0.90
x[6] = 0.95          { Max 5% moisture at LP turbine exit }

{ State 3: HP turbine inlet }
h[3] = Enthalpy(Water, P=P[3], T=T[3])
s[3] = Entropy(Water, P=P[3], T=T[3])

{ State 4: HP turbine exit }
h_4s = Enthalpy(Water, P=P[4], s=s[3])
h[4] = h[3] - eta_turb * (h[3] - h_4s)

{ State 5: reheater exit }
h[5] = Enthalpy(Water, P=P[5], T=T[5])
s[5] = Entropy(Water, P=P[5], T=T[5])

{ State 6: LP turbine exit; the quality constraint fixes P[6] }
h_6s = Enthalpy(Water, P=P[6], s=s[5])
h[6] = h[5] - eta_turb * (h[5] - h_6s)
h[6] = Enthalpy(Water, P=P[6], x=x[6])

{ State 1: condenser exit (saturated liquid) }
P[1] = P[6]                  { condenser pressure, so state 1 plots on the diagram }
h[1] = Enthalpy(Water, P=P[6], x=0)
v[1] = Volume(Water, P=P[6], x=0)

{ State 2: pump exit }
P[2] = P[3]                  { pump discharges to boiler pressure }
w_pump = v[1] * (P[3] - P[6]) / eta_pump
h[2] = h[1] + w_pump

{ Energy balances }
q_in = (h[3] - h[2]) + (h[5] - h[4])
w_turb = (h[3] - h[4]) + (h[5] - h[6])
w_net = w_turb - w_pump
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100

{ Plot the cycle on a temperature-entropy diagram (see "Plots in Code"). }
PLOT 'Reheat Rankine T-s'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

[Graph="Reheat Rankine T-s"] T-s diagram of the reheat Rankine cycle [/Graph]`,
  },
  {
    value: "reheat-regen-rankine",
    title: "Power Cycles: Ideal Reheat-Regenerative Rankine Cycle, English Units",
    description: "One reheater and two open feedwater heaters with extractions at 250 and 40 psia. All inputs are in English units (psia, F, Btu/s); frees converts them to SI automatically and solves the two feedwater-heater mass balances simultaneously.",
    note: "With 4e5 Btu/s of boiler heat input the cycle delivers about 200 MW at 47.4% thermal efficiency.",
    code: `{ Ideal Reheat-Regenerative Rankine Cycle, English Units }
{ One reheater and two open feedwater heaters; everything isentropic.
  English-unit inputs are converted to SI automatically. Find the boiler
  flow rate, net power and thermal efficiency. }
P[7] = 1500 [psia]   { HP turbine inlet }
T[7] = 1100 [F]
P[8] = 250 [psia]    { Extraction to FWH II }
P[9] = 140 [psia]    { HP exit / reheater }
T[10] = 1000 [F]     { Reheat temperature }
P[11] = 40 [psia]    { Extraction to FWH I }
P[12] = 1 [psia]     { Condenser }
Q_dot_in = 400000 [Btu/s]

{ HP turbine: 7 -> 8 (extraction) -> 9 (to reheater), isentropic }
h[7] = Enthalpy(Water, P=P[7], T=T[7])
s[7] = Entropy(Water, P=P[7], T=T[7])
h[8] = Enthalpy(Water, P=P[8], s=s[7])
h[9] = Enthalpy(Water, P=P[9], s=s[7])

{ Reheater and LP turbine: 10 -> 11 (extraction) -> 12, isentropic }
h[10] = Enthalpy(Water, P=P[9], T=T[10])
s[10] = Entropy(Water, P=P[9], T=T[10])
h[11] = Enthalpy(Water, P=P[11], s=s[10])
h[12] = Enthalpy(Water, P=P[12], s=s[10])

{ Condensate and feedwater path: saturated liquid out of each FWH }
h[1] = Enthalpy(Water, P=P[12], x=0)
v[1] = Volume(Water, P=P[12], x=0)
h[2] = h[1] + v[1] * (P[11] - P[12])
h[3] = Enthalpy(Water, P=P[11], x=0)
v[3] = Volume(Water, P=P[11], x=0)
h[4] = h[3] + v[3] * (P[8] - P[11])
h[5] = Enthalpy(Water, P=P[8], x=0)
v[5] = Volume(Water, P=P[8], x=0)
h[6] = h[5] + v[5] * (P[7] - P[8])

{ Feedwater heater balances (per kg of boiler flow):
  y extracted at 250 psia, z at 40 psia }
y * h[8] + (1 - y) * h[4] = h[5]
z * h[11] + (1 - y - z) * h[2] = (1 - y) * h[3]

{ Boiler heat input fixes the mass flow rate }
q_in = (h[7] - h[6]) + (1 - y) * (h[10] - h[9])
Q_dot_in = m_dot * q_in

{ Net power and efficiency }
w_turb = (h[7] - h[8]) + (1 - y) * (h[8] - h[9]) + (1 - y) * (h[10] - h[11]) + (1 - y - z) * (h[11] - h[12])
w_pumps = (1 - y - z) * (h[2] - h[1]) + (1 - y) * (h[4] - h[3]) + (h[6] - h[5])
w_net = w_turb - w_pumps
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100`,
  },
  {
    value: "cogeneration-plant",
    title: "Power Cycles: Cogeneration Plant with Regeneration",
    description: "35% of the turbine flow is extracted at 1.6 MPa; one part feeds an open feedwater heater, the rest a process heater. The open-FWH energy balance determines the split.",
    note: "Verified against the textbook: boiler mass flow rate 29.1 kg/s for 25 MW of net power.",
    code: `{ Cogeneration Plant with Regeneration }
{ 35% of the turbine flow is extracted at 1.6 MPa; part heats the open
  feedwater heater, the rest serves the process heater. Isentropic
  turbine and pumps. Find the boiler flow rate for 25 MW net power. }
P[6] = 9000 [kPa]
T[6] = 400 [C]
P[7] = 1600 [kPa]    { Extraction pressure }
P[8] = 10 [kPa]      { Condenser pressure }
f_ext = 0.35         { Extracted fraction of the boiler flow }
W_dot_net = 25000 [kW]

{ State 6: turbine inlet }
h[6] = Enthalpy(Water, P=P[6], T=T[6])
s[6] = Entropy(Water, P=P[6], T=T[6])

{ States 7 and 8: isentropic expansion }
h[7] = Enthalpy(Water, P=P[7], s=s[6])
h[8] = Enthalpy(Water, P=P[8], s=s[6])

{ State 1: condenser exit; pump I to extraction pressure }
h[1] = Enthalpy(Water, P=P[8], x=0)
v[1] = Volume(Water, P=P[8], x=0)
w_pI = v[1] * (P[7] - P[8])
h[2] = h[1] + w_pI

{ States 3 and 9: FWH and process heater both yield sat. liquid at 1.6 MPa }
h[3] = Enthalpy(Water, P=P[7], x=0)
v[3] = Volume(Water, P=P[7], x=0)

{ Open FWH balance: y of the boiler flow condenses the feedwater stream }
(1 - f_ext) * h[2] + y * h[7] = (1 - f_ext + y) * h[3]

{ Mixing of FWH exit and process-heater drain is at the same state,
  then pump II raises it to boiler pressure }
w_pII = v[3] * (P[6] - P[7])
h[5] = h[3] + w_pII

{ Specific work per kg of boiler flow }
w_turb = (h[6] - h[7]) + (1 - f_ext) * (h[7] - h[8])
w_pumps = (1 - f_ext) * w_pI + w_pII
w_net = w_turb - w_pumps
W_dot_net = m_dot * w_net

{ Process heat delivered }
Q_dot_process = m_dot * (f_ext - y) * (h[7] - h[3])`,
  },
  {
    value: "binary-geothermal",
    title: "Power Cycles: Binary Geothermal Plant with Isobutane",
    description: "A binary-cycle plant where geothermal brine at 160 C drives a Rankine cycle on isobutane. The problem supplies the isobutane properties directly, so this is a pure energy-balance system.",
    note: "Results: turbine isentropic efficiency 78.8%, net power 22.6 MW, thermal efficiency 13.7%.",
    code: `{ Binary Geothermal Power Plant with Isobutane }
{ Property values are given in the problem statement. Find the turbine
  isentropic efficiency, net power and thermal efficiency. }
m_dot_geo = 555.9 [kg/s]
T_geo_in = 160 [C]
T_geo_out = 90 [C]
cp_geo = 4.258 [kJ/kg-K]
P[2] = 3250 [kPa]    { Turbine inlet pressure (pump exit) }
P[1] = 410 [kPa]     { Condenser pressure }
eta_pump = 0.90

{ Given isobutane properties }
h[1] = 273.01 [kJ/kg]    { Condenser exit, saturated liquid }
v[1] = 0.001842 [m^3/kg]
h[3] = 761.54 [kJ/kg]    { Turbine inlet }
h[4] = 689.74 [kJ/kg]    { Turbine exit, actual }
h_4s = 670.40 [kJ/kg]    { Turbine exit, isentropic }

{ (a) Turbine isentropic efficiency }
eta_turb = (h[3] - h[4]) / (h[3] - h_4s)

{ Pump work and heat-exchanger inlet state }
w_pump = v[1] * (P[2] - P[1]) / eta_pump
h[2] = h[1] + w_pump

{ Heat picked up from the geothermal brine }
Q_dot_in = m_dot_geo * cp_geo * (T_geo_in - T_geo_out)
Q_dot_in = m_dot_iso * (h[3] - h[2])

{ (b) Net power and (c) thermal efficiency }
W_dot_turb = m_dot_iso * (h[3] - h[4])
W_dot_pump = m_dot_iso * w_pump
W_dot_net = W_dot_turb - W_dot_pump
eta_th = W_dot_net / Q_dot_in * 100`,
  },
  {
    value: "brayton-irreversible",
    title: "Gas Turbines: Simple Brayton Cycle with Irreversibilities",
    description: "A gas-turbine plant between 100 and 1600 kPa with compressor and turbine efficiencies of 85% and 88%. The turbine inlet temperature is unknown and recovered from the known exhaust temperature.",
    note: "Verified against the textbook: net power 6488 kW, back work ratio 0.511, thermal efficiency 37.8%.",
    code: `{ Simple Brayton Cycle with Irreversibilities }
{ Air enters the compressor at 40 C and 850 m^3/min; the turbine exhausts
  at 650 C. Find net power, back work ratio and thermal efficiency. }
P[1] = 100 [kPa]
P[2] = 1600 [kPa]
T[1] = 40 [C]
T[4] = 650 [C]       { Turbine exit temperature }
V_dot = 850 [m^3/min]
eta_C = 0.85
eta_T = 0.88
cp = 1.108 [kJ/kg-K]
cv = 0.821 [kJ/kg-K]
k = 1.35

{ Mass flow rate from ideal gas at compressor inlet }
R = cp - cv
rho[1] = P[1] / (R * T[1])
m_dot = rho[1] * V_dot

{ Compressor }
T_2s = T[1] * (P[2] / P[1])^((k - 1) / k)
w_C = cp * (T_2s - T[1]) / eta_C
T[2] = T[1] + w_C / cp

{ Turbine: exit temperature known, inlet T[3] unknown }
T_4s = T[3] * (P[1] / P[2])^((k - 1) / k)
T[3] - T[4] = eta_T * (T[3] - T_4s)
w_T = cp * (T[3] - T[4])

{ Performance }
w_net = w_T - w_C
W_dot_net = m_dot * w_net
bwr = w_C / w_T
q_in = cp * (T[3] - T[2])
eta_th = w_net / q_in * 100`,
  },
  {
    value: "auto-gas-turbine",
    title: "Gas Turbines: Automotive Gas Turbine with Regenerator",
    description: "An isentropic Brayton cycle with a regenerator whose cold stream leaves 10 C cooler than the turbine exhaust entering it. Find the heat addition and rejection rates for 115 kW of net power.",
    note: "Verified against the textbook: heat addition 240 kW, heat rejection 125 kW.",
    code: `{ Automotive Gas Turbine with Regenerator }
{ Isentropic compressor and turbine; the cold stream leaves the
  regenerator 10 C cooler than the turbine exhaust entering it. }
P[1] = 100 [kPa]
T[1] = 30 [C]
r_p = 8
T[4] = 800 [C]       { Maximum cycle temperature (turbine inlet) }
W_dot_net = 115 [kW]
cp = 1.005 [kJ/kg-K]
k = 1.4

{ Compressor (isentropic) }
T[2] = T[1] * r_p^((k - 1) / k)

{ Turbine (isentropic) }
T[5] = T[4] * (1 / r_p)^((k - 1) / k)

{ Regenerator: cold-side exit 10 C below the hot-side inlet }
T[3] = T[5] - 10

{ Work and heat rates }
w_net = cp * (T[4] - T[5]) - cp * (T[2] - T[1])
W_dot_net = m_dot * w_net
Q_dot_in = m_dot * cp * (T[4] - T[3])
Q_dot_out = Q_dot_in - W_dot_net`,
  },
  {
    value: "brayton-regen-variable-cp",
    title: "Gas Turbines: Brayton Cycle with Regeneration and Variable Specific Heats",
    description: "Instead of assuming constant specific heats, this model uses real-gas air properties (Enthalpy/Entropy of Air) for the compressor, turbine and regenerator, exactly like the air-table solution in the book.",
    note: "Verified against the textbook: turbine exit temperature 783 K, net work 108 kJ/kg, thermal efficiency 22.5%.",
    code: `{ Brayton Cycle with Regeneration, Variable Specific Heats }
{ Real-gas air properties replace the constant-cp assumption. Find the
  turbine exit temperature, net work and thermal efficiency. }
P[1] = 100 [kPa]
T[1] = 310 [K]
r_p = 7
P[2] = P[1] * r_p
T[3] = 1150 [K]
eta_C = 0.75
eta_T = 0.82
epsilon = 0.65       { Regenerator effectiveness }

{ Compressor }
h[1] = Enthalpy(Air, T=T[1], P=P[1])
s[1] = Entropy(Air, T=T[1], P=P[1])
h_2s = Enthalpy(Air, P=P[2], s=s[1])
w_C = (h_2s - h[1]) / eta_C
h[2] = h[1] + w_C
T[2] = Temperature(Air, P=P[2], h=h[2])

{ Turbine }
h[3] = Enthalpy(Air, T=T[3], P=P[2])
s[3] = Entropy(Air, T=T[3], P=P[2])
h_4s = Enthalpy(Air, P=P[1], s=s[3])
w_T = eta_T * (h[3] - h_4s)
h[4] = h[3] - w_T
P[4] = P[1]                  { turbine exits to inlet pressure }
T[4] = Temperature(Air, P=P[1], h=h[4])

{ Regenerator }
P[5] = P[2]                  { regenerator cold side at compressor-discharge pressure }
h[5] = h[2] + epsilon * (h[4] - h[2])

{ Performance }
q_in = h[3] - h[5]
w_net = w_T - w_C
eta_th = w_net / q_in * 100

{ Plot the cycle on a temperature-entropy diagram (see "Plots in Code"). }
PLOT 'Brayton T-s'
  kind = property
  fluid = Air
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

[Graph="Brayton T-s"] T-s diagram of the regenerative Brayton cycle [/Graph]`,
  },

  // ── Hard cross-discipline case studies (all verified against the solver) ──
  {
    value: "combined-cycle",
    title: "Energy Systems: Combined Brayton–Rankine Cycle through an HRSG",
    description: "A complete combined-cycle power plant: an air-standard gas turbine (Brayton) tops a steam Rankine cycle, the two coupled through a Heat Recovery Steam Generator. The HRSG energy balance fixes the steam-to-gas mass ratio; CoolProp supplies every steam state.",
    note: "Solves in one shot per 1 kg/s of gas: compressor exit 678 K, turbine exit 774 K, 0.121 kg/s of steam raised per kg of gas, and an overall efficiency of 51.3% — higher than either cycle alone, as a real combined cycle should be.",
    code: `{ Combined-cycle plant: air-standard Brayton topping + steam Rankine
  bottoming, coupled through a Heat Recovery Steam Generator (per 1 kg/s gas). }
{ ---- Gas turbine (cold-air-standard) ---- }
cp = 1.005 [kJ/kg-K]; kk = 1.4
T1 = 300 [K]; rp = 12
T3 = 1400 [K]
eta_c = 0.82; eta_gt = 0.88
T2 = T1*(1 + (rp^((kk-1)/kk) - 1)/eta_c)
T4 = T3*(1 - eta_gt*(1 - rp^(-(kk-1)/kk)))
w_comp = cp*(T2 - T1)
w_gt   = cp*(T3 - T4)
q_gas  = cp*(T3 - T2)
wnet_gas = w_gt - w_comp
m_gas = 1 [kg/s]

{ ---- Steam Rankine bottoming (CoolProp water) ---- }
P_boil = 6000 [kPa]; T_sup = 450 [C]; P_cond = 10 [kPa]
eta_st = 0.87; eta_p = 0.85
h5 = Enthalpy(Water, P=P_boil, T=T_sup)
s5 = Entropy(Water, P=P_boil, T=T_sup)
h6s = Enthalpy(Water, P=P_cond, s=s5)
h6 = h5 - eta_st*(h5 - h6s)
h7 = Enthalpy(Water, P=P_cond, x=0)
v7 = Volume(Water, P=P_cond, x=0)
wp = v7*(P_boil - P_cond)/eta_p
h8 = h7 + wp
q_steam = h5 - h8
wnet_steam = (h5 - h6) - wp

{ ---- HRSG coupling: gas cooled from T4 to a 400 K stack ---- }
T_stack = 400 [K]
m_gas*cp*(T4 - T_stack) = m_steam*q_steam

{ ---- Plant performance ---- }
W_total = m_gas*wnet_gas + m_steam*wnet_steam
eta_overall = W_total/(m_gas*q_gas)*100`,
  },
  {
    value: "cd-nozzle-shock",
    title: "Aerospace: Supersonic Nozzle with a Normal Shock at the Exit",
    description: "A converging–diverging nozzle with exit-to-throat area ratio 4. The supersonic branch of the area–Mach relation is implicit (two roots), so set a guess of Me ≈ 2.9 in the Variable grid; a normal shock then recovers the post-shock state.",
    note: "Exit Mach 2.94 on the supersonic branch, post-shock Mach 0.479, and the shock destroys stagnation pressure from 1000 kPa to 346 kPa — the classic loss across a strong normal shock.",
    code: `{ Aerospace: CD nozzle, supersonic branch + normal shock at exit }
g = 1.4
R = 287 [J/kg-K]
P0 = 1000 [kPa]
T0 = 600 [K]
A_ratio = 4.0        { Ae/A* }
{ Area-Mach relation, supersonic root (guess Me = 2.9) }
A_ratio = (1/Me)*((2/(g+1))*(1+(g-1)/2*Me^2))^((g+1)/(2*(g-1)))
{ Isentropic exit before the shock }
Pe = P0*(1+(g-1)/2*Me^2)^(-g/(g-1))
Te = T0*(1+(g-1)/2*Me^2)^(-1)
Ve = Me*sqrt(g*R*Te)
{ Normal shock at the exit plane }
M2 = sqrt((1+(g-1)/2*Me^2)/(g*Me^2-(g-1)/2))
P2 = Pe*(1+g*Me^2)/(1+g*M2^2)
T2 = Te*(1+(g-1)/2*Me^2)/(1+(g-1)/2*M2^2)
P02 = P2*(1+(g-1)/2*M2^2)^(g/(g-1))`,
  },
  {
    value: "co2-nozzle-throat",
    title: "Compressible Flow: CO₂ Nozzle Throat Velocity",
    description: "Carbon dioxide enters a converging–diverging nozzle at 60 m/s, 310°C and 300 kPa and leaves supersonic. Because the diverging section reaches supersonic speed, the throat is choked (Ma = 1), so the throat velocity equals the local speed of sound there. The stagnation temperature comes from the inlet energy balance; the sonic temperature and speed of sound follow from constant-specific-heat ideal-gas relations.",
    note: "Throat velocity ≈ 348 m/s, confirming answer (d) 353 m/s. cp and cv come from frees's built-in CO₂ ideal-gas property functions at the inlet temperature (cp ≈ 1.06 kJ/kg-K, k ≈ 1.22); the textbook's 353 m/s uses room-temperature constant specific heats (k = 1.289), so the small difference is just the temperature dependence of cp.",
    code: `{ Throat velocity of a choked CO2 nozzle }
{ Supersonic exit => the throat is sonic (Ma = 1), so the throat velocity
  is the local speed of sound there. }
V1 = 60 [m/s]
T1 = 310 [C]
P1 = 300 [kPa]

{ CO2 ideal-gas properties from frees, evaluated at the inlet temperature }
cp = Cp(CO2, T=T1)
cv = Cv(CO2, T=T1)
k = cp / cv
R = cp - cv          { ideal gas: R = cp - cv }

{ Stagnation temperature from the inlet energy balance }
T0 = T1 + V1^2 / (2 * cp)

{ Throat is sonic (Ma = 1) }
T_throat = T0 * 2 / (k + 1)

{ Throat velocity = local speed of sound }
V_throat = sqrt(k * R * T_throat)`,
  },
  {
    value: "orbit-kepler",
    title: "Aerospace: Orbital Position from Kepler's Equation",
    description: "An elliptical Earth orbit (300 km × 3000 km altitude). Kepler's equation M = E − e·sin E is transcendental and is solved directly for the eccentric anomaly a quarter-period after perigee; radius and speed follow. Note that t and T are reserved (time) names, so the period is named Tper.",
    note: "Period 119 min, eccentricity 0.168; a quarter-period after perigee the eccentric anomaly is 1.74 rad, the true anomaly 108.9°, radius 8251 km and speed 6.85 km/s. Set a guess EA ≈ 2 in the Variable grid.",
    code: `{ Aerospace: elliptical Earth orbit; position & speed via Kepler's equation }
mu = 398600 [km^3/s^2]
Re = 6378 [km]
alt_p = 300 [km]; alt_a = 3000 [km]
rp = Re + alt_p      { perigee radius }
ra = Re + alt_a      { apogee radius }
a = (rp + ra)/2
ecc = (ra - rp)/(ra + rp)
Tper = 2*pi*sqrt(a^3/mu)     { orbital period }
tk = Tper/4                  { a quarter-period after perigee }
M = 2*pi*tk/Tper             { mean anomaly }
M = EA - ecc*sin(EA)         { Kepler's equation (guess EA = 2) }
nu = 2*arctan( sqrt((1+ecc)/(1-ecc)) * tan(EA/2) )
nu_deg = nu*180/pi
r = a*(1 - ecc*cos(EA))
v = sqrt(mu*(2/r - 1/a))`,
  },
  {
    value: "pipe-network",
    title: "Fluid Mechanics: Parallel Pipe Network with Colebrook Friction",
    description: "A flow splits into two parallel branches that must share the same head loss, then recombines. Each branch's friction factor comes from the implicit Colebrook equation, so the whole network — continuity, the equal-head-loss condition, and three transcendental friction equations — is solved simultaneously via a FOR loop block.",
    note: "The branches divide the 0.10 m³/s feed as 0.029 and 0.071 m³/s so that both lose 9.83 m of head; total network head loss is 14.5 m. Reynolds numbers and friction factors are all consistent (turbulent).",
    code: `{ Civil/Fluids: parallel pipe network, Colebrook friction }
rho = 1000 [kg/m^3]
mu = 0.001 [Pa-s]
g = 9.81 [m/s^2]
Q_in = 0.10 [m^3/s]
L[1]=300; L[2]=500; L[3]=400
D[1]=0.25; D[2]=0.15; D[3]=0.20
eps = 0.00015
Q_in = Q[1]
Q[1] = Q[2] + Q[3]            { continuity at the split }
hf[2] = hf[3]                 { parallel branches share head loss }
FOR j = 1 TO 3
  V[j] = Q[j]/(pi/4*D[j]^2)
  Re[j] = rho*V[j]*D[j]/mu
  1/sqrt(ff[j]) = -2*log10(eps/(3.7*D[j]) + 2.51/(Re[j]*sqrt(ff[j])))
  hf[j] = ff[j]*L[j]/D[j]*V[j]^2/(2*g)
END
h_total = hf[1] + hf[2]`,
  },
  {
    value: "open-channel-jump",
    title: "Water Resources: Manning Flow, Critical Depth & Hydraulic Jump",
    description: "A rectangular channel on a steep slope. Manning's equation for the normal depth is implicit; the critical depth follows from the unit discharge, and the hydraulic-jump momentum function gives the sequent depth and the energy dissipated. (Note Q and q are the same name in case-insensitive frees — the unit discharge is qu.)",
    note: "Normal depth 0.825 m is below the critical depth 1.177 m, so the flow is supercritical (Fr₁ = 1.70). The jump lifts it to 1.618 m (Fr₂ = 0.62, subcritical) and dissipates 0.094 m of head. Set a guess yn ≈ 0.6.",
    code: `{ Civil/Hydraulics: rectangular channel - normal & critical depth + jump }
g = 9.81 [m/s^2]
Q = 20 [m^3/s]
b = 5 [m]
n = 0.015
S0 = 0.01            { steep slope -> supercritical normal flow }
qu = Q/b             { unit discharge }
yc = (qu^2/g)^(1/3)  { critical depth }
{ Normal depth via Manning (implicit, guess yn = 0.6) }
Aflow = b*yn
Pwet = b + 2*yn
Rh = Aflow/Pwet
Q = (1/n)*Aflow*Rh^(2/3)*sqrt(S0)
V1 = Q/Aflow
Fr1 = V1/sqrt(g*yn)
{ Hydraulic jump: sequent depth from the momentum function }
y2 = yn/2*(sqrt(1 + 8*Fr1^2) - 1)
V2 = Q/(b*y2)
Fr2 = V2/sqrt(g*y2)
dE = (y2 - yn)^3/(4*yn*y2)   { energy dissipated }`,
  },
  {
    value: "truss-stiffness",
    title: "Structural Analysis: Plane Truss by the Direct Stiffness Method",
    description: "A three-bar truss with one free node, assembled and solved exactly as a finite-element code would: each member contributes its EA/L stiffness with direction cosines to a 2×2 global stiffness matrix, which SolveLinear inverts for the nodal displacements; member axial forces follow.",
    note: "The downward 100 kN load gives a vertical deflection of 1.00 mm and member forces −69.8, −25.1, −25.1 kN. They satisfy vertical equilibrium exactly (−69.8 − 2·25.1·0.6 = −100 kN). Watch the case-insensitive K/k clash — the matrix is Kg, the member stiffness ka.",
    code: `{ Structural: 3-bar plane truss solved by the direct stiffness method }
E = 210e9 [Pa]
A = 1e-3 [m^2]
P = 100e3 [N]
{ free node 1 at origin connected to three supports;
  member 1 vertical (L=3); members 2,3 to (+/-4, 3), L=5 }
L[1]=3; L[2]=5; L[3]=5
cx[1]=0;    sy[1]=1
cx[2]=0.8;  sy[2]=0.6
cx[3]=-0.8; sy[3]=0.6
FOR m = 1 TO 3
  ka[m] = E*A/L[m]                 { member axial stiffness EA/L }
END
{ Assemble the 2x2 reduced global stiffness at the free node }
Kg[1,1] = ka[1]*cx[1]^2 + ka[2]*cx[2]^2 + ka[3]*cx[3]^2
Kg[1,2] = ka[1]*cx[1]*sy[1] + ka[2]*cx[2]*sy[2] + ka[3]*cx[3]*sy[3]
Kg[2,1] = Kg[1,2]
Kg[2,2] = ka[1]*sy[1]^2 + ka[2]*sy[2]^2 + ka[3]*sy[3]^2
{ Solve Kg u = F for the nodal displacements, then member forces }
F[1..2] = [0, -P]
u[1..2] = SolveLinear(Kg[1..2,1..2], F[1..2])
FOR m = 1 TO 3
  Naxial[m] = ka[m]*(cx[m]*u[1] + sy[m]*u[2])
END`,
  },
  {
    value: "radiation-enclosure",
    title: "Heat Transfer: 3-Surface Radiation Enclosure with a Reradiating Wall",
    description: "An equilateral triangular duct with a hot surface, a cold surface and an adiabatic (reradiating) wall. The radiosity-network equations — two gray-surface balances plus the reradiating condition that the wall's radiosity equals its irradiation — are nonlinear in T⁴ and solved together.",
    note: "Net exchange between the gray surfaces is 30.1 kW with Q₁ = −Q₂ exactly (energy balance), and the floating reradiating wall settles at 846 K, between the 1000 K and 400 K surfaces.",
    code: `{ Heat transfer: 3-surface enclosure (equilateral triangular duct) with a
  reradiating wall, solved by the radiosity network method }
sigma = 5.67e-8 [W/m^2-K^4]
A = 1 [m^2]
T1 = 1000 [K]; eps1 = 0.8     { hot surface }
T2 = 400 [K];  eps2 = 0.8     { cold surface }
{ Each flat surface of the equilateral triangle sees the others equally }
F12 = 0.5; F13 = 0.5
F21 = 0.5; F23 = 0.5
F31 = 0.5; F32 = 0.5
Eb1 = sigma*T1^4
Eb2 = sigma*T2^4
{ Radiosity balance on the two gray surfaces }
J1 = eps1*Eb1 + (1-eps1)*(F12*J2 + F13*J3)
J2 = eps2*Eb2 + (1-eps2)*(F21*J1 + F23*J3)
{ Reradiating surface: radiosity equals its irradiation }
J3 = F31*J1 + F32*J2
{ Net heat leaving each gray surface }
Q1 = A*eps1/(1-eps1)*(Eb1 - J1)
Q2 = A*eps2/(1-eps2)*(Eb2 - J2)
T3 = (J3/sigma)^0.25          { reradiating-wall temperature }`,
  },
  {
    value: "auto-cooling-loop",
    title: "Thermal/Automotive: Radiator + Pump + Fan Cooling Loop (EG50 coolant)",
    description: "An automotive cooling loop where the fan and pump operating points are found implicitly — each performance curve, entered as a TABLE and called like a function, is intersected with its quadratic flow resistance — and the radiator heat duty follows from a digitized effectiveness table. The coolant is a 50/50 ethylene glycol/water mixture (EG50) whose density and specific heat come straight from CoolProp. The fan curve is affinity-scaled by f_rpm so you can slow the fan or sweep it in a Parametric Table.",
    note: "Solves to Q = 38.2 kW rejected, fan power 262 W and pump power 97 W, at an air-side operating point of 0.90 m³/s (~1910 CFM, 131 Pa) and a coolant flow of 89.8 L/min. EG50 at 90 °C gives ρ = 1019 kg/m³, cp = 3616 J/kg·K (vs water 965 / 4205). Data sources: cross-flow radiator effectiveness ε≈0.6–0.85 and heat rejection 25–50 kW (ResearchGate 397980466, FSAE study 356606738); SPAL 16-inch fan ~2500 CFM free-air / ~250 Pa max static (streetmusclemag.com); Davies-Craig EWP pump 90–162 L/min (daviescraig.com.au/electric-water-pumps).",
    code: `{ Automotive cooling loop: radiator + electric pump + electric fan.
  Coolant = 50/50 ethylene glycol / water (EG50), properties from CoolProp.
  Pump and fan curves are entered as TABLE blocks and used as functions.

  Data sources (typical passenger-car / aftermarket components):
   - Cross-flow radiator: effectiveness ~0.6-0.85, heat rejection ~25-50 kW
     (ResearchGate 397980466; FSAE radiator study 356606738)
   - Fan curve, SPAL 16in class: ~2500 CFM free air, ~250 Pa max static
     (streetmusclemag.com - SPAL electric fans)
   - Pump curve, Davies-Craig EWP class: 90-162 L/min
     (daviescraig.com.au/electric-water-pumps) }

{ Inputs }
T_c_in = 95 [C]        { hot coolant into radiator }
T_a_in = 35 [C]        { ambient air }
P_atm  = 101325 [Pa]
eta_fan  = 0.45        { fan total efficiency }
eta_pump = 0.55        { pump total efficiency }
f_rpm    = 1           { fan speed / rated (set < 1 to slow the fan) }

{ Fan curve: static pressure [Pa] vs air flow [m^3/s] }
TABLE fanCurve(Vair)
  0.0    250
  0.3    232
  0.6    195
  0.9    132
  1.18   0
END

{ Pump curve: head [Pa] vs coolant flow [m^3/s] }
TABLE pumpCurve(Vc)
  0.0      55000
  0.0008   48000
  0.0016   34000
  0.0023   0
END

{ Radiator effectiveness (digitized): epsilon vs air flow [m^3/s] }
TABLE radEff(Vair)
  0.3   0.45
  0.6   0.55
  0.9   0.62
  1.2   0.67
END

{ Flow resistances: dP = K * V^2 }
K_air = 160
K_c   = 1.6e10

{ Fan operating point (affinity-scaled to f_rpm) meets air-side resistance }
dP_air = f_rpm^2 * fanCurve(Vair / f_rpm)
dP_air = K_air * Vair^2

{ Pump operating point meets coolant-loop resistance }
head = pumpCurve(Vc)
head = K_c * Vc^2

{ Coolant properties from the EG50 mixture; air properties at ~40 C }
rho_c = Density(EG50, T=90 [C], P=P_atm)
cp_c  = Cp(EG50, T=90 [C], P=P_atm)
rho_air = 1.13 [kg/m^3]
cp_air  = 1006 [J/kg-K]

{ Mass flows and capacity rates }
m_air = rho_air * Vair
m_c   = rho_c * Vc
C_air = m_air * cp_air
C_c   = m_c * cp_c
C_min = min(C_air, C_c)

{ Heat transfer (effectiveness method) }
eps = radEff(Vair)
Q = eps * C_min * (T_c_in - T_a_in)
T_c_out = T_c_in - Q / C_c
T_a_out = T_a_in + Q / C_air

{ Power draw }
W_fan  = dP_air * Vair / eta_fan
W_pump = head * Vc / eta_pump`,
  },
  {
    value: "load-flow",
    title: "Power Systems: Two-Bus AC Power Flow (Newton–Raphson Load Flow)",
    description: "A slack bus feeds a PQ load bus over a transmission line. The polar power-flow equations are exactly the nonlinear system a Newton–Raphson load-flow program solves; here the bus voltage magnitude and angle are recovered directly from the scheduled real and reactive injections.",
    note: "Drawing 0.5 + j0.2 pu through a 0.02 + j0.06 pu line drops the load-bus voltage to 0.977 pu at an angle of −1.52° — the expected sag and phase lag behind the slack bus. Set guesses V2 ≈ 1, th2 ≈ −0.1.",
    code: `{ Power systems: 2-bus AC power flow (Newton-Raphson load flow) }
{ Bus 1 = slack (V1=1, th1=0). Bus 2 = PQ load. Line z = 0.02 + j0.06 pu }
zr = 0.02; zi = 0.06
den = zr^2 + zi^2
yr = zr/den          { series conductance }
yi = -zi/den         { series susceptance }
G22 = yr;  B22 = yi
G21 = -yr; B21 = -yi
V1 = 1.0; th1 = 0
P2 = -0.5; Q2 = -0.2          { scheduled load injections (pu) }
{ Polar power-flow equations (guess V2 = 1, th2 = -0.1) }
P2 = V2^2*G22 + V1*V2*(G21*cos(th2-th1) + B21*sin(th2-th1))
Q2 = -V2^2*B22 + V1*V2*(G21*sin(th2-th1) - B21*cos(th2-th1))
th2_deg = th2*180/pi`,
  },
  {
    value: "reforming-equilibrium",
    title: "Chemical Engineering: Coupled Reforming + Water-Gas-Shift Equilibrium",
    description: "Two reactions reach equilibrium at once: steam-methane reforming (Δn = +2, pressure-dependent) and the water-gas shift (Δn = 0). The two equilibrium-constant expressions, written in mole fractions and extents of reaction, form a coupled nonlinear pair solved for the full product composition.",
    note: "At the given equilibrium constants the methane conversion is 98.5%; the dry product is hydrogen-rich (y_H₂ = 0.56) with the mole fractions summing exactly to 1. Set guesses x1 ≈ 0.9, x2 ≈ 0.3 (both bounded 0–1).",
    code: `{ Chemical: coupled equilibrium of steam-methane reforming + water-gas shift }
{ R1: CH4 + H2O <-> CO + 3 H2     (Kp1, dn=+2)
  R2: CO  + H2O <-> CO2 + H2      (Kp2, dn=0)  }
Kp1 = 26.0      { at ~1000 K, dimensionless with P0 = 1 bar }
Kp2 = 1.45
P = 1.0 [bar]
P0 = 1.0 [bar]
n_CH4_0 = 1; n_H2O_0 = 3
{ Extents x1, x2 (guesses 0.9 and 0.3); equilibrium moles }
n_CH4 = n_CH4_0 - x1
n_H2O = n_H2O_0 - x1 - x2
n_CO  = x1 - x2
n_H2  = 3*x1 + x2
n_CO2 = x2
n_tot = n_CH4 + n_H2O + n_CO + n_H2 + n_CO2
y_CH4 = n_CH4/n_tot; y_H2O = n_H2O/n_tot; y_CO = n_CO/n_tot
y_H2 = n_H2/n_tot;   y_CO2 = n_CO2/n_tot
Kp1 = (y_CO*y_H2^3)/(y_CH4*y_H2O) * (P/P0)^2
Kp2 = (y_CO2*y_H2)/(y_CO*y_H2O)
conv = x1/n_CH4_0*100         { methane conversion, % }`,
  },
  {
    value: "pid-pole-placement",
    title: "Control Systems: PID Design by Pole Placement",
    description: "A PID controller is designed for a DC-motor plant K/(s(τs+1)) so that the closed-loop characteristic polynomial matches a target — a dominant second-order pair (ζ, ωₙ) plus a fast real pole. Matching the three coefficients gives three linear equations for the proportional, integral and derivative gains.",
    note: "For ζ = 0.7, ωₙ = 10 rad/s and a pole at −50, the gains are Kc = 200, Ki = 1250, Kd = 15.5; the dominant pair gives 4.6% overshoot and a 0.57 s settling time. Each matched coefficient checks out exactly.",
    code: `{ Controls: PID design by pole placement for plant G(s)=K/(s(tau s+1)) }
Kp_plant = 2.0      { plant DC gain }
tau = 0.5 [s]
{ Desired poles: a complex pair (zeta, wn) + a fast real pole at -p }
zeta = 0.7
wn = 10 [rad/s]
p = 50 [rad/s]
{ Closed-loop char. poly  s^3 + ((1+Kp_plant*Kd)/tau) s^2
     + (Kp_plant*Kc/tau) s + Kp_plant*Ki/tau
   matched to (s+p)(s^2 + 2 zeta wn s + wn^2) }
(1 + Kp_plant*Kd)/tau = p + 2*zeta*wn
Kp_plant*Kc/tau       = wn^2 + 2*zeta*wn*p
Kp_plant*Ki/tau       = p*wn^2
ts = 4/(zeta*wn)                              { settling time }
Mp = exp(-pi*zeta/sqrt(1-zeta^2))*100         { percent overshoot }`,
  },
  {
    value: "inhour-equation",
    title: "Nuclear Engineering: Stable Reactor Period from the Inhour Equation",
    description: "A step reactivity insertion in a reactor with six delayed-neutron groups. The inhour equation relating reactivity to the stable period is transcendental with all six groups contributing; the β and λ data are entered as arrays and summed.",
    note: "Inserting 0.0025 Δk/k (well below the 0.0065 delayed-neutron fraction) gives a stable, positive reactor period of about 10.9 s — a controllable transient. Above β the period would collapse to prompt-critical. Set a guess Tper ≈ 30 s.",
    code: `{ Nuclear: stable reactor period from the 6-group inhour equation (U-235) }
Lambda = 2e-5 [s]            { prompt neutron generation time }
rho = 0.0025                 { inserted reactivity (dk/k) }
beta[1..6] = [0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273]
lam[1..6]  = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01]
{ Stable period Tper (guess ~30 s); contributions of the 6 groups }
FOR i = 1 TO 6
  term[i] = beta[i]/(1 + lam[i]*Tper)
END
rho = Lambda/Tper + sum(term[1..6])
beta_tot = sum(beta[1..6])`,
  },
  {
    value: "paris-fatigue",
    title: "Materials Engineering: Fatigue Life by Integrating the Paris Law",
    description: "An edge-cracked plate under cyclic stress. The critical crack length comes from the fracture toughness; the cycles to failure are the Paris-law crack-growth rate integrated from the initial to the critical crack length — a definite integral with the unknown (critical length) as its upper limit.",
    note: "The crack grows from 0.5 mm to a critical 10.15 mm, giving a fatigue life of about 161,000 cycles. frees evaluates the crack-growth integral directly with the critical length solved from the toughness in the same system.",
    code: `{ Materials: fatigue life of an edge-cracked plate via the Paris law
  integrated from initial to critical crack length (consistent MPa, m units) }
C = 6.9e-12; m = 3.0       { Paris constants (m/cycle, MPa*sqrt(m)) }
Y = 1.12                   { edge-crack geometry factor }
K_IC = 60                  { fracture toughness, MPa*sqrt(m) }
sig_max = 300              { max stress, MPa }
dsig = 200                 { stress range, MPa }
a_i = 0.0005               { initial crack length, m }
a_c = (K_IC/(sig_max*Y))^2/pi      { critical crack length }
{ Cycles to failure = integral of da / (C (dsig Y sqrt(pi a))^m) }
N_f = Integral(1/(C*(dsig*Y*sqrt(pi*a))^m), a, a_i, a_c)`,
  },
  {
    value: "ammonia-refrigeration",
    title: "HVAC & Refrigeration: Ammonia Refrigeration Cycle COP",
    description: "An ammonia (R-717) chiller with a flooded evaporator operates between suction pressure 38.5 psia (with 20°F superheat) and discharge pressure 229 psia. The COP is computed from states' enthalpies.",
    note: "Results: COP = 3.9, cooling load = 10,250 Btu/min, compressor power = 2,594 Btu/min. (NCEES Problem 1)",
    code: `{ Problem 1: Ammonia Refrigeration Cycle COP }
P_suction = 38.5 [psia]
superheat = 20 [F]
P_discharge = 229 [psia]
m_dot = 22 [lb/min]

h1 = 627.0 [Btu/lbm]      { Enthalpy entering compressor }
h2 = 745.0 [Btu/lbm]      { Enthalpy leaving compressor }
h3 = 161.1 [Btu/lbm]      { Saturated liquid leaving condenser }

COP = (h1 - h3) / (h2 - h1)
Q_dot_cool = m_dot * (h1 - h3)
W_dot_comp = m_dot * (h2 - h1)`,
  },
  {
    value: "face-bypass-control",
    title: "HVAC & Refrigeration: Face and Bypass Control Load",
    description: "Face and bypass control maintains room air at 80°F db/50% rh. A mixed stream of outdoor air and return air is cooled by a chilled-water coil. The total refrigeration load is determined from psychrometric property functions.",
    note: "Results: mixed enthalpy = 32.8 Btu/lb, supply enthalpy = 23.8 Btu/lb, total load = 67.9 tons of refrigeration. (NCEES Problem 2)",
    code: `{ Problem 2: Face and Bypass Control Load }
V_dot_supply = 20000 [cfm]
V_dot_oa = 5000 [cfm]
T_room = 80 [F]
rh_room = 0.50
T_oa_db = 90 [F]
T_oa_wb = 74 [F]
T_coil_out_db = 58 [F]
T_coil_out_wb = 56 [F]
P_atm = 14.696 [psia]

v_supply = 13.25 [ft^3/lb] { Specific volume of supply air }
m_dot_supply = V_dot_supply * 60 / v_supply

f_oa = V_dot_oa / V_dot_supply
f_return = 1 - f_oa

h_room = Enthalpy(AirH2O, T=T_room, R=rh_room, P=P_atm)
h_oa = Enthalpy(AirH2O, T=T_oa_db, B=T_oa_wb, P=P_atm)
h_mix = f_oa * h_oa + f_return * h_room
h_supply = Enthalpy(AirH2O, T=T_coil_out_db, B=T_coil_out_wb, P=P_atm)

Q_dot_coil_btu = m_dot_supply * (h_mix - h_supply)
Q_dot_coil_tons = Q_dot_coil_btu / 12000`,
  },
  {
    value: "psychrometric-balancing",
    title: "HVAC & Refrigeration: Psychrometric Room Balancing",
    description: "Calculates entering and leaving air conditions for a cooling coil serving a space with both sensible and latent heat gains under outdoor ventilation requirements.",
    note: "Results: Mixed Air Temp = 80.7°F db / 66.2°F wb, Leaving Air Temp = 55.0°F db / 51.1°F wb. (NCEES Problem 3)",
    code: `{ Problem 3: Psychrometric Room Balancing }
Q_sensible = 90000 [Btu/hr]
Q_latent = 40000 [Btu/hr]
V_dot_supply = 3600 [cfm]
T_supply_db = 55 [F]
T_room_db = 78 [F]
rh_room = 0.45
T_oa_db = 92 [F]
T_oa_wb = 76 [F]
V_dot_oa = 700 [cfm]
P_atm = 14.696 [psia]

V_dot_return = V_dot_supply - V_dot_oa
f_oa = V_dot_oa / V_dot_supply
f_return = V_dot_return / V_dot_supply

{ Mixed air condition (MAT) }
T_entering_db = f_oa * T_oa_db + f_return * T_room_db
h_room = Enthalpy(AirH2O, T=T_room_db, R=rh_room, P=P_atm)
h_oa = Enthalpy(AirH2O, T=T_oa_db, B=T_oa_wb, P=P_atm)
h_mix = f_oa * h_oa + f_return * h_room
T_entering_wb = WetBulb(AirH2O, T=T_entering_db, H=h_mix, P=P_atm)

{ Room total load: sensible + latent + ventilation load }
Q_total = Q_sensible + Q_latent + V_dot_oa * 4.5 * (h_oa - h_room)
h_leaving = h_mix - Q_total / (4.5 * V_dot_supply)
T_leaving_wb = WetBulb(AirH2O, T=T_supply_db, H=h_leaving, P=P_atm)`,
  },
  {
    value: "solar-heat-gain",
    title: "HVAC & Refrigeration: Solar Heat Gain Through Windows",
    description: "Calculates total heat gain through windows on North, East, and West faces of a building using U-value, Cooling Load Temperature Differences (CLTD), and Solar Heat Gain Factors (SHGF).",
    note: "Results: total heat gain = 21,720 Btu/hr. (NCEES Problem 4)",
    code: `{ Problem 4: Solar Heat Gain Through Windows }
U_value = 1.1 [Btu/hr-ft^2-F]
T_in = 75 [F]
T_out = 95 [F]
A_window = 40 [ft^2]

SHGF_North = 47 [Btu/hr-ft^2]
SHGF_East = 215 [Btu/hr-ft^2]
SHGF_West = 215 [Btu/hr-ft^2]

Q_North = A_window * SHGF_North + U_value * A_window * (T_out - T_in)
Q_East = A_window * SHGF_East + U_value * A_window * (T_out - T_in)
Q_West = A_window * SHGF_West + U_value * A_window * (T_out - T_in)

Q_total = Q_North + Q_East + Q_West`,
  },
  {
    value: "enthalpy-wheel",
    title: "HVAC & Refrigeration: Enthalpy Wheel Heat Recovery",
    description: "Finds the dry-bulb temperature of tempered air leaving an 80% effective sensible/latent heat recovery enthalpy wheel.",
    note: "Results: leaving dry-bulb temperature = 79°F. (NCEES Problem 5)",
    code: `{ Problem 5: Enthalpy Wheel Heat Recovery }
V_dot_oa = 1500 [cfm]
T_oa_db = 95 [F]
T_oa_wb = 78 [F]
T_room_db = 75 [F]
rh_room = 0.50
effectiveness = 0.80

T_tempered_db = T_oa_db - (T_oa_db - T_room_db) * effectiveness`,
  },
  {
    value: "run-around-cycle",
    title: "HVAC & Refrigeration: Run-Around Water Cycle Balance",
    description: "Determines leaving air temperature from a cooling coil coupled to a run-around loop water cycle under steady-state energy balance.",
    note: "Results: heat transfer rate = 75,000 Btu/hr, air temp difference = 13.6°F, leaving air temperature = 61.4°F (or 52°F depending on heating balancing). (NCEES Problem 6)",
    code: `{ Problem 6: Run-Around Water Cycle }
gpm = 15 [gpm]
delta_T_water = 10 [F]
T_air_in = 75 [F]
cfm = 5000 [cfm]

{ Heat transfer rate }
Q = 500 * gpm * delta_T_water
Q = 1.1 * cfm * delta_T_air
T_air_out = T_air_in - delta_T_air`,
  },
  {
    value: "latent-heat-freezing",
    title: "HVAC & Refrigeration: Specific Heat of Freezing",
    description: "Calculates the cooling required to cool 10,000 lbs of frozen chicken from its freezing point (27°F) to storage temperature (-10°F).",
    note: "Results: cooling required = 136,900 Btu. (NCEES Problem 7)",
    code: `{ Problem 7: Specific & Latent Heat of Freezing }
mass = 10000 [lb]
T_freeze = 27 [F]
T_storage = -10 [F]
Cp_below = 0.37 [Btu/lb-F]

Q_required = mass * Cp_below * (T_freeze - T_storage)`,
  },
  {
    value: "pumping-friction-head",
    title: "HVAC & Refrigeration: Pumping and Friction Head",
    description: "Computes the operating head of a water pump overcoming static elevation and pipe friction (Darcy-Weisbach friction equation) under pressurized inlet conditions.",
    note: "Results: velocity = 8.54 ft/s, friction head = 9.3 ft, total head required = 169.3 ft, inlet head = 46.2 ft, pump head = 123.1 ft. (NCEES Problem 8)",
    code: `{ Problem 8: Pumping and Friction Head }
T_water = 90 [F]
gpm = 26000 [gpm]
f_factor = 0.01
L_eq = 2425 [ft]
z_elev = 160 [ft]
P_inlet = 20 [psig]
OD = 36 [in]
t_wall = 0.375 [in]

ID = (OD - 2 * t_wall) / 12 [ft]
V = (gpm * 0.1337 / 60) / (pi / 4 * ID^2) [ft/s]
h_friction = f_factor * (L_eq / ID) * (V^2 / 64.4) [ft]
h_total = z_elev + h_friction

h_inlet = P_inlet * 2.31 [ft]
h_pump = h_total - h_inlet`,
  },
  {
    value: "air-supply-wetbulb",
    title: "HVAC & Refrigeration: Air Supply Wet-Bulb Determination",
    description: "Finds the wet-bulb temperature of the supply air to maintain a room at 75°F db/63°F wb under sensible load and Sensible Heat Factor.",
    note: "Results: total heat load = 250,000 Btu/hr, supply enthalpy = 20.25 Btu/lb, supply wet-bulb temperature = 55.0°F. (NCEES Problem 9)",
    code: `{ Problem 9: Air Supply Wet-Bulb Determination }
T_room_db = 75 [F]
T_room_wb = 63 [F]
T_supply_db = 58 [F]
Q_sensible = 200000 [Btu/hr]
SHF = 0.80
V_dot_supply = 10700 [cfm]
P_atm = 14.696 [psia]

h_room = Enthalpy(AirH2O, T=T_room_db, B=T_room_wb, P=P_atm)
Q_total = Q_sensible / SHF

{ Total heat equation: Q_total = 4.5 * cfm * (h_room - h_supply) }
Q_total = 4.5 * V_dot_supply * (h_room - h_supply)
T_supply_wb = WetBulb(AirH2O, T=T_supply_db, H=h_supply, P=P_atm)`,
  },
  {
    value: "multistage-food-freezing",
    title: "HVAC & Refrigeration: Multi-Stage Food Freezing",
    description: "Calculates total refrigeration required to cool lean ham from 40°F to 28°F, freeze it, and then subcool it to 0°F.",
    note: "Results: cooling above = 99,600 Btu, freezing = 980,000 Btu, cooling below = 148,400 Btu, total = 1.228 x 10^6 Btu. (NCEES Problem 10)",
    code: `{ Problem 10: Multi-Stage Food Freezing }
mass = 10000 [lb]
T_in = 40 [F]
T_freeze = 28 [F]
T_out = 0 [F]
Cp_above = 0.83 [Btu/lb-F]
Cp_below = 0.53 [Btu/lb-F]
L_fusion = 98 [Btu/lb]

Q_sensible_above = mass * Cp_above * (T_in - T_freeze)
Q_latent_freeze = mass * L_fusion
Q_sensible_below = mass * Cp_below * (T_freeze - T_out)

Q_total_btu = Q_sensible_above + Q_latent_freeze + Q_sensible_below
Q_total_millions = Q_total_btu / 1e6`,
  },
  {
    value: "siyavula-correlation",
    title: "Statistics: Linear Correlation (Siyavula Grade 12 Table & Curve Fit)",
    description: "Defines a bivariate dataset from Siyavula Grade 12 Statistics using an inline TABLE block. When compiled, the table is registered as an internal table and can be selected as the data source in the Curve Fit tool (function icon in the left rail) to find the regression line and correlation coefficient.",
    note: "How-To: 1. Paste this code and press Check (F4). 2. Open the Curve Fit tool on the left rail. 3. Select 'siyavula_data' from the Table dropdown. 4. Select 'x' as independent, 'y' as dependent column. 5. Choose the Linear template and click Fit. R² = 0.9921 yields |r| = sqrt(0.9921) = 0.9961, and since the slope is negative, r = -0.9961.",
    code: `{ Statistics: Linear Correlation (Siyavula Grade 12) }
{ This example defines the Siyavula Grade 12 Statistics bivariate dataset
  using an inline TABLE block. Once compiled (F4), the table is registered
  in the app's internal tables and can be loaded into the Curve Fit engine. }

TABLE siyavula_data(x)
   58   -100
  -81    195
  -94    210
   67   -126
  -13      9
   52   -102
 -100    228
  -11     40
   44    -96
  -54    131
END

{ A dummy equation using the table function to ensure it compiles }
y_test = siyavula_data(0)`,
  },
];


import { ReactNode } from 'react';
import { TextInput, CloseButton, Accordion as MantineAccordion } from '@mantine/core';
import {
  IconSearch,
  IconBook,
  IconCalculator,
  IconGrid3x3,
  IconCode,
  IconFlask,
  IconAdjustments,
  IconChartBar,
  IconFileText
} from '@tabler/icons-react';

const CATEGORIES = [
  {
    title: 'Getting Started',
    icon: <IconBook size={16} />,
    items: [
      { id: 'started', label: 'Introduction & Workflow', keywords: ['intro', 'philosophy', 'workflow', 'getting started'] },
      { id: 'shortcuts', label: 'Keyboard Shortcuts', keywords: ['hotkey', 'shortcuts', 'keyboard', 'f2', 'f4', 'f9', 'ctrl'] },
      { id: 'reports', label: 'Markdown & Reports', keywords: ['markdown', 'report', 'latex', 'katex', 'inline', 'equations'] },
      { id: 'digitizer-fit', label: 'Graph Digitizer & Curve Fit', keywords: ['digitizer', 'curve', 'fit', 'table', 'regression', 'equation', 'graph'] },
    ]
  },
  {
    title: 'Language Fundamentals',
    icon: <IconCalculator size={16} />,
    items: [
      { id: 'syntax', label: 'Equation Syntax & Rules', keywords: ['syntax', 'equality', 'case', 'comment', 'rules'] },
      { id: 'math-funcs', label: 'Mathematical Functions', keywords: ['abs', 'sqrt', 'ln', 'log10', 'exp', 'sin', 'cos', 'tan', 'atan2', 'min', 'max', 'sum', 'avg', 'sinh', 'cosh', 'tanh', 'arcsinh', 'arccosh', 'arctanh', 'round', 'floor', 'ceil', 'trunc', 'sign', 'factorial', 'step', 'if', 'product', 'gcd', 'lcm', 'bitand', 'bitor', 'bitxor', 'bitnot', 'bitshiftl', 'bitshiftr', 'bitwise', 'shift', 'baseconvert'] },
      { id: 'special-funcs', label: 'Special & Statistical Functions', keywords: ['bessel', 'besselk', 'bessely', 'bessel_i0', 'bessel_j0', 'chi_square', 'random', 'randg', 'probability', 'gamma', 'loggamma', 'digamma', 'beta', 'erf', 'erfc', 'erfinv'] },
      { id: 'variables', label: 'Variables, Guesses & Bounds', keywords: ['variables', 'guess', 'bounds', 'limits', 'variable info'] },
      { id: 'uncertainty', label: 'Uncertainty Propagation', keywords: ['uncertainty', 'propagation', 'error', 'uncertaintyof', 'svd'] },
      { id: 'units', label: 'Units & Consistency', keywords: ['unit', 'si', 'convert', 'converttemp', 'temperature', 'dimension', 'annotation'] },
      { id: 'arrays', label: 'Arrays & For Loops', keywords: ['array', 'for', 'duplicate', 'loops', 'slice', 'index'] },
      { id: 'complex', label: 'Complex Numbers & Helpers', keywords: ['complex', 'imaginary', 'real', 'i', 'j', 'angle', 'polar', 'conj', 'magnitude', 'cis'] },
      { id: 'strings', label: 'String Variables & Functions', keywords: ['string', 'chr$', 'concat$', 'copy$', 'lowercase$', 'uppercase$', 'trim$', 'stringlen', 'stringpos', 'stringval', 'date$', 'time$', 'timestamp$', 'unitsystem$', 'unitsof$'] },
    ]
  },
  {
    title: 'Matrix & Linear Algebra',
    icon: <IconGrid3x3 size={16} />,
    items: [
      { id: 'matrices-decl', label: 'Declaring Matrices & Vectors', keywords: ['matrix', 'vector', 'declaring', 'literal', 'semicolon', 'brackets', 'matlab'] },
      { id: 'matrices-ops', label: 'Matrix Operators (+, -, *, \\, \')', keywords: ['operators', 'transpose', 'backslash', 'multiplication', 'solve', 'matlab'] },
      { id: 'matrices-blas', label: 'OpenBLAS Algebra Functions', keywords: ['blas', 'axpy', 'scal', 'copy', 'asum', 'nrm2', 'gemv', 'ger', 'gemm', 'openblas'] },
      { id: 'matrices-sys', label: 'Linear Systems & Decomp', keywords: ['solvelinear', 'determinant', 'ludecompose', 'eigen', 'eigenvalues', 'eulerrotate', 'eulerdecompose', 'rotation'] },
    ]
  },
  {
    title: 'Programming & Logic',
    icon: <IconCode size={16} />,
    items: [
      { id: 'functions', label: 'Custom Functions & Procedures', keywords: ['functions', 'procedures', 'call', 'custom', 'outputs', 'while', 'repeat', 'until', 'loop', 'if', 'then', 'else'] },
      { id: 'tables-code', label: 'Custom Tables (TABLE)', keywords: ['table', 'interp', 'tabulated', 'custom tables', 'curve fit'] },
      { id: 'lookup-tables', label: 'Lookup Tables & Interpolation', keywords: ['lookup', 'interpolate', 'differentiate', 'table', 'interpolation', 'spline'] },
      { id: 'table-accessors', label: 'Table Accessors & Aggregates', keywords: ['parametric', 'integral', 'run', 'tablevalue', 'tablerun#', 'nparametricruns', 'sum', 'avg', 'min', 'max', 'stddev', 'integralvalue'] },
      { id: 'modules', label: 'Modular Submodels (MODULE)', keywords: ['module', 'submodel', 'modular', 'call module'] },
    ]
  },
  {
    title: 'Fluids & Materials',
    icon: <IconFlask size={16} />,
    items: [
      { id: 'thermo', label: 'Fluid Properties (CoolProp & Gas)', keywords: ['coolprop', 'fluids', 'water', 'steam', 'refrigerant', 'glycol', 'density', 'enthalpy', 'entropy', 'p_sat', 't_sat', 'molarmass', 'compressibilityfactor', 'prandtl', 'surfacetension', 'fugacity', 'enthalpy_fusion', 'dipole', 'p_crit', 't_crit', 'v_crit', 't_triple', 'isidealgas', 'phase$'] },
      { id: 'solid-materials', label: 'Solid & Material Properties', keywords: ['material', 'solid', 'c_', 'k_', 'rho_', 'mu_', 'pv_', 'e_', 'nu_', 'epsilon_', 'volexpcoef', 'freezingpt', 'deltal\\l_293', 'ek_lj', 'sigma_lj'] },
      { id: 'humidair', label: 'Psychrometrics (AirH2O)', keywords: ['psychrometric', 'humid air', 'airh2o', 'relative humidity', 'wet bulb', 'dew point'] },
    ]
  },
  {
    title: 'Advanced Solving',
    icon: <IconAdjustments size={16} />,
    items: [
      { id: 'calculus', label: 'Numerical Integration (ODEs)', keywords: ['integral', 'ode', 'differential', 'calculus', 'runge-kutta'] },
      { id: 'optimization', label: 'Optimization & sweeps', keywords: ['optimization', 'sweep', 'parametric', 'minimization', 'maximization'] },
      { id: 'api', label: 'Solver Reference & API', keywords: ['api', 'solver', 'newton', 'tarjan', 'residuals', 'jacobian'] },
    ]
  },
  {
    title: 'Diagrams & Plots',
    icon: <IconChartBar size={16} />,
    items: [
      { id: 'diagram', label: 'Diagram Canvas & Plotting', keywords: ['diagram', 'plots', 'graph', 'canvas', 'recording', 'export'] },
      { id: 'plot-code', label: 'Plots in Code (PLOT)', keywords: ['plot', 'graph', 'chart', 'code', 'programmatic', 'xy', 'property', 'psychro'] },
    ]
  },
  {
    title: 'Case Studies',
    icon: <IconFileText size={16} />,
    items: [
      { id: 'examples', label: 'Engineering Examples Library', keywords: ['examples', 'rankine', 'brayton', 'combined cycle', 'pipe network', 'truss', 'radiation', 'cooling loop', 'reforming', 'pid', 'fatigue', 'nuclear', 'siyavula', 'nozzle', 'co2', 'compressible', 'throat', 'sonic'] },
    ]
  }
];

function FunctionRef({ name, syntax, desc, inputs, outputs, example }: {
  name: string;
  syntax: string;
  desc: string | ReactNode;
  inputs: { name: string; desc: string }[];
  outputs: { name: string; desc: string }[];
  example: string;
}) {
  return (
    <Card withBorder radius="md" p="md" bg="dark.8" mb="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-5)' }}>
      <Group justify="space-between" mb="xs">
        <Title order={4} c="blue.3" style={{ fontFamily: 'monospace' }}>{name}</Title>
        <Badge variant="light" color="blue">Function Reference</Badge>
      </Group>
      <Text size="sm" mb="md" style={{ lineHeight: 1.5 }}>{desc}</Text>
      
      <Text fw={600} size="sm" mb="xs">Syntax</Text>
      <Paper withBorder p="xs" bg="dark.9" mb="md" radius="sm">
        <Code block style={{ background: 'transparent', color: '#82c91e' }}>{syntax}</Code>
      </Paper>

      {inputs.length > 0 && (
        <>
          <Text fw={600} size="sm" mb="xs">Input Arguments</Text>
          <Table striped withTableBorder withColumnBorders mb="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '150px' }}>Argument</Table.Th>
                <Table.Th>Description</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {inputs.map(i => (
                <Table.Tr key={i.name}>
                  <Table.Td><Code>{i.name}</Code></Table.Td>
                  <Table.Td>{i.desc}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {outputs.length > 0 && (
        <>
          <Text fw={600} size="sm" mb="xs">Output Arguments</Text>
          <Table striped withTableBorder withColumnBorders mb="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '150px' }}>Argument</Table.Th>
                <Table.Th>Description</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {outputs.map(o => (
                <Table.Tr key={o.name}>
                  <Table.Td><Code>{o.name}</Code></Table.Td>
                  <Table.Td>{o.desc}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      <Text fw={600} size="sm" mb="xs">Example</Text>
      <Paper withBorder p="xs" bg="dark.9" radius="sm" style={{ position: 'relative' }}>
        <CopyButton code={example} />
        <Code block style={{ background: 'transparent' }}>{example}</Code>
      </Paper>
    </Card>
  );
}

function ProcedureRef({ name, syntax, desc, inputs, outputs, example }: {
  name: string;
  syntax: string;
  desc: string | ReactNode;
  inputs: { name: string; desc: string }[];
  outputs: { name: string; desc: string }[];
  example: string;
}) {
  return (
    <Card withBorder radius="md" p="md" bg="dark.8" mb="md" style={{ borderLeft: '4px solid var(--mantine-color-indigo-5)' }}>
      <Group justify="space-between" mb="xs">
        <Title order={4} c="indigo.3" style={{ fontFamily: 'monospace' }}>{name}</Title>
        <Badge variant="light" color="indigo">Procedure Reference</Badge>
      </Group>
      <Text size="sm" mb="md" style={{ lineHeight: 1.5 }}>{desc}</Text>
      
      <Text fw={600} size="sm" mb="xs">Syntax</Text>
      <Paper withBorder p="xs" bg="dark.9" mb="md" radius="sm">
        <Code block style={{ background: 'transparent', color: '#ffc078' }}>{syntax}</Code>
      </Paper>

      {inputs.length > 0 && (
        <>
          <Text fw={600} size="sm" mb="xs">Input Variables</Text>
          <Table striped withTableBorder withColumnBorders mb="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '150px' }}>Variable</Table.Th>
                <Table.Th>Description</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {inputs.map(i => (
                <Table.Tr key={i.name}>
                  <Table.Td><Code>{i.name}</Code></Table.Td>
                  <Table.Td>{i.desc}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {outputs.length > 0 && (
        <>
          <Text fw={600} size="sm" mb="xs">Output Variables</Text>
          <Table striped withTableBorder withColumnBorders mb="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '150px' }}>Variable</Table.Th>
                <Table.Th>Description</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {outputs.map(o => (
                <Table.Tr key={o.name}>
                  <Table.Td><Code>{o.name}</Code></Table.Td>
                  <Table.Td>{o.desc}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      <Text fw={600} size="sm" mb="xs">Example</Text>
      <Paper withBorder p="xs" bg="dark.9" radius="sm" style={{ position: 'relative' }}>
        <CopyButton code={example} />
        <Code block style={{ background: 'transparent' }}>{example}</Code>
      </Paper>
    </Card>
  );
}

export default function HelpPage() {
  const [opened, { toggle }] = useDisclosure();
  const [active, setActive] = useState('started');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Categories by Search Query
  const filteredCategories = CATEGORIES.map(category => {
    const filteredItems = category.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { ...category, items: filteredItems };
  }).filter(category => category.items.length > 0);

  const renderContent = () => {
    switch (active) {
      case 'started':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Introduction & Solver Philosophy</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Welcome to the <strong>frees</strong> (free solver) documentation. frees is a next-generation, declarative equation-solving environment designed for engineering problems, thermodynamics, and multi-domain simulation.
            </Text>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Unlike traditional programming environments (like MATLAB scripts, Python, or C++), where you must explicitly isolate and rearrange equations to calculate unknowns (e.g. writing <code>x = f(y)</code>), frees is <strong>declarative</strong>. You input your equations exactly as they are written in engineering textbooks (e.g. <code>P * V = n * R * T</code>), and the compiler automatically identifies the unknowns, constructs the dependency graphs, groups them using Tarjan's strongly connected components algorithm, and solves them simultaneously.
            </Text>

            <Alert color="blue" title="Declarative Equations vs Sequential Code" mt="xs">
              In frees, the order of equations does not matter. The equations <code>x + y = 5</code> and <code>y = 5 - x</code> are mathematically equivalent and parsed identically. The solver handles the symbolic and numerical heavy lifting.
            </Alert>

            <Title order={3} mt="sm">The frees Engineering Workflow</Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <Text fw={600} size="sm" c="blue.3">1. Describe System</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Write the governing algebraic, matrix, or differential equations in the code editor. Supply comments in curly braces.
                </Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <Text fw={600} size="sm" c="indigo.3">2. Compile & Bound (F4)</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Validate degrees of freedom. Set physical lower/upper bounds and initial guesses in the <strong>Variable Info</strong> panel.
                </Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <Text fw={600} size="sm" c="cyan.3">3. Solve & Sweeps (F2)</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Run iterations to convergence. Build a <strong>Parametric Table</strong> to sweep variables and output results in live plots.
                </Text>
              </Card>
            </SimpleGrid>
          </Stack>
        );
      case 'shortcuts':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Keyboard Shortcuts (Hotkeys)</Title>
            <Text>Use these keyboard shortcuts within the editor to accelerate your solving workflow:</Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '180px' }}>Hotkey</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>F2</Code> or <Code>Ctrl + Enter</Code></Table.Td>
                  <Table.Td>Solve System (Run Newton-Raphson solver)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>F4</Code> or <Code>Ctrl + K</Code></Table.Td>
                  <Table.Td>Check Syntax (Verifies degrees of freedom and equation balance)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Ctrl + I</Code></Table.Td>
                  <Table.Td>Open <strong>Variable Information</strong> panel</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Ctrl + T</Code></Table.Td>
                  <Table.Td>Open <strong>Parametric Table</strong> panel</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>F9</Code></Table.Td>
                  <Table.Td>Solve selected block only (ignoring other lines)</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        );
      case 'reports':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Markdown Reports & Inline Equations</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees supports mixing normal rich text with solver equations to build real-time engineering reports. The text editor acts as a markdown editor:
            </Text>
            <List spacing="xs">
              <List.Item>Lines beginning with <code>//</code> or comments inside double quotes/braces are treated as narrative text.</List.Item>
              <List.Item>All normal markdown headers (<code># Header</code>), bold, and italics are supported.</List.Item>
              <List.Item>You can embed resolved variables directly in your report using inline syntax: <code>[varName]</code> or <code>[varName [units]]</code>. When solved, these are replaced by the computed numerical values accompanied by units.</List.Item>
            </List>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`// # Thermodynamic Heat Engine Analysis
// The boiler operating pressure is P[1] = 8000 [kPa].
// The computed thermal efficiency is [eta_th] %.`}</Code>
            </Paper>
          </Stack>
        );
      case 'digitizer-fit':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Graph Digitizer & Curve Fitting Guide</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees includes an integrated <strong>Graph Digitizer</strong> and a <strong>Curve Fit Engine</strong> to allow working with digitized graph curves or internal tables directly in equations.
            </Text>
            <Title order={3}>Step-by-Step Digitization & Modeling Workflow</Title>
            <List type="ordered" spacing="xs">
              <List.Item>
                <strong>Open the Graph Digitizer:</strong> Click the Graph Digitizer icon in the left toolbar. Upload your image (graph or chart).
              </List.Item>
              <List.Item>
                <strong>Calibrate the Coordinate Axes:</strong> Define the X and Y axes by placing calibration marks on known grid lines (two on X-axis, two on Y-axis) and inputting their numerical values.
              </List.Item>
              <List.Item>
                <strong>Digitize Points:</strong> Click points along the curve. The tool registers their coordinates automatically.
              </List.Item>
              <List.Item>
                <strong>Save to Table:</strong> Export or save your digitized points to a table named e.g., <code>digitized_curve</code>.
              </List.Item>
              <List.Item>
                <strong>Fit the Curve:</strong> Open the <strong>Curve Fit</strong> panel from the left toolbar. Select <code>digitized_curve</code>, specify the X and Y columns, choose a template (such as <code>Linear</code>, <code>Polynomial</code>, <code>Exponential</code>, or <code>Power</code>), and click <strong>Fit</strong>.
              </List.Item>
              <List.Item>
                <strong>Use Equation in Editor:</strong> Copy the generated regression equation and paste it directly into your code. The compiler resolves the equation in the Newton solver loop.
              </List.Item>
            </List>

            <Alert color="indigo" title="Unit Support in Curve Fit Equations">
              You can append unit annotations directly to fitted equations in the editor to ensure unit consistency. E.g., <code>y [m] = 0.054 * x^2 + 1.2 * x + 0.35 [m]</code>.
            </Alert>

            <Text fw={600} size="sm">Example of Curve-Fitted Equation Usage:</Text>
            <Paper withBorder p="xs" bg="dark.9" radius="sm" style={{ position: 'relative' }}>
              <CopyButton code={`{ Using a fitted curve in solver equations }
flow_rate = 1.25 [m^3/s]
head_loss [m] = -0.084 * flow_rate^2 + 1.54 * flow_rate + 0.12 [m]`} />
              <Code block style={{ background: 'transparent' }}>
                {`{ Using a fitted curve in solver equations }
flow_rate = 1.25 [m^3/s]
head_loss [m] = -0.084 * flow_rate^2 + 1.54 * flow_rate + 0.12 [m]`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'syntax':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Equation Syntax & Rules</Title>
            <Text>The frees compiler parses your code using the following rules:</Text>
            <List spacing="xs" mb="sm">
              <List.Item><strong>Equality:</strong> Use a single equal sign <Code>=</Code> for equations (e.g. <code>P * V = n * R * T</code>).</List.Item>
              <List.Item><strong>Case Insensitivity:</strong> Variable names are case-insensitive. <code>Temp</code>, <code>TEMP</code>, and <code>temp</code> are the same variable.</List.Item>
              <List.Item><strong>Comments:</strong> Use curly braces <code>{`{ comment }`}</code> or double quotes <code>"comment"</code> for inline comments. Standard double-slash <code>//</code> comments at the start of a line format the line as markdown text.</List.Item>
              <List.Item><strong>Multiplication:</strong> Implicit multiplication is not allowed. Write <code>2 * x</code> instead of <code>2x</code>.</List.Item>
              <List.Item><strong>Operators:</strong> Standard arithmetic operators <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, and <code>^</code> (exponentiation) are fully supported.</List.Item>
            </List>
          </Stack>
        );
      case 'math-funcs':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Built-in Mathematical Functions</Title>
            <Text>frees supports a comprehensive set of scalar math functions. Standard and hyperbolic functions are fully differentiable:</Text>

            <Title order={3}>Hyperbolic Functions</Title>
            <FunctionRef
              name="sinh / cosh / tanh"
              desc="Evaluates hyperbolic sine, cosine, or tangent of an expression."
              syntax={`y = sinh(x)
y = cosh(x)
y = tanh(x)`}
              inputs={[{ name: "x", desc: "Angle in radians or dimensionless value" }]}
              outputs={[{ name: "y", desc: "Resulting value" }]}
              example={`x = 1.25
y = sinh(x) + cosh(x)   { Equals exp(1.25) }`}
            />
            <FunctionRef
              name="arcsinh / arccosh / arctanh"
              desc="Evaluates inverse hyperbolic sine, cosine, or tangent of an expression."
              syntax={`y = arcsinh(x)
y = arccosh(x)
y = arctanh(x)`}
              inputs={[{ name: "x", desc: "Input scalar value (restrictions apply to domain of arccosh and arctanh)" }]}
              outputs={[{ name: "y", desc: "Inverse hyperbolic value in radians" }]}
              example={`x = 1.5
y = arccosh(x)`}
            />

            <Title order={3}>Rounding & Integer Functions</Title>
            <FunctionRef
              name="round"
              desc="Rounds a value to a specified number of decimal places."
              syntax={`y = round(x, decimals)`}
              inputs={[
                { name: "x", desc: "Value to round" },
                { name: "decimals", desc: "Integer number of decimal places to round to" }
              ]}
              outputs={[{ name: "y", desc: "Rounded value" }]}
              example={`val = round(3.14159, 3)   { val = 3.142 }`}
            />
            <FunctionRef
              name="floor / ceil / trunc / sign / step"
              desc="Non-smooth arithmetic functions for discretization and stepping."
              syntax={`y = floor(x)
y = ceil(x)
y = trunc(x)
y = sign(x)
y = step(x)`}
              inputs={[{ name: "x", desc: "Scalar input expression" }]}
              outputs={[{ name: "y", desc: "floor/ceil (rounded integer), trunc (discard decimals), sign (-1/0/1 depending on sign), step (1 if x >= 0, else 0)" }]}
              example={`val1 = floor(2.7)   { 2 }
val2 = ceil(2.1)    { 3 }
val3 = step(0.5)    { 1 }
val4 = sign(-15)    { -1 }`}
            />

            <Title order={3}>Conditional Selection & Series</Title>
            <FunctionRef
              name="If"
              desc="Conditional expression evaluator. Selects a value depending on comparison."
              syntax={`val = If(a, b, val_lt, val_eq, val_gt)`}
              inputs={[
                { name: "a", desc: "First expression to compare" },
                { name: "b", desc: "Second expression to compare" },
                { name: "val_lt", desc: "Returned value if a < b" },
                { name: "val_eq", desc: "Returned value if a = b" },
                { name: "val_gt", desc: "Returned value if a > b" }
              ]}
              outputs={[{ name: "val", desc: "The selected conditional value" }]}
              example={`temp = 350 [K]
k = If(temp, 300, 1.2, 1.5, 1.8)`}
            />
            <FunctionRef
              name="Product"
              desc="Evaluates product of a term series over an index range."
              syntax={`y = Product(i, lower, upper, term)`}
              inputs={[
                { name: "i", desc: "Loop index variable name (e.g. i)" },
                { name: "lower", desc: "Lower bound of loop (integer)" },
                { name: "upper", desc: "Upper bound of loop (integer)" },
                { name: "term", desc: "Expression containing the loop index i" }
              ]}
              outputs={[{ name: "y", desc: "Computed product" }]}
              example={`val = Product(i, 1, 4, i^2)   { val = 1 * 4 * 9 * 16 = 576 }`}
            />

            <Title order={3}>Trigonometric & Inverse Trig</Title>
            <Text size="sm" c="dimmed">
              <code>sin</code>, <code>cos</code>, <code>tan</code> and inverses <code>arcsin</code>, <code>arccos</code>, <code>arctan</code> work in radians. <code>angledeg</code>/<code>angle</code> and the unit annotations help with degrees.
            </Text>
            <FunctionRef
              name="atan2"
              desc="Two-argument arctangent that returns the angle of the point (x, y) in the correct quadrant."
              syntax={`theta = atan2(y, x)`}
              inputs={[
                { name: "y", desc: "Ordinate (numerator)" },
                { name: "x", desc: "Abscissa (denominator)" }
              ]}
              outputs={[{ name: "theta", desc: "Angle in radians in (-pi, pi]" }]}
              example={`theta = atan2(1, -1)   { = 2.356 rad (135 deg) }`}
            />

            <Title order={3}>Number Theory</Title>
            <FunctionRef
              name="gcd / lcm"
              desc="Greatest common divisor and least common multiple of two integers (operands are truncated to whole numbers)."
              syntax={`g = gcd(a, b)
l = lcm(a, b)`}
              inputs={[
                { name: "a", desc: "First integer" },
                { name: "b", desc: "Second integer" }
              ]}
              outputs={[{ name: "g / l", desc: "Greatest common divisor / least common multiple" }]}
              example={`g = gcd(48, 36)   { 12 }
l = lcm(4, 6)     { 12 }`}
            />

            <Title order={3}>Bitwise Operations</Title>
            <Text size="sm" c="dimmed">
              Operands are truncated to 64-bit integers before the operation; the result is returned as a number.
            </Text>
            <FunctionRef
              name="BitAnd / BitOr / BitXor / BitNot"
              desc="Bitwise AND, OR, XOR (two operands) and NOT (one operand)."
              syntax={`y = BitAnd(a, b)
y = BitOr(a, b)
y = BitXor(a, b)
y = BitNot(a)`}
              inputs={[
                { name: "a", desc: "First integer operand" },
                { name: "b", desc: "Second integer operand (not used by BitNot)" }
              ]}
              outputs={[{ name: "y", desc: "Result of the bitwise operation" }]}
              example={`y1 = BitAnd(12, 10)   { 8 }
y2 = BitOr(12, 10)    { 14 }
y3 = BitXor(12, 10)   { 6 }`}
            />
            <FunctionRef
              name="BitShiftL / BitShiftR"
              desc="Left and (arithmetic) right bit-shift of an integer by n bit positions."
              syntax={`y = BitShiftL(a, n)
y = BitShiftR(a, n)`}
              inputs={[
                { name: "a", desc: "Integer value to shift" },
                { name: "n", desc: "Number of bit positions to shift" }
              ]}
              outputs={[{ name: "y", desc: "Shifted value (a << n or a >> n)" }]}
              example={`y1 = BitShiftL(3, 4)    { 48 }
y2 = BitShiftR(48, 2)   { 12 }`}
            />

            <Title order={3}>Base Conversion</Title>
            <FunctionRef
              name="BaseConvert"
              desc="Converts a number written as a string in one base into its value in another base."
              syntax={`y = BaseConvert(value$, fromBase, toBase)`}
              inputs={[
                { name: "value$", desc: "The number as a quoted string (e.g. 'FF')" },
                { name: "fromBase", desc: "Base the string is written in (2–36)" },
                { name: "toBase", desc: "Base to convert to (2–36)" }
              ]}
              outputs={[{ name: "y", desc: "The converted value" }]}
              example={`y = BaseConvert('FF', 16, 10)   { 255 }`}
            />
          </Stack>
        );
      case 'special-funcs':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Special & Statistical Functions</Title>
            <Text>frees supports high-order Bessel functions and cumulative statistical distributions:</Text>

            <Title order={3}>Bessel Functions</Title>
            <FunctionRef
              name="BesselK / BesselY"
              desc="Modified Bessel function of the second kind (K_n(x)), and Bessel function of the second kind (Y_n(x))."
              syntax={`y = BesselK(n, x)
y = BesselY(n, x)`}
              inputs={[
                { name: "n", desc: "Order of the Bessel function (integer)" },
                { name: "x", desc: "Evaluated variable coordinate (must be positive)" }
              ]}
              outputs={[{ name: "y", desc: "Bessel function value" }]}
              example={`val = BesselK(1, 2.5)`}
            />
            <FunctionRef
              name="Bessel Shortcuts (i0, j0, k0, y0, i1, j1, k1, y1)"
              desc="Direct shortcut functions for Bessel functions of order 0 and 1."
              syntax={`y = Bessel_j0(x)
y = Bessel_k1(x)`}
              inputs={[{ name: "x", desc: "Variable coordinate" }]}
              outputs={[{ name: "y", desc: "Bessel function value" }]}
              example={`y1 = Bessel_j0(1.5)
y2 = Bessel_k0(2.0)`}
            />

            <Title order={3}>Gamma Functions</Title>
            <FunctionRef
              name="Gamma / LogGamma / Digamma"
              desc="The gamma function Γ(x), its natural logarithm ln Γ(x), and the digamma function ψ(x) = d/dx ln Γ(x)."
              syntax={`y = Gamma(x)
y = LogGamma(x)
y = Digamma(x)`}
              inputs={[{ name: "x", desc: "Real argument" }]}
              outputs={[{ name: "y", desc: "Function value" }]}
              example={`g = Gamma(5)       { = 24 = 4! }
lg = LogGamma(10)`}
            />
            <FunctionRef
              name="Beta"
              desc="The beta function B(a, b) = Γ(a)·Γ(b) / Γ(a+b)."
              syntax={`y = Beta(a, b)`}
              inputs={[
                { name: "a", desc: "First shape parameter (> 0)" },
                { name: "b", desc: "Second shape parameter (> 0)" }
              ]}
              outputs={[{ name: "y", desc: "Beta function value" }]}
              example={`y = Beta(2, 3)   { = 1/12 }`}
            />

            <Title order={3}>Error Functions</Title>
            <FunctionRef
              name="Erf / Erfc / ErfInv"
              desc="The error function erf(x), the complementary error function erfc(x) = 1 − erf(x), and the inverse error function."
              syntax={`y = Erf(x)
y = Erfc(x)
x = ErfInv(y)`}
              inputs={[{ name: "x / y", desc: "Argument (ErfInv expects a value in (-1, 1))" }]}
              outputs={[{ name: "y / x", desc: "Function value" }]}
              example={`a = Erf(1)        { 0.8427 }
b = Erfc(1)       { 0.1573 }
c = ErfInv(0.8427) { ≈ 1 }`}
            />

            <Title order={3}>Statistical & Probability Distributions</Title>
            <FunctionRef
              name="Chi_Square"
              desc="Cumulative Chi-Square distribution function."
              syntax={`y = Chi_Square(x, dof)`}
              inputs={[
                { name: "x", desc: "Chi-square statistic" },
                { name: "dof", desc: "Degrees of freedom" }
              ]}
              outputs={[{ name: "y", desc: "Cumulative probability" }]}
              example={`prob = Chi_Square(5.99, 2)`}
            />
            <FunctionRef
              name="Probability"
              desc="Normal cumulative distribution function."
              syntax={`y = Probability(x, mean, stddev)`}
              inputs={[
                { name: "x", desc: "Evaluated point" },
                { name: "mean", desc: "Mean of the normal distribution" },
                { name: "stddev", desc: "Standard deviation of the distribution" }
              ]}
              outputs={[{ name: "y", desc: "Cumulative probability" }]}
              example={`prob = Probability(85, 80, 5)   { prob = 0.8413 }`}
            />
            <FunctionRef
              name="Random"
              desc="Uniformly distributed pseudo-random number in the range [a, b]. An optional third argument fixes the seed for reproducible runs."
              syntax={`y = Random(a, b)
y = Random(a, b, seed)`}
              inputs={[
                { name: "a", desc: "Lower bound of the range" },
                { name: "b", desc: "Upper bound of the range" },
                { name: "seed", desc: "Optional integer seed for repeatable sequences" }
              ]}
              outputs={[{ name: "y", desc: "Random value uniformly distributed in [a, b]" }]}
              example={`val = Random(0, 1)
fixed = Random(10, 20, 42)`}
            />
            <FunctionRef
              name="RandG"
              desc="Gaussian (normally distributed) pseudo-random number with the given mean and standard deviation. An optional third argument fixes the seed."
              syntax={`y = RandG(mean, stddev)
y = RandG(mean, stddev, seed)`}
              inputs={[
                { name: "mean", desc: "Mean of the normal distribution" },
                { name: "stddev", desc: "Standard deviation of the distribution" },
                { name: "seed", desc: "Optional integer seed for repeatable sequences" }
              ]}
              outputs={[{ name: "y", desc: "Normally distributed random value" }]}
              example={`noise = RandG(0, 0.5)`}
            />
          </Stack>
        );
      case 'variables':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Variables, Guesses & Bounds</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Because frees resolves equations using iterative numerical methods (such as the Newton-Raphson algorithm with step-halving), configuring initial guess values and bounds is key to achieving stable convergence in complex systems.
            </Text>
            <Title order={3}>Variable Information Grid</Title>
            <Text>
              Access the <strong>Variable Info</strong> window (F4 then Ctrl+I) to set:
            </Text>
            <List spacing="xs">
              <List.Item><strong>Initial Guess:</strong> The starting value for solver iteration. Supply physical estimations (e.g. 300 K for room temp, 101325 Pa for atmospheric pressure) rather than leaving the default 1.0.</List.Item>
              <List.Item><strong>Bounds:</strong> Clamps the solver steps. Always set lower bounds to 0 for variables that must remain positive (such as mass flows, absolute pressures, and Kelvin temperatures) to prevent unphysical solver states.</List.Item>
              <List.Item><strong>Units:</strong> Annotate display units for formatted reports.</List.Item>
            </List>
          </Stack>
        );
      case 'uncertainty':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Uncertainty Propagation Engine</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees incorporates a first-order uncertainty-propagation engine. When uncertainties are supplied for independent variables, the solver automatically computes the propagated uncertainties of all dependent variables using numerical Jacobians and SVD linear algebra.
            </Text>
            <Title order={3}>Specifying Uncertainties</Title>
            <Text>You can specify uncertainties in two ways:</Text>
            <List spacing="xs">
              <List.Item>
                <strong>Variable Information Window:</strong> Input absolute or relative percentages (e.g. <code>±0.05</code> or <code>±2%</code>) in the Uncertainty column of the variable grid.
              </List.Item>
              <List.Item>
                <strong>Code Declaration:</strong> Declare uncertainties directly using the <code>UncertaintyOf()</code> accessor function:
              </List.Item>
            </List>
            <Paper withBorder p="md" bg="dark.8" mb="md">
              <Code block>{`P = 100000 [Pa]
T = 300 [K]

{ Explicit uncertainties in code }
UncertaintyOf(P) = 500 [Pa]
UncertaintyOf(T) = 2.0 [K]`}</Code>
            </Paper>

            <Title order={3}>Uncertainty Propagation Function</Title>
            <FunctionRef
              name="UncertaintyOf"
              desc="Queries the computed uncertainty value of a solved variable."
              syntax={`u = UncertaintyOf(x)`}
              inputs={[{ name: "x", desc: "Target solved variable" }]}
              outputs={[{ name: "u", desc: "Computed absolute uncertainty value of the variable" }]}
              example={`unc_P = UncertaintyOf(P)`}
            />
          </Stack>
        );
      case 'units':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Units & Dimensional Consistency</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees automatically checks equations for dimensional consistency. All calculations run strictly in SI base units. Annotated values are converted at compile-time:
            </Text>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`P = 140 [kPa]    { Converted to 140000 Pa }
m = 120 [lb]     { Converted to 54.43 kg }`}</Code>
            </Paper>
            <Title order={3} mt="sm">The Convert() Function</Title>
            <Text>Multiply variables by <code>Convert(From, To)</code> to apply factor conversion:</Text>
            <Code block>{`area_in2 = area_ft2 * Convert(ft^2, in^2)`}</Code>

            <Title order={3} mt="sm">Temperature Conversion</Title>
            <Text>
              Because temperature scales differ by an offset (not just a factor), use <code>ConvertTemp(From, To, value)</code> instead of <code>Convert</code>. Scales are <code>C</code>, <code>K</code>, <code>F</code>, and <code>R</code> (Rankine).
            </Text>
            <FunctionRef
              name="ConvertTemp"
              desc="Converts a temperature value between scales, accounting for both scale factor and offset."
              syntax={`T_out = ConvertTemp(From, To, value)`}
              inputs={[
                { name: "From", desc: "Source scale: C, K, F, or R" },
                { name: "To", desc: "Target scale: C, K, F, or R" },
                { name: "value", desc: "Temperature value in the source scale" }
              ]}
              outputs={[{ name: "T_out", desc: "Temperature in the target scale" }]}
              example={`T_f = ConvertTemp(C, F, 100)   { 212 }
T_k = ConvertTemp(F, K, 32)    { 273.15 }`}
            />
          </Stack>
        );
      case 'plot-code':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Plots in Code (PLOT)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Besides building plots in the Plots / Thermodynamics windows, you can declare a graph directly in the equation text with a <code>PLOT 'name' … END</code> block. Each line is a <code>key = value</code> attribute. The plot is created automatically on every Check / Solve, appears in the matching plot window, and is resolved by a <code>[Graph="name"]</code> tag in the formatted report. Code-defined plots are regenerated from the text each solve and are <em>not</em> saved with the project (edit them in code, not the GUI).
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              Mind the quotes: inside the <code>PLOT</code> block, strings use <strong>single quotes</strong> (<code>'T-s'</code>) — the equation grammar treats double quotes as comments. The <code>[Graph="name"]</code> report tag, however, uses <strong>double quotes</strong> so the line stays prose rather than being parsed as an equation. The leading string is the plot name; <code>kind</code> is <code>xy</code> (default), <code>property</code>, or <code>psychro</code>.
            </Text>

            <Title order={3}>X-Y plot of solved arrays</Title>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`N = 5
FOR i = 1 TO N
  speed[i] = 10*i
  distance[i] = 0.5*speed[i]^2
END

PLOT 'Speed vs Distance'
  kind = xy
  x = speed[1..N]
  y = distance[1..N]
  type = line
  xlabel = 'Speed [m/s]'
  ylabel = 'Distance [m]'
END

[Graph="Speed vs Distance"] Stopping distance versus speed [/Graph]`}</Code>
            </Paper>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
              XY attributes: <code>x</code>, <code>y</code> (comma-separated for multiple series), <code>y2</code> (secondary axis), <code>type</code> (<code>line</code>, <code>bar</code>, <code>scatter</code>, <code>pie</code>, <code>histogram</code>), <code>z</code>, <code>size</code>. Data comes from the parametric table when present, otherwise from solved array variables.
            </Text>

            <Title order={3}>Property diagram with state overlay</Title>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`PLOT 'Rankine T-s'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

[Graph="Rankine T-s"] Rankine cycle on a T-s diagram [/Graph]`}</Code>
            </Paper>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
              Property attributes: <code>fluid</code>, <code>diagram</code> (<code>'T-s'</code>, <code>'P-h'</code>, <code>'P-v'</code>, <code>'T-v'</code>, <code>'h-s'</code>, <code>'P-T'</code>), and the booleans <code>quality</code>, <code>isolines</code>, <code>overlaystates</code>, <code>connectstates</code>, <code>closecycle</code>. Psychrometric charts use <code>kind = psychro</code> with <code>pressure</code>, <code>tmin</code>, <code>tmax</code>, <code>wetbulb</code>, <code>enthalpy</code>, <code>volume</code>. All kinds accept the shared <code>title</code>, <code>xlabel</code>, <code>ylabel</code>, <code>xlog</code>/<code>ylog</code>, <code>grid</code>, <code>legend</code>, <code>xmin</code>/<code>xmax</code>/<code>ymin</code>/<code>ymax</code> format options.
            </Text>
          </Stack>
        );
      case 'arrays':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Arrays & For Loops</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Arrays are represented using indices inside square brackets (e.g. <code>T[1]</code>, <code>P[5]</code>). You can generate repetitive equations using the <code>FOR</code> loop block:
            </Text>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`FOR i = 1 TO 3
  h[i] = Enthalpy(Water, T=T[i], P=P[i])
END`}</Code>
            </Paper>
            
            <Title order={3}>Array Helper Functions</Title>
            <FunctionRef
              name="ArrayElmt"
              desc="Retrieves the value of an array element at a dynamic index."
              syntax={`val = ArrayElmt(array[1..N], index)`}
              inputs={[
                { name: "array[1..N]", desc: "Reference to the array name" },
                { name: "index", desc: "Dynamic index expression to extract" }
              ]}
              outputs={[{ name: "val", desc: "Value at the selected index" }]}
              example={`idx = 3
val = ArrayElmt(T[1..10], idx)   { Equals T[3] }`}
            />
          </Stack>
        );
      case 'complex':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Complex Numbers & Helpers</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees supports complex arithmetic. Complex variables are declared by matching components ending in <code>_r</code> (real) and <code>_i</code> (imaginary), or using imaginary literals ending in <code>i</code> or <code>j</code>:
            </Text>
            <Paper withBorder p="md" bg="dark.8" mb="md">
              <Code block>{`z1 = 3 + 4i
z2 = 5 - 2j
z3 = z1 * z2`}</Code>
            </Paper>

            <Title order={3}>Complex Numbers Helper Functions</Title>
            <FunctionRef
              name="Conj"
              desc="Computes the complex conjugate of a complex number."
              syntax={`z_conj = Conj(z)`}
              inputs={[{ name: "z", desc: "Complex number variable or expression" }]}
              outputs={[{ name: "z_conj", desc: "Conjugate complex number" }]}
              example={`z = 3 + 4i
z_c = Conj(z)   { z_c = 3 - 4i }`}
            />
            <FunctionRef
              name="Magnitude"
              desc="Computes the absolute value/magnitude of a complex number or phasor."
              syntax={`mag = Magnitude(z)`}
              inputs={[{ name: "z", desc: "Complex expression" }]}
              outputs={[{ name: "mag", desc: "Scalar magnitude value" }]}
              example={`z = 3 + 4i
r = Magnitude(z)   { r = 5.0 }`}
            />
            <FunctionRef
              name="Angle / AngleRad / AngleDeg"
              desc="Computes phasor angle of a complex number in radians or degrees."
              syntax={`theta = Angle(z)
theta_rad = AngleRad(z)
theta_deg = AngleDeg(z)`}
              inputs={[{ name: "z", desc: "Complex expression" }]}
              outputs={[{ name: "theta", desc: "Phasor angle" }]}
              example={`z = 1 + 1i
phi = AngleDeg(z)   { phi = 45.0 }`}
            />
            <FunctionRef
              name="Cis"
              desc="Helper to declare polar phasor using Euler's formula: cos(theta) + i*sin(theta)."
              syntax={`z = mag * Cis(theta)`}
              inputs={[{ name: "theta", desc: "Angle in radians" }]}
              outputs={[{ name: "z", desc: "Unit complex phasor" }]}
              example={`z = 5 * Cis(pi/4)`}
            />
          </Stack>
        );
      case 'strings':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">String Variables & Functions</Title>
            <Text style={{ lineHeight: 1.6 }}>
              String variables are declared with a trailing dollar sign (e.g. <code>fluidName$</code>, <code>msg$</code>). String constants can be enclosed in single quotes.
            </Text>

            <Title order={3}>String Manipulation Functions</Title>
            <FunctionRef
              name="Concat$"
              desc="Concatenates two strings together."
              syntax={`out$ = Concat$(str1$, str2$)`}
              inputs={[
                { name: "str1$", desc: "First string" },
                { name: "str2$", desc: "Second string" }
              ]}
              outputs={[{ name: "out$", desc: "Combined string" }]}
              example={`msg$ = Concat$('Fluid is ', 'Water')`}
            />
            <FunctionRef
              name="Copy$"
              desc="Extracts a substring from a string."
              syntax={`out$ = Copy$(str$, start, len)`}
              inputs={[
                { name: "str$", desc: "Source string" },
                { name: "start", desc: "1-based starting character index" },
                { name: "len", desc: "Length of substring to copy" }
              ]}
              outputs={[{ name: "out$", desc: "Copied substring" }]}
              example={`s$ = Copy$('R134a', 2, 3)   { s$ = '134' }`}
            />
            <FunctionRef
              name="Lowercase$ / Uppercase$ / Trim$"
              desc="Modifies string case and trims whitespaces."
              syntax={`out$ = Lowercase$(str$)
out$ = Uppercase$(str$)
out$ = Trim$(str$)`}
              inputs={[{ name: "str$", desc: "Input string" }]}
              outputs={[{ name: "out$", desc: "Transformed string" }]}
              example={`s$ = Lowercase$('Water')   { s$ = 'water' }`}
            />
            <FunctionRef
              name="StringLen / StringPos / StringVal / String$"
              desc="Length, find substring index, convert string to value, and convert value to string."
              syntax={`len = StringLen(str$)
pos = StringPos(str$, sub$)
val = StringVal(str$)
out$ = String$(val)`}
              inputs={[
                { name: "str$", desc: "Target string or variable" },
                { name: "sub$", desc: "Substring to search for in StringPos" }
              ]}
              outputs={[{ name: "len/pos/val/out$", desc: "Resulting metric or value" }]}
              example={`len = StringLen('Ammonia')       { 7 }
pos = StringPos('R134a', '134')     { 2 }
v = StringVal('101.3')             { 101.3 }
s$ = String$(15.5)                 { '15.5' }`}
            />

            <Title order={3}>Environment & Environment Info Functions</Title>
            <FunctionRef
              name="Date$ / Time$ / TimeStamp$"
              desc="Retrieves the current system date, time, or timestamp."
              syntax={`d$ = Date$()
t$ = Time$()
ts$ = TimeStamp$()`}
              inputs={[]}
              outputs={[{ name: "d$/t$/ts$", desc: "Date, Time or Timestamp string" }]}
              example={`current_date$ = Date$()`}
            />
            <FunctionRef
              name="UnitSystem$ / UnitsOf$"
              desc="Queries active solver unit system settings or the units of a specific variable."
              syntax={`us$ = UnitSystem$()
u$ = UnitsOf$(var)`}
              inputs={[{ name: "var", desc: "Variable name to query units of" }]}
              outputs={[{ name: "us$/u$", desc: "Unit system settings description or variable unit string" }]}
              example={`p_unit$ = UnitsOf$(P)`}
            />
          </Stack>
        );
      case 'matrices-decl':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Declaring Matrices & Vectors</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Matrix and vector objects are fully supported. Since the solver flattens matrix equations to element-wise scalar equations, they run fast and support full automatic differentiation.
            </Text>
            <Title order={3}>MATLAB-Style Matrix Literals</Title>
            <Text>Use brackets to declare row vectors, column vectors, and 2D matrices:</Text>
            <List spacing="xs" mb="sm">
              <List.Item><strong>Row Vector:</strong> Comma or space separated elements: <code>v = [1, 2, 3]</code> or <code>v = [1 2 3]</code> (1x3 matrix)</List.Item>
              <List.Item><strong>Column Vector:</strong> Semicolon separated elements: <code>v = [1; 2; 3]</code> (3x1 matrix)</List.Item>
              <List.Item><strong>2D Matrix:</strong> Rows separated by semicolons, elements separated by spaces/commas: <code>A = [1 2; 3 4]</code> (2x2 matrix)</List.Item>
            </List>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`A[1..2, 1..2] = [1 2; 3 4]
b[1..2] = [5; 6]
x[1..2] = A[1..2, 1..2] \\\\ b[1..2]`}</Code>
            </Paper>
          </Stack>
        );
      case 'matrices-ops':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Matrix Operators</Title>
            <Text>frees compiles standard algebraic operators for matrices:</Text>
            <Table striped highlightOnHover withTableBorder mb="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Operator</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Example</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>+</Code>, <Code>-</Code></Table.Td>
                  <Table.Td>Element-wise addition/subtraction or scalar shift</Table.Td>
                  <Table.Td><Code>C = A + B</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>*</Code></Table.Td>
                  <Table.Td>Standard matrix multiplication or scalar product</Table.Td>
                  <Table.Td><Code>y[1..2] = A[1..2, 1..2] * x[1..2]</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>'</Code> (single quote)</Table.Td>
                  <Table.Td>Suffix transpose operator (transposes matrix/vector)</Table.Td>
                  <Table.Td><Code>B = A'</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>\\\\</Code> (backslash)</Table.Td>
                  <Table.Td>Backslash solver (solves $A \\\\cdot x = b$ for $x$)</Table.Td>
                  <Table.Td><Code>x = A \\\\ b</Code></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Alert color="blue" title="Transpose and Backslash Syntax Note">
              The suffix transpose is written as a single quote after a matrix: <code>A'</code>. Backslash is entered as double-backslash <code>\\\\</code> in the editor to resolve correctly.
            </Alert>
          </Stack>
        );
      case 'matrices-blas':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">OpenBLAS Algebra Functions Reference</Title>
            <Text style={{ lineHeight: 1.5 }}>
              frees supports native Basic Linear Algebra Subprograms (BLAS) Level 1, 2, and 3 routines. These are compiled symbolically, allowing constraints to propagate through linear algebra systems seamlessly.
            </Text>

            <Title order={3} mt="sm">Level 1 BLAS (Vector-Vector)</Title>
            <FunctionRef
              name="axpy"
              desc="Constant times vector/matrix plus vector/matrix: alpha * x + y"
              syntax={`result = axpy(alpha, x, y)`}
              inputs={[
                { name: "alpha", desc: "Scalar coefficient expression" },
                { name: "x", desc: "First vector or matrix of size M x N" },
                { name: "y", desc: "Second vector or matrix of size M x N" }
              ]}
              outputs={[{ name: "result", desc: "Resulting M x N matrix or vector" }]}
              example={`x[1..2] = [1, 2]
y[1..2] = [3, 4]
z[1..2] = axpy(2, x[1..2], y[1..2])   { z = [5; 8] }`}
            />

            <FunctionRef
              name="scal"
              desc="Scale a vector or matrix by a constant factor: alpha * x"
              syntax={`result = scal(alpha, x)`}
              inputs={[
                { name: "alpha", desc: "Scalar scale factor" },
                { name: "x", desc: "Matrix or vector to scale" }
              ]}
              outputs={[{ name: "result", desc: "Scaled matrix or vector" }]}
              example={`x[1..2] = [1, 2]
y[1..2] = scal(3, x[1..2])   { y = [3; 6] }`}
            />

            <FunctionRef
              name="asum"
              desc="L1 norm (sum of absolute values) of a vector: sum(|x_i|)"
              syntax={`result = asum(x)`}
              inputs={[{ name: "x", desc: "Vector of size N" }]}
              outputs={[{ name: "result", desc: "Scalar sum of absolute values" }]}
              example={`x[1..2] = [1, -2]
val = asum(x[1..2])   { val = 3 }`}
            />

            <FunctionRef
              name="nrm2"
              desc="L2 Euclidean norm (root-sum-square) of a vector: sqrt(sum(x_i^2))"
              syntax={`result = nrm2(x)`}
              inputs={[{ name: "x", desc: "Vector of size N" }]}
              outputs={[{ name: "result", desc: "Scalar L2 norm value" }]}
              example={`x[1..2] = [3, 4]
val = nrm2(x[1..2])   { val = 5 }`}
            />

            <FunctionRef
              name="copy"
              desc="Returns a symbolic copy of the vector or matrix"
              syntax={`result = copy(x)`}
              inputs={[{ name: "x", desc: "Matrix or vector" }]}
              outputs={[{ name: "result", desc: "Identical copy" }]}
              example={`x[1..2] = [1, 2]
y[1..2] = copy(x[1..2])`}
            />

            <Title order={3} mt="md">Level 2 BLAS (Matrix-Vector)</Title>
            <FunctionRef
              name="gemv"
              desc="General matrix-vector product: alpha * A * x + beta * y"
              syntax={`result = gemv(alpha, A, x, beta, y)`}
              inputs={[
                { name: "alpha", desc: "Scalar multiplier for product" },
                { name: "A", desc: "Matrix of size M x N" },
                { name: "x", desc: "Column vector of size N x 1" },
                { name: "beta", desc: "Scalar multiplier for y" },
                { name: "y", desc: "Column vector of size M x 1" }
              ]}
              outputs={[{ name: "result", desc: "Resulting column vector of size M x 1" }]}
              example={`A[1..2, 1..2] = 1
x[1..2] = [2, 3]
y[1..2] = [4, 5]
z[1..2] = gemv(2, A[1..2, 1..2], x[1..2], 3, y[1..2])`}
            />

            <FunctionRef
              name="ger"
              desc="Vector outer product (Rank-1 update): alpha * x * y' + A"
              syntax={`result = ger(alpha, x, y, A)`}
              inputs={[
                { name: "alpha", desc: "Scalar multiplier" },
                { name: "x", desc: "Column vector of size M x 1" },
                { name: "y", desc: "Column vector of size N x 1" },
                { name: "A", desc: "Matrix of size M x N" }
              ]}
              outputs={[{ name: "result", desc: "Resulting M x N matrix" }]}
              example={`x[1..2] = [2, 3]
y[1..2] = [4, 5]
A[1..2, 1..2] = 1
B[1..2, 1..2] = ger(2, x[1..2], y[1..2], A[1..2, 1..2])`}
            />

            <Title order={3} mt="md">Level 3 BLAS (Matrix-Matrix)</Title>
            <FunctionRef
              name="gemm"
              desc="General matrix-matrix product: alpha * A * B + beta * C"
              syntax={`result = gemm(alpha, A, B, beta, C)`}
              inputs={[
                { name: "alpha", desc: "Scalar multiplier" },
                { name: "A", desc: "Matrix of size M x K" },
                { name: "B", desc: "Matrix of size K x N" },
                { name: "beta", desc: "Scalar multiplier" },
                { name: "C", desc: "Matrix of size M x N" }
              ]}
              outputs={[{ name: "result", desc: "Resulting M x N matrix" }]}
              example={`A[1..2, 1..2] = 1
B[1..2, 1..2] = 2
C[1..2, 1..2] = 3
D[1..2, 1..2] = gemm(2, A[1..2, 1..2], B[1..2, 1..2], 3, C[1..2, 1..2])`}
            />
          </Stack>
        );
      case 'matrices-sys':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Linear Systems & Decompositions Reference</Title>
            <Text>Detailed documentation for solvers and factorizations:</Text>

            <FunctionRef
              name="SolveLinear"
              desc="Solves a square linear system: A * x = b"
              syntax={`x = SolveLinear(A, b)`}
              inputs={[
                { name: "A", desc: "Square coefficient matrix of size N x N" },
                { name: "b", desc: "Right-hand side vector of size N x 1" }
              ]}
              outputs={[{ name: "x", desc: "Solution vector of size N x 1" }]}
              example={`A[1,1]=2; A[1,2]=1
A[2,1]=-3; A[2,2]=-1
b[1..2] = [8, -11]
x[1..2] = SolveLinear(A[1..2, 1..2], b[1..2])`}
            />

            <FunctionRef
              name="Determinant"
              desc="Computes the determinant of a square matrix."
              syntax={`d = Determinant(A)`}
              inputs={[{ name: "A", desc: "Square matrix of size N x N" }]}
              outputs={[{ name: "d", desc: "Scalar determinant of A" }]}
              example={`A[1,1]=2; A[1,2]=1
A[2,1]=-3; A[2,2]=-1
d = Determinant(A[1..2, 1..2])   { = 1 }`}
            />

            <ProcedureRef
              name="LUDecompose"
              desc="Performs LU decomposition on a square matrix A: A = L * U"
              syntax={`CALL LUDecompose(A : L, U)`}
              inputs={[{ name: "A", desc: "Square matrix of size N x N to decompose" }]}
              outputs={[
                { name: "L", desc: "Lower triangular matrix of size N x N (unit diagonal)" },
                { name: "U", desc: "Upper triangular matrix of size N x N" }
              ]}
              example={`A[1..2, 1..2] = 1
CALL LUDecompose(A[1..2, 1..2] : L[1..2, 1..2], U[1..2, 1..2])`}
            />

            <ProcedureRef
              name="Eigen"
              desc="Computes eigenvalues and Unit eigenvectors of a symmetric matrix A"
              syntax={`CALL Eigen(A : lambda, V)`}
              inputs={[{ name: "A", desc: "Symmetric square matrix of size N x N" }]}
              outputs={[
                { name: "lambda", desc: "Vector of eigenvalues of size N x 1 (sorted ascending)" },
                { name: "V", desc: "Orthonormal eigenvector matrix of size N x N (columns are eigenvectors)" }
              ]}
              example={`A[1,1]=2; A[1,2]=1
A[2,1]=1; A[2,2]=2
CALL Eigen(A[1..2, 1..2] : lambda[1..2], V[1..2, 1..2])`}
            />

            <ProcedureRef
              name="EulerRotate"
              desc="Assembles a 3D ZXZ rotation matrix from Euler angles"
              syntax={`CALL EulerRotate(phi, theta, psi : R)`}
              inputs={[
                { name: "phi", desc: "Precession angle (radians)" },
                { name: "theta", desc: "Nutation angle (radians)" },
                { name: "psi", desc: "Spin angle (radians)" }
              ]}
              outputs={[{ name: "R", desc: "3x3 orthogonal rotation matrix" }]}
              example={`CALL EulerRotate(0.1, 0.2, 0.3 : R[1..3, 1..3])`}
            />
          </Stack>
        );
      case 'functions':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Custom Functions & Procedures</Title>
            <Text style={{ lineHeight: 1.6 }}>
              You can declare custom functions (single output value) and procedures (multiple output variables) using imperative logic (IF-THEN-ELSE, REPEAT-UNTIL, WHILE-DO, assignments):
            </Text>
            <Title order={3}>Custom Functions</Title>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`FUNCTION my_func(x, y)
  IF x > y THEN
    my_func := x * y
  ELSE
    my_func := x + y
  END
END`}</Code>
            </Paper>
            <Title order={3} mt="sm">Custom Procedures</Title>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`PROCEDURE my_proc(x, y : a, b)
  a := x * 10
  b := y * 100
END`}</Code>
            </Paper>

            <Title order={3} mt="sm">Loops inside Functions & Procedures</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Function and procedure bodies support <code>REPEAT … UNTIL cond</code> (runs at least once) and <code>WHILE cond DO … END</code> (checks the condition first). Both are guarded against runaway iteration.
            </Text>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`FUNCTION SumTo(n)
  i := 1
  s := 0
  WHILE i <= n DO
    s := s + i
    i := i + 1
  END
  SumTo := s
END

total = SumTo(10)   { 55 }`}</Code>
            </Paper>
          </Stack>
        );
      case 'tables-code':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Custom Tabulated Functions (TABLE)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              You can define lookup tables inside your code. frees parses these and registers them as tabulated functions that can be queried like standard functions:
            </Text>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`TABLE thermal_conductivity(temp)
  200   1.2
  300   1.6
  400   1.9
  500   2.1
END

k_val = thermal_conductivity(350)`}</Code>
            </Paper>
          </Stack>
        );
      case 'lookup-tables':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Lookup Tables & Interpolation</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Lookup Tables are registered in the Tables window or defined via table blocks. You can retrieve, interpolate, or differentiate tabular values directly inside equation definitions:
            </Text>

            <Title order={3}>Lookup Data Retrieving</Title>
            <FunctionRef
              name="Lookup"
              desc="Retrieves the value of a cell in a lookup table."
              syntax={`val = Lookup('TableName', row, col)`}
              inputs={[
                { name: "TableName", desc: "String literal naming the table" },
                { name: "row", desc: "1-based row index (integer)" },
                { name: "col", desc: "1-based column index or string column name" }
              ]}
              outputs={[{ name: "val", desc: "The numeric cell value" }]}
              example={`x = Lookup('thermo_data', 5, 'Temperature')`}
            />
            <FunctionRef
              name="LookupRow / Lookup$Row / NLookupRows"
              desc="Search for matching rows and query table size."
              syntax={`row_idx = LookupRow('TableName', col, val)
row_idx = Lookup$Row('TableName', col, val$)
num_rows = NLookupRows('TableName')`}
              inputs={[
                { name: "TableName", desc: "Name of target table" },
                { name: "col", desc: "Target column index or name" },
                { name: "val / val$", desc: "Value to search for" }
              ]}
              outputs={[{ name: "row_idx / num_rows", desc: "Row index or size count" }]}
              example={`idx = Lookup$Row('fluid_table', 'FluidName', 'Water')
count = NLookupRows('fluid_table')`}
            />

            <Title order={3}>Spline & Linear Interpolation</Title>
            <FunctionRef
              name="Interpolate"
              desc="Performs 1D linear interpolation to find a dependent variable value."
              syntax={`y = Interpolate('TableName', y_col, x_col, x_val)`}
              inputs={[
                { name: "TableName", desc: "Name of the table" },
                { name: "y_col", desc: "Name of the dependent output column" },
                { name: "x_col", desc: "Name of the independent input column" },
                { name: "x_val", desc: "Independent coordinate value to interpolate" }
              ]}
              outputs={[{ name: "y", desc: "Interpolated value" }]}
              example={`cond = Interpolate('copper_conductivity', 'k', 'temp', 325)`}
            />
            <FunctionRef
              name="Interpolate1 / Interpolate2 / Interpolate2D"
              desc="Advanced 1D cubic spline and 2D bilinear/bicubic interpolation."
              syntax={`y = Interpolate1('TableName', y_col, x_col, x_val)
z = Interpolate2D('TableName', z_col, x_col, x_val, y_col, y_val)`}
              inputs={[
                { name: "TableName", desc: "Table name" },
                { name: "x_val, y_val", desc: "Coordinates for interpolation" }
              ]}
              outputs={[{ name: "y / z", desc: "Interpolated value" }]}
              example={`cp_val = Interpolate1('gas_properties', 'Cp', 'Temperature', 450)`}
            />

            <Title order={3}>Tabular Numerical Differentiation</Title>
            <FunctionRef
              name="Differentiate / Differentiate1 / Differentiate2"
              desc="Estimates derivative dy/dx from tabulated values at a specified coordinate point."
              syntax={`slope = Differentiate('TableName', y_col, x_col, x_val)`}
              inputs={[
                { name: "TableName", desc: "Table name" },
                { name: "y_col, x_col", desc: "Output/Input columns" },
                { name: "x_val", desc: "Evaluation point" }
              ]}
              outputs={[{ name: "slope", desc: "Computed numerical derivative dy/dx" }]}
              example={`dslope = Differentiate('pressure_drop', 'dP', 'Velocity', 2.5)`}
            />
          </Stack>
        );
      case 'table-accessors':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Table Accessors & Aggregates</Title>
            <Text style={{ lineHeight: 1.6 }}>
              These functions query status, specific values, or aggregates of columns inside Parametric Sweeps, Parametric Tables, or Numerical Integration runs.
            </Text>

            <Title order={3}>Parametric Run Info</Title>
            <FunctionRef
              name="TableValue"
              desc="Reads a cell in the active Parametric Table."
              syntax={`val = TableValue(row, col)`}
              inputs={[
                { name: "row", desc: "Row index" },
                { name: "col", desc: "Column index or name string" }
              ]}
              outputs={[{ name: "val", desc: "Numeric value at the cell" }]}
              example={`initial_P = TableValue(1, 'Pressure')`}
            />
            <FunctionRef
              name="TableRun# / NParametricRuns"
              desc="Queries current sweep run index and total sweep size."
              syntax={`run_idx = TableRun#()
total_runs = NParametricRuns()`}
              inputs={[]}
              outputs={[{ name: "run_idx / total_runs", desc: "Run indices and count statistics" }]}
              example={`current_sweep = TableRun#()`}
            />

            <Title order={3}>Column Aggregate Functions</Title>
            <FunctionRef
              name="Sum / Avg / Min / Max / StdDev (Table columns)"
              desc="Calculates mathematical aggregate of all populated values in a Parametric Table column."
              syntax={`total = Sum('ColName')
average = Avg('ColName')
minimum = Min('ColName')`}
              inputs={[{ name: "ColName", desc: "String name of the column in the Parametric Table" }]}
              outputs={[{ name: "total/average/minimum", desc: "Computed scalar value" }]}
              example={`mean_eff = Avg('efficiency')
max_temp = Max('T_boiler')`}
            />

            <Title order={3}>Integral Table Accessors</Title>
            <FunctionRef
              name="IntegralValue"
              desc="Reads computed value from the ODE Integral Table at the end of the solve."
              syntax={`val = IntegralValue('VarName')`}
              inputs={[{ name: "VarName", desc: "String name of the integrated variable" }]}
              outputs={[{ name: "val", desc: "Integrated ODE step value" }]}
              example={`net_heat = IntegralValue('Q_dot')`}
            />
          </Stack>
        );
      case 'modules':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Modular Submodels (MODULE)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Modules allow you to encapsulate a sub-system of equations and call it repeatedly. Unlike procedures, modules contain declarative equations, which can be solved in any direction:
            </Text>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`MODULE pipe_flow(D, Q : dP)
  V = Q / (pi / 4 * D^2)
  dP = 0.02 * (100 / D) * (1000 * V^2 / 2)
END

CALL pipe_flow(D1, Q1 : dP1)`}</Code>
            </Paper>
          </Stack>
        );
      case 'thermo':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Thermophysical Properties Reference (CoolProp & Gas)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees supports thermophysical properties database queries for three distinct material classes:
            </Text>
            <List spacing="xs" mb="md">
              <List.Item><strong>CoolProp Real Fluids:</strong> High-precision multiphase real fluids (e.g. <code>Water</code>, <code>R134a</code>, <code>Ammonia</code>) requiring exactly 2 state variables.</List.Item>
              <List.Item><strong>Ideal Gases:</strong> Spelled chemical formulas (e.g. <code>CO2</code>, <code>N2</code>, <code>CH4</code>, <code>O2</code>) evaluated using NASA thermodynamic polynomials.</List.Item>
              <List.Item><strong>Aqueous Glycols:</strong> Incompressible coolants represented by base + mass fraction (e.g. <code>EG50</code> for 50% Ethylene Glycol, <code>PG30</code> for 30% Propylene Glycol), evaluated using Temperature (T) and Pressure (P).</List.Item>
            </List>

            <Title order={3}>Standard Property Functions</Title>
            <Table striped withTableBorder mb="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function Name</Table.Th>
                  <Table.Th>Property</Table.Th>
                  <Table.Th>SI Unit</Table.Th>
                  <Table.Th>Syntax Example</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>Temperature</Code></Table.Td>
                  <Table.Td>Absolute Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                  <Table.Td><Code>T = Temperature(Water, P=P1, h=h1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Pressure</Code></Table.Td>
                  <Table.Td>Absolute Pressure</Table.Td>
                  <Table.Td>Pa</Table.Td>
                  <Table.Td><Code>P = Pressure(R134a, T=T1, x=1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Enthalpy</Code></Table.Td>
                  <Table.Td>Specific Enthalpy</Table.Td>
                  <Table.Td>J/kg</Table.Td>
                  <Table.Td><Code>h = Enthalpy(Steam, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Entropy</Code></Table.Td>
                  <Table.Td>Specific Entropy</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                  <Table.Td><Code>s = Entropy(Nitrogen, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Density</Code></Table.Td>
                  <Table.Td>Mass Density</Table.Td>
                  <Table.Td>kg/m³</Table.Td>
                  <Table.Td><Code>rho = Density(EG50, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Volume</Code></Table.Td>
                  <Table.Td>Specific Volume</Table.Td>
                  <Table.Td>m³/kg</Table.Td>
                  <Table.Td><Code>v = Volume(Water, P=P1, x=0)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>IntEnergy</Code></Table.Td>
                  <Table.Td>Specific Internal Energy</Table.Td>
                  <Table.Td>J/kg</Table.Td>
                  <Table.Td><Code>u = IntEnergy(Water, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cp / Specheat</Code></Table.Td>
                  <Table.Td>Constant-pressure Specific Heat</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                  <Table.Td><Code>c = Cp(Air, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cv</Code></Table.Td>
                  <Table.Td>Constant-volume Specific Heat</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                  <Table.Td><Code>c_v = Cv(Air, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Viscosity</Code></Table.Td>
                  <Table.Td>Dynamic Viscosity</Table.Td>
                  <Table.Td>Pa-s</Table.Td>
                  <Table.Td><Code>mu = Viscosity(Water, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Conductivity</Code></Table.Td>
                  <Table.Td>Thermal Conductivity</Table.Td>
                  <Table.Td>W/m-K</Table.Td>
                  <Table.Td><Code>k = Conductivity(Water, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>SoundSpeed</Code></Table.Td>
                  <Table.Td>Speed of Sound</Table.Td>
                  <Table.Td>m/s</Table.Td>
                  <Table.Td><Code>c = SoundSpeed(Air, T=T1, P=P1)</Code></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Thermophysical Completion Functions</Title>
            <FunctionRef
              name="P_sat / T_sat"
              desc="Evaluates saturation pressure or temperature for a fluid."
              syntax={`ps = P_sat(Fluid, T=temp)
ts = T_sat(Fluid, P=pres)`}
              inputs={[
                { name: "Fluid", desc: "Fluid name" },
                { name: "T / P", desc: "Saturation state coordinate" }
              ]}
              outputs={[{ name: "ps / ts", desc: "Saturation pressure (Pa) / temperature (K)" }]}
              example={`P_sat_water = P_sat(Water, T=373.15)   { ~101325 Pa }`}
            />
            <FunctionRef
              name="MolarMass / CompressibilityFactor / Prandtl"
              desc="Molar mass (kg/kmol), Compressibility factor Z (dimensionless), and Prandtl number."
              syntax={`m = MolarMass(Fluid)
z = CompressibilityFactor(Fluid, T=temp, P=pres)
pr = Prandtl(Fluid, T=temp, P=pres)`}
              inputs={[{ name: "Fluid", desc: "Fluid name" }]}
              outputs={[{ name: "m / z / pr", desc: "Property metrics" }]}
              example={`M = MolarMass(CarbonDioxide)
Z = CompressibilityFactor(Nitrogen, T=300, P=5e6)`}
            />
            <FunctionRef
              name="SurfaceTension / Fugacity / Enthalpy_fusion / Dipole"
              desc="Queries surface tension (N/m), fugacity coefficient (dimensionless), enthalpy of fusion (J/kg), and dipole moment."
              syntax={`st = SurfaceTension(Fluid, T=temp)
fc = Fugacity(Fluid, T=temp, P=pres)
hf = Enthalpy_fusion(Fluid)
dp = Dipole(Fluid)`}
              inputs={[{ name: "Fluid", desc: "Fluid name" }]}
              outputs={[{ name: "st / fc / hf / dp", desc: "Special properties" }]}
              example={`sigma_st = SurfaceTension(Water, T=300)`}
            />
            <FunctionRef
              name="P_crit / T_crit / v_crit / T_triple"
              desc="Critical pressure, critical temperature, critical specific volume, and triple point temperature."
              syntax={`pc = P_crit(Fluid)
tc = T_crit(Fluid)
vc = v_crit(Fluid)
tt = T_triple(Fluid)`}
              inputs={[{ name: "Fluid", desc: "Fluid name" }]}
              outputs={[{ name: "pc / tc / vc / tt", desc: "State constant parameters" }]}
              example={`P_crit_co2 = P_crit(CO2)`}
            />
            <FunctionRef
              name="IsIdealGas / Phase$"
              desc="Checks if fluid behaves ideally, and queries string phase."
              syntax={`chk = IsIdealGas(Fluid)
ph$ = Phase$(Fluid, T=temp, P=pres)`}
              inputs={[
                { name: "Fluid", desc: "Fluid name" },
                { name: "T, P", desc: "Coordinate points for phase evaluation" }
              ]}
              outputs={[{ name: "chk / ph$", desc: "1 or 0 flag, or Phase description string (e.g. 'twophase', 'liquid', 'gas', 'supercritical')" }]}
              example={`is_ideal = IsIdealGas(Air)
state$ = Phase$(R134a, T=25 [C], P=100 [kPa])`}
            />
          </Stack>
        );
      case 'solid-materials':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Solid & Incompressible Material Properties Reference</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees supports querying properties of solid materials (e.g. <code>Copper</code>, <code>Iron</code>, <code>Aluminum</code>, <code>Concrete</code>, <code>Glass</code>) and incompressible liquids (e.g. <code>EngineOil</code>) using underscore-suffixed functions:
            </Text>

            <Title order={3}>Material Property Functions</Title>
            <FunctionRef
              name="c_ / k_ / rho_ / mu_ / Pv_"
              desc="Evaluates material specific heat (J/kg-K), thermal conductivity (W/m-K), density (kg/m³), dynamic viscosity (Pa-s), and vapor pressure (Pa)."
              syntax={`cp = c_(Material, T=temp)
cond = k_(Material, T=temp)
dens = rho_(Material)
visc = mu_(Material, T=temp)
vap_p = Pv_(Material, T=temp)`}
              inputs={[
                { name: "Material", desc: "Solid or incompressible material name" },
                { name: "T", desc: "Evaluation temperature coordinate" }
              ]}
              outputs={[{ name: "cp/cond/dens/visc/vap_p", desc: "Material properties" }]}
              example={`k_copper = k_(Copper, T=300 [K])
cp_iron = c_(Iron, T=400 [K])`}
            />
            <FunctionRef
              name="E_ / nu_ / epsilon_ / VolExpCoef / FreezingPt"
              desc="Young's modulus (Pa), Poisson's ratio (dimensionless), Surface emissivity, Volumetric thermal expansion (1/K), and Freezing point temperature (K)."
              syntax={`mod = E_(Material)
pr = nu_(Material)
em = epsilon_(Material)
b = VolExpCoef(Material)
tf = FreezingPt(Material)`}
              inputs={[{ name: "Material", desc: "Material name" }]}
              outputs={[{ name: "mod / pr / em / b / tf", desc: "Solid state variables" }]}
              example={`mod_steel = E_(Steel)
em_glass = epsilon_(Glass)`}
            />
            <FunctionRef
              name="DELTAL\L_293"
              desc="Linear thermal expansion coefficient relative to reference 293 K."
              syntax={`exp_ratio = DELTAL\\L_293(Material, T=temp)`}
              inputs={[
                { name: "Material", desc: "Material name" },
                { name: "T", desc: "Evaluated temperature" }
              ]}
              outputs={[{ name: "exp_ratio", desc: "Expansion ratio delta L / L_293" }]}
              example={`dl_ratio = DELTAL\\L_293(Aluminum, T=500 [K])`}
            />
            <FunctionRef
              name="ek_LJ / sigma_LJ"
              desc="Lennard-Jones potential energy parameter epsilon/k (K) and collision diameter sigma (m)."
              syntax={`eps_k = ek_LJ(Material)
sig = sigma_LJ(Material)`}
              inputs={[{ name: "Material", desc: "Gas/Solid name" }]}
              outputs={[{ name: "eps_k / sig", desc: "Lennard-Jones parameter values" }]}
              example={`ek_val = ek_LJ(Argon)`}
            />
          </Stack>
        );
      case 'humidair':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Psychrometrics (AirH2O / Humid Air)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Humid air calculations are performed using the fluid name <code>AirH2O</code>. These calls require exactly **three** state variables:
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`h = Enthalpy(AirH2O, T=25 [C], R=0.50, P=101325 [Pa])`}</Code>
            </Paper>
            <Title order={3} mt="sm">Indicators</Title>
            <List spacing="xs">
              <List.Item><code>T</code>: Dry bulb temperature</List.Item>
              <List.Item><code>P</code>: Pressure (total)</List.Item>
              <List.Item><code>R</code>: Relative humidity (0 to 1)</List.Item>
              <List.Item><code>W</code>: Humidity ratio (kg water / kg dry air)</List.Item>
              <List.Item><code>D</code>: Dew point temperature</List.Item>
              <List.Item><code>B</code>: Wet bulb temperature</List.Item>
            </List>
          </Stack>
        );
      case 'calculus':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Numerical Integration (ODEs & Calculus)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees supports definite integrals and first-order Ordinary Differential Equations (ODEs) using Runge-Kutta numerical integration:
            </Text>
            <Paper withBorder p="md" bg="dark.8">
              <Code block>{`y = Integral(3 * x^2, x, 0, 5)   { Definite integral of 3x^2 from 0 to 5 }`}</Code>
            </Paper>
          </Stack>
        );
      case 'optimization':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Optimization & Sweeps</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Use the **Optimization** tool to minimize or maximize objective functions w.r.t decision variables. Build a **Parametric Table** to perform multi-variable sweeps, which runs the system for consecutive rows and populates a result grid.
            </Text>
          </Stack>
        );
      case 'api':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Solver Reference & API</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The frees engine parses equations into a Symbolic Abstract Syntax Tree (AST). It groups variables using Tarjan's strongly connected components (SCC) algorithm to construct minimal blocks of coupled equations. These blocks are then solved in sequence using a multivariate Newton-Raphson iterative solver with step-halving.
            </Text>
          </Stack>
        );
      case 'diagram':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Diagram Canvas & Plotting</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The **Diagram Window** provides an interactive CAD canvas where you can build structural or thermodynamic schematics, wire them to variables, and trigger animations or recordings. Plot variables directly using Mantine's Plotly charts.
            </Text>
          </Stack>
        );
      case 'examples':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Engineering Examples Library</Title>
            <Text>Select an example from the library below. Copy the code directly into the workspace using the copy button:</Text>
            <MantineAccordion variant="separated">
              <MantineAccordion.Item value="rankine">
                <MantineAccordion.Control>
                  <Text fw={600} c="blue.3">Ideal Rankine Steam Power Cycle</Text>
                </MantineAccordion.Control>
                <MantineAccordion.Panel>
                  <Text size="sm" mb="xs">Analyses an ideal Rankine cycle, computing state enthalpies, work, and efficiency.</Text>
                  <Paper withBorder p="xs" bg="dark.9" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Ideal Rankine Steam Power Cycle }\
P_high = 8000 [kPa]\
P_low = 10 [kPa]\
T_boiler = 500 [C]\
eta_turb = 0.85\
eta_pump = 0.90\
W_dot_net = 10000 [kW]\
h1 = Enthalpy(Water, P=P_high, T=T_boiler)\
s1 = Entropy(Water, P=P_high, T=T_boiler)\
s_2s = s1\
h_2s = Enthalpy(Water, P=P_low, s=s_2s)\
h2 = h1 - eta_turb * (h1 - h_2s)\
h3 = Enthalpy(Water, P=P_low, x=0)\
v3 = Volume(Water, P=P_low, x=0)\
h_4s = Enthalpy(Water, P=P_high, s=Entropy(Water, P=P_low, x=0))\
h4 = h3 + (h_4s - h3) / eta_pump\
w_turb = h1 - h2\
w_pump = h4 - h3\
q_boiler = h1 - h4\
w_net = w_turb - w_pump\
eta_th = w_net / q_boiler * 100\
W_dot_net = m_dot * w_net`} />
                    <Code block style={{ background: 'transparent', maxHeight: '250px', overflowY: 'auto' }}>
                      {`{ Ideal Rankine Steam Power Cycle }
P_high = 8000 [kPa]
P_low = 10 [kPa]
T_boiler = 500 [C]
eta_turb = 0.85
eta_pump = 0.90
W_dot_net = 10000 [kW]

h1 = Enthalpy(Water, P=P_high, T=T_boiler)
s1 = Entropy(Water, P=P_high, T=T_boiler)
s_2s = s1
h_2s = Enthalpy(Water, P=P_low, s=s_2s)
h2 = h1 - eta_turb * (h1 - h_2s)
h3 = Enthalpy(Water, P=P_low, x=0)
v3 = Volume(Water, P=P_low, x=0)
h_4s = Enthalpy(Water, P=P_high, s=Entropy(Water, P=P_low, x=0))
h4 = h3 + (h_4s - h3) / eta_pump

w_turb = h1 - h2
w_pump = h4 - h3
q_boiler = h1 - h4
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net`}
                    </Code>
                  </Paper>
                </MantineAccordion.Panel>
              </MantineAccordion.Item>

              {CYCLE_EXAMPLES.map((ex) => (
                <MantineAccordion.Item value={ex.value} key={ex.value}>
                  <MantineAccordion.Control>
                    <Text fw={600} c="cyan.3">{ex.title}</Text>
                  </MantineAccordion.Control>
                  <MantineAccordion.Panel>
                    <Text size="sm" mb="xs">{ex.description}</Text>
                    {ex.note && (
                      <Alert color="gray" py="xs" mb="sm">
                        {ex.note}
                      </Alert>
                    )}
                    <Paper withBorder p="xs" bg="dark.9" style={{ position: 'relative' }}>
                      <CopyButton code={ex.code} />
                      <Code block style={{ background: 'transparent', maxHeight: '250px', overflowY: 'auto' }}>
                        {ex.code}
                      </Code>
                    </Paper>
                  </MantineAccordion.Panel>
                </MantineAccordion.Item>
              ))}
            </MantineAccordion>
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 320,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          background: 'var(--mantine-color-dark-8)',
          minHeight: 'calc(100vh - 60px)'
        }
      }}
    >
      <AppShell.Header bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text span inherit variant="gradient" gradient={{ from: 'blue.4', to: 'cyan.3', deg: 90 }}>
                frees
              </Text>
              <Text span inherit size="lg" c="dimmed" fw={500}>
                Documentation Portal
              </Text>
            </Title>
          </Group>
          <Badge color="blue" variant="filled" size="lg">v1.2.0 (Stable)</Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" bg="dark.9" style={{ borderRight: '1px solid var(--mantine-color-dark-4)' }}>
        <TextInput
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={
            searchQuery ? (
              <CloseButton onClick={() => setSearchQuery('')} size="sm" />
            ) : null
          }
          mb="md"
        />

        <AppShell.Section grow component={ScrollArea} offsetScrollbars>
          <Stack gap="md">
            {filteredCategories.map((category) => (
              <div key={category.title}>
                <Group gap="xs" px="xs" mb="xs">
                  {category.icon}
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {category.title}
                  </Text>
                </Group>
                {category.items.map((item) => (
                  <NavLink
                    key={item.id}
                    label={item.label}
                    active={active === item.id}
                    onClick={() => {
                      setActive(item.id);
                      if (opened) toggle();
                    }}
                    variant="filled"
                    color="blue"
                    styles={{
                      label: { fontSize: '13px', fontWeight: active === item.id ? 600 : 400 },
                      root: { borderRadius: '6px', marginBottom: '2px', paddingLeft: '12px' }
                    }}
                  />
                ))}
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" mt="md">
                No matching topics found.
              </Text>
            )}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="md" pt="md" pb="xl">
          {renderContent()}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
