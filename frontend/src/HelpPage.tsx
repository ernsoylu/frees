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
  Accordion,
  Button,
  SimpleGrid,
  ThemeIcon
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
h[1] = Enthalpy(Water, P=P[6], x=0)
v[1] = Volume(Water, P=P[6], x=0)

{ State 2: pump exit }
w_pump = v[1] * (P[3] - P[6]) / eta_pump
h[2] = h[1] + w_pump

{ Energy balances }
q_in = (h[3] - h[2]) + (h[5] - h[4])
w_turb = (h[3] - h[4]) + (h[5] - h[6])
w_net = w_turb - w_pump
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100`,
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
T[4] = Temperature(Air, P=P[1], h=h[4])

{ Regenerator }
h[5] = h[2] + epsilon * (h[4] - h[2])

{ Performance }
q_in = h[3] - h[5]
w_net = w_T - w_C
eta_th = w_net / q_in * 100`,
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
    description: "A flow splits into two parallel branches that must share the same head loss, then recombines. Each branch's friction factor comes from the implicit Colebrook equation, so the whole network — continuity, the equal-head-loss condition, and three transcendental friction equations — is solved simultaneously via a DUPLICATE block.",
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
DUPLICATE j = 1, 3
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
DUPLICATE m = 1, 3
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
DUPLICATE m = 1, 3
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
DUPLICATE i = 1, 6
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

const SECTIONS = [
  { id: 'started', label: '1. Getting Started' },
  { id: 'syntax', label: '2. Equation Syntax & Math' },
  { id: 'variables', label: '3. Variables & Bounds' },
  { id: 'units', label: '4. Units & Consistency' },
  { id: 'arrays', label: '5. Arrays & Loops' },
  { id: 'matrices', label: '6. Matrices & Vectors' },
  { id: 'functions', label: '7. Functions & Procedures' },
  { id: 'modules', label: '8. Modular Submodels' },
  { id: 'thermo', label: '9. Fluid Properties (CoolProp)' },
  { id: 'humidair', label: '10. Psychrometrics (AirH2O)' },
  { id: 'calculus', label: '11. Numerical Integration' },
  { id: 'complex', label: '12. Complex Numbers' },
  { id: 'examples', label: '13. Engineering Examples' },
  { id: 'api', label: '14. Solver Reference & API' },
  { id: 'optimization', label: '15. Optimization & Plotting' },
  { id: 'diagram', label: '16. Diagram Window' },
];

export default function HelpPage() {
  const [opened, { toggle }] = useDisclosure();
  const [active, setActive] = useState('started');

  const renderContent = () => {
    switch (active) {
      case 'started':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">1. Getting Started with frees</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Welcome to <strong>frees</strong> (free solver). frees is a declarative, web-based numerical solver designed for engineers, researchers, and students.
            </Text>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Unlike procedural languages (like Python, MATLAB, or C++), where you must explicitly rearrange equations to solve for unknowns (e.g. writing <code>x = ...</code>), frees is <strong>declarative</strong>. You input your equations exactly as they are written in physics and engineering textbooks (e.g. <code>P * V = n * R * T</code>), and the solver automatically determines which variables are unknown, groups equations into blocks, and solves them simultaneously.
            </Text>

            <Alert color="blue" title="The Declarative Philosophy" mt="xs">
              In frees, <code>x + y = 5</code> and <code>y = 5 - x</code> are completely identical. You do not need to isolate variables; the solver uses advanced graph theory (Tarjan's strongly connected components) to group equations and solve them for you.
            </Alert>

            <Title order={3} mt="sm">The frees Workflow</Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <ThemeIcon color="blue" radius="xl" size="lg" mb="sm">1</ThemeIcon>
                <Text fw={600} size="sm">1. Enter Equations</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Write your algebraic equations in the main editor. Order of equations does not matter. Case is ignored.
                </Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <ThemeIcon color="indigo" radius="xl" size="lg" mb="sm">2</ThemeIcon>
                <Text fw={600} size="sm">2. Check & Bound</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Press <strong>F4</strong> to compile and check degrees of freedom. Set bounds and initial guesses in <strong>Variable Info</strong>.
                </Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <ThemeIcon color="cyan" radius="xl" size="lg" mb="sm">3</ThemeIcon>
                <Text fw={600} size="sm">3. Solve & Sweeps</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Press <strong>F2</strong> to solve. View residuals in the Solution Window. Run parameter sweeps in the <strong>Parametric Table</strong>.
                </Text>
              </Card>
            </SimpleGrid>

            <Title order={3} mt="md">Keyboard Shortcuts (Hotkeys)</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Hotkey</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>F4</Code></Table.Td>
                  <Table.Td><strong>Check Equations</strong></Table.Td>
                  <Table.Td>Validates syntax, lists active variables, and checks if the number of equations equals variables.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>F2</Code></Table.Td>
                  <Table.Td><strong>Solve System</strong></Table.Td>
                  <Table.Td>Runs the simultaneous numerical solver and displays the Solution window.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Ctrl + I</Code></Table.Td>
                  <Table.Td><strong>Variable Info</strong></Table.Td>
                  <Table.Td>Opens the grid where you can set initial guesses, limits, display units, and display formatting.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Ctrl + T</Code></Table.Td>
                  <Table.Td><strong>Solve Table</strong></Table.Td>
                  <Table.Td>Runs the solver sequentially for all rows configured in the active Parametric Table.</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="md">Hello World Example</Title>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`x + y = 3\ny = x^2 - 1`} />
              <Code block style={{ background: 'transparent' }}>
                {`x + y = 3\ny = x^2 - 1`}
              </Code>
            </Paper>
            <Text size="sm" c="dimmed">
              Paste this in the Editor, click <strong>Check (F4)</strong> to verify (2 variables, 2 equations), and click <strong>Solve (F2)</strong>. The solver will find the root: <code>x = 1.562</code>, <code>y = 1.438</code>.
            </Text>

            <Title order={3} mt="lg">Markdown Reports & Inline Equations</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              frees allows you to mix standard Markdown and mathematical equations directly in the <strong>Editor</strong>. When you click <strong>Check</strong> or <strong>Solve</strong>, the solver automatically extracts and evaluates all equations, generating a beautifully integrated <strong>Formatted</strong> report.
            </Text>
            <Alert color="blue" title="Prose with Equations" mt="xs">
              You can write inline variables and equations anywhere in your text. Any statement containing an <code>=</code> sign is automatically parsed as an equation, solved, and formatted as a LaTeX/KaTeX formula.
            </Alert>
            <Alert color="blue" title="Embedding Diagrams & Graphs" mt="xs">
              You can embed property diagrams, psychrometric charts, and X-Y parametric plots directly within your Formatted Report. Simply use the tag <code>{`[Graph="Diagram Name"] Caption Text [/Graph]`}</code>. The solver automatically resolves the diagram name and embeds the interactive plot with auto-incrementing figure numbers.
            </Alert>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`# Ideal Rankine Steam Power Cycle

This report analyzes an ideal Rankine steam power cycle with isentropic efficiency constraints.

## Inputs and Parameters
* Boiler Pressure: P_high = 8000 [kPa]
* Condenser Pressure: P_low = 10 [kPa]
* Boiler Temperature: T_boiler = 500 [C]
* Turbine Isentropic Efficiency: eta_turb = 0.85
* Pump Isentropic Efficiency: eta_pump = 0.90
* Target Net Power Output: W_dot_net = 10000 [kW]

## State 1: HP Turbine Inlet (Superheated Steam)
We evaluate enthalpy and entropy at state 1:
h[1] = Enthalpy(Water, P=P_high, T=T_boiler)
s[1] = Entropy(Water, P=P_high, T=T_boiler)
T[1] = T_boiler

## State 2: Actual Turbine Exit
First we compute the isentropic exit enthalpy:
s_2s = s[1]
h_2s = Enthalpy(Water, P=P_low, s=s_2s)

Then actual exit conditions using isentropic efficiency:
h[2] = h[1] - eta_turb * (h[1] - h_2s)
s[2] = Entropy(Water, P=P_low, h=h[2])
T[2] = Temperature(Water, P=P_low, h=h[2])

## State 3: Condenser Exit (Saturated Liquid)
h[3] = Enthalpy(Water, P=P_low, x=0)
v[3] = Volume(Water, P=P_low, x=0)
s[3] = Entropy(Water, P=P_low, x=0)
T[3] = Temperature(Water, P=P_low, x=0)

## State 4: Actual Pump Exit
s_4s = s[3]
h_4s = Enthalpy(Water, P=P_high, s=s_4s)
h[4] = h[3] + (h_4s - h[3]) / eta_pump
s[4] = Entropy(Water, P=P_high, h=h[4])
T[4] = Temperature(Water, P=P_high, h=h[4])

## Performance Analysis
Let's compute the work and heat rates:
w_turb = h[1] - h[2]
w_pump = h[4] - h[3]
q_boiler = h[1] - h[4]
q_cond = h[2] - h[3]

Net work output, thermal efficiency, and mass flow rate:
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net

## Visualization
Here is the thermodynamic T-s diagram showing the cycle state points:
[Graph="Diagram 1"] Ts Diagram of the Cycle [/Graph]`} />
              <Code block style={{ background: 'transparent' }}>
                {`# Ideal Rankine Steam Power Cycle

This report analyzes an ideal Rankine steam power cycle with isentropic efficiency constraints.

## Inputs and Parameters
* Boiler Pressure: P_high = 8000 [kPa]
* Condenser Pressure: P_low = 10 [kPa]
* Boiler Temperature: T_boiler = 500 [C]
* Turbine Isentropic Efficiency: eta_turb = 0.85
* Pump Isentropic Efficiency: eta_pump = 0.90
* Target Net Power Output: W_dot_net = 10000 [kW]

## State 1: HP Turbine Inlet (Superheated Steam)
We evaluate enthalpy and entropy at state 1:
h[1] = Enthalpy(Water, P=P_high, T=T_boiler)
s[1] = Entropy(Water, P=P_high, T=T_boiler)
T[1] = T_boiler

## State 2: Actual Turbine Exit
First we compute the isentropic exit enthalpy:
s_2s = s[1]
h_2s = Enthalpy(Water, P=P_low, s=s_2s)

Then actual exit conditions using isentropic efficiency:
h[2] = h[1] - eta_turb * (h[1] - h_2s)
s[2] = Entropy(Water, P=P_low, h=h[2])
T[2] = Temperature(Water, P=P_low, h=h[2])

## State 3: Condenser Exit (Saturated Liquid)
h[3] = Enthalpy(Water, P=P_low, x=0)
v[3] = Volume(Water, P=P_low, x=0)
s[3] = Entropy(Water, P=P_low, x=0)
T[3] = Temperature(Water, P=P_low, x=0)

## State 4: Actual Pump Exit
s_4s = s[3]
h_4s = Enthalpy(Water, P=P_high, s=s_4s)
h[4] = h[3] + (h_4s - h[3]) / eta_pump
s[4] = Entropy(Water, P=P_high, h=h[4])
T[4] = Temperature(Water, P=P_high, h=h[4])

## Performance Analysis
Let's compute the work and heat rates:
w_turb = h[1] - h[2]
w_pump = h[4] - h[3]
q_boiler = h[1] - h[4]
q_cond = h[2] - h[3]

Net work output, thermal efficiency, and mass flow rate:
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net

## Visualization
Here is the thermodynamic T-s diagram showing the cycle state points:
[Graph="Diagram 1"] Ts Diagram of the Cycle [/Graph]`}
              </Code>
            </Paper>
            <Text size="sm" c="dimmed">
              Paste this example in the <strong>Editor</strong> tab, then toggle the control at the top-right to <strong>Formatted</strong> to see the rendered KaTeX equations and the embedded plot.
            </Text>
          </Stack>
        );
      case 'syntax':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">2. Equation Syntax & Math Functions</Title>
            <Text>
              The Editor allows you to enter relationships between variables using standard mathematical notation.
            </Text>
            <Title order={3}>Rules & Syntax</Title>
            <List spacing="xs">
              <List.Item><strong>Equality:</strong> Use a single equal sign <Code>=</Code> for equations. Do not use assignment operators for declarative equations.</List.Item>
              <List.Item><strong>Case Insensitivity:</strong> <Code>T_inlet</Code>, <Code>T_Inlet</Code>, and <Code>t_inlet</Code> refer to the same variable.</List.Item>
              <List.Item><strong>Comments:</strong> Document your equations using curly braces <Code>{`{ comment }`}</Code> or double quotes <Code>"comment"</Code>. These are ignored by the compiler.</List.Item>
              <List.Item><strong>Multiplication:</strong> Implicit multiplication is not supported. You must write <Code>*</Code> explicitly (e.g., write <Code>2 * x</Code>, not <Code>2x</Code>).</List.Item>
              <List.Item><strong>Operators:</strong> Standard arithmetic operators <Code>+</Code>, <Code>-</Code>, <Code>*</Code>, <Code>/</Code>, and <Code>^</Code> (power) are supported.</List.Item>
            </List>

            <Title order={3} mt="sm">Built-in Mathematical Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '200px' }}>Function</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Example</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>abs(x)</Code></Table.Td>
                  <Table.Td>Absolute value of x</Table.Td>
                  <Table.Td><Code>y = abs(-5.2)</Code> (y = 5.2)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sqrt(x)</Code></Table.Td>
                  <Table.Td>Square root of x</Table.Td>
                  <Table.Td><Code>y = sqrt(16)</Code> (y = 4)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>ln(x)</Code></Table.Td>
                  <Table.Td>Natural logarithm (base e)</Table.Td>
                  <Table.Td><Code>y = ln(exp(1))</Code> (y = 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>log10(x)</Code></Table.Td>
                  <Table.Td>Base-10 logarithm</Table.Td>
                  <Table.Td><Code>y = log10(100)</Code> (y = 2)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>exp(x)</Code></Table.Td>
                  <Table.Td>Exponential function (e^x)</Table.Td>
                  <Table.Td><Code>y = exp(0)</Code> (y = 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sin(x), cos(x), tan(x)</Code></Table.Td>
                  <Table.Td>Trigonometric functions (arguments in **radians**)</Table.Td>
                  <Table.Td><Code>y = sin(pi / 2)</Code> (y = 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>arcsin(x), arccos(x), arctan(x)</Code></Table.Td>
                  <Table.Td>Inverse trigonometric functions (returns **radians**)</Table.Td>
                  <Table.Td><Code>theta = arcsin(1)</Code> (theta = 1.5708)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>atan2(y, x)</Code></Table.Td>
                  <Table.Td>Four-quadrant inverse tangent</Table.Td>
                  <Table.Td><Code>theta = atan2(1, -1)</Code> (theta = 2.3562)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>min(a, b, ...), max(a, b, ...)</Code></Table.Td>
                  <Table.Td>Minimum or maximum of a list of expressions</Table.Td>
                  <Table.Td><Code>y = max(2, x, y[1])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sum(a, b, ...), avg(a, b, ...)</Code></Table.Td>
                  <Table.Td>Sum or average of values (useful with array slices)</Table.Td>
                  <Table.Td><Code>y = sum(x[1..5])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>bitand(x, y), bitor(x, y), bitxor(x, y)</Code></Table.Td>
                  <Table.Td>Bitwise AND, OR, and XOR operations on 64-bit integer casts</Table.Td>
                  <Table.Td><Code>y = bitand(5, 6)</Code> (y = 4)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>bitnot(x)</Code></Table.Td>
                  <Table.Td>Bitwise NOT (one's complement) operation</Table.Td>
                  <Table.Td><Code>y = bitnot(0)</Code> (y = -1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>bitshiftl(x, n), bitshiftr(x, n)</Code></Table.Td>
                  <Table.Td>Bitwise left-shift and right-shift of x by n bits</Table.Td>
                  <Table.Td><Code>y = bitshiftl(2, 3)</Code> (y = 16)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>mod(x, y)</Code></Table.Td>
                  <Table.Td>Floating-point modulo (remainder of x / y)</Table.Td>
                  <Table.Td><Code>y = mod(10.5, 3)</Code> (y = 1.5)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>gcd(x, y), lcm(x, y)</Code></Table.Td>
                  <Table.Td>Greatest Common Divisor and Least Common Multiple (integer cast)</Table.Td>
                  <Table.Td><Code>y = gcd(24, 36)</Code> (y = 12)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>erf(x), erfc(x), erfinv(x)</Code></Table.Td>
                  <Table.Td>Error, complementary error, and inverse error functions</Table.Td>
                  <Table.Td><Code>y = erf(0)</Code> (y = 0)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>gamma(x), loggamma(x)</Code></Table.Td>
                  <Table.Td>Gamma function Γ(x) and natural log of gamma function</Table.Td>
                  <Table.Td><Code>y = gamma(4)</Code> (y = 6)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>beta(a, b)</Code></Table.Td>
                  <Table.Td>Beta function B(a, b)</Table.Td>
                  <Table.Td><Code>y = beta(2, 3)</Code> (y = 0.0833)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>besselj(x, order)</Code></Table.Td>
                  <Table.Td>Bessel function of the first kind J_order(x)</Table.Td>
                  <Table.Td><Code>y = besselj(2.5, 0)</Code> (y = -0.0484)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>besseli(x, order)</Code></Table.Td>
                  <Table.Td>Modified Bessel function of the first kind I_order(x)</Table.Td>
                  <Table.Td><Code>y = besseli(2, 1)</Code> (y = 1.5906)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>BaseConvert(digits, from, to)</Code></Table.Td>
                  <Table.Td>Converts a number between bases 2–36. The digits are given as a string literal (or an integer); the result is returned as the number whose decimal digits spell the converted value, so the target base should be 10 or lower-digit.</Table.Td>
                  <Table.Td><Code>{`y = BaseConvert('FF', 16, 10)`}</Code> (y = 255)</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="md">String Literals & String Variables</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Text in <strong>single quotes</strong> is a string literal: <Code>{`'R134a'`}</Code>. Strings are
              used as function arguments — the digit string of <Code>BaseConvert</Code>, the unit names of
              <Code>{`Convert('ft^2', 'in^2')`}</Code>, or the fluid name of a property call like
              <Code>{`h = Enthalpy('R134a', T=300, x=1)`}</Code> (unquoted names are still accepted).
              Note that <strong>double quotes remain comments</strong>: <Code>"this text is ignored"</Code>.
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              A variable whose name ends in <Code>$</Code> is a <strong>string variable</strong> (EES
              convention). Assign it a literal once and use it anywhere a string is accepted:
            </Text>
            <Paper withBorder p="xs" bg="dark.9" radius="md">
              <Code block style={{ background: 'transparent' }}>
                {`R$ = 'R134a'
h1 = Enthalpy(R$, T=300, x=1)
s1 = Entropy(R$, T=300, x=1)`}
              </Code>
            </Paper>
            <Text size="sm" style={{ lineHeight: 1.6 }}>
              String assignments are compile-time constants: they are substituted before solving and do not
              count toward the equation/variable balance. Defining the same string variable twice with
              different values, or using an undefined one, is a syntax error.
            </Text>
          </Stack>
        );
      case 'variables':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">3. Variables, Guess Values & Bounds</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Because frees uses numerical iteration (Newton-Raphson) to solve non-linear simultaneous equations, initial guess values and boundary limits are critical for ensuring solver convergence.
            </Text>

            <Title order={3}>Variable Information Grid</Title>
            <Text>
              Clicking <strong>Variable Info</strong> in the top toolbar (or pressing <Code>Ctrl + I</Code>) opens a modal displaying all variables in the system. For each variable, you can configure:
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item><strong>Guess Value:</strong> The starting point for solver iterations. If an equation has multiple solutions (e.g., $x^2 = 4$), the solver will typically find the root closest to the guess value. By default, all guess values are set to 1.0.</List.Item>
              <List.Item><strong>Lower & Upper Bounds:</strong> Restricts the values the solver can assign to a variable. Newton steps will be clamped to these bounds. Bounds are vital to keep variables within their mathematical or physical domains (e.g. avoiding negative values for pressures, volume, absolute temperature, or concentrations).</List.Item>
              <List.Item><strong>Units:</strong> Set display units for variables (e.g. <code>C</code>, <code>kPa</code>, <code>kJ/kg</code>).</List.Item>
            </List>

            <Alert color="indigo" title="Physical Boundaries Tip">
              If your system involves thermodynamic properties (e.g., steam tables), always set physical bounds. For example, absolute temperature in Kelvin should have a lower bound of <code>0</code>, and pressures should have a lower bound of <code>0.001</code>. This prevents the solver from evaluating unphysical states (like negative pressure) and crashing during intermediate solver steps.
            </Alert>

            <Title order={3} mt="sm">How to Set Initial Guesses</Title>
            <Text size="sm">
              1. Enter your equations and click <strong>Check (F4)</strong>. This compiles the equations and populates the variable list.
              <br/>
              2. Open <strong>Variable Info (Ctrl+I)</strong>.
              <br/>
              3. Identify non-linear variables and supply reasonable physical guesses (e.g. if you expect a pressure of 10 bar, change the guess from <code>1.0</code> to <code>1000 [kPa]</code>).
            </Text>
          </Stack>
        );
      case 'units':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">4. Units & Dimensional Consistency</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees features a robust unit conversion and verification engine. Internally, all equations are parsed and calculated strictly in **SI base units** (K, Pa, kg, m, s, etc.) to ensure numerical correctness. However, inputs can be annotated in any unit, and outputs are converted back for display.
            </Text>

            <Title order={3}>Unit Annotations</Title>
            <Text>
              You can attach units to numeric constants by placing them in square brackets immediately following the number:
            </Text>
            <Paper withBorder p="sm" bg="dark.8"><Code block>P_inlet = 101.3 [kPa]</Code></Paper>
            <Text size="sm" c="dimmed">
              This converts 101.3 kPa (101,300 Pa) to SI units internally. When viewing results in the Solution window, frees will display the value as <code>101.3</code> and set its unit to <code>kPa</code>.
            </Text>

            <Title order={3} mt="sm">The Convert() Function</Title>
            <Text>
              Use the built-in <Code>Convert(fromUnit, toUnit)</Code> function to apply scaling factors. The syntax is:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`Length_m = 5 [m]\nLength_in = Length_m * Convert(m, in)`} />
              <Code block style={{ background: 'transparent' }}>
                {`Length_m = 5 [m]\nLength_in = Length_m * Convert(m, in)`}
              </Code>
            </Paper>
            <Text size="sm">
              This will evaluate <code>Length_in</code> as <code>196.85 [in]</code>.
            </Text>

            <Title order={3} mt="sm">Dimensional Homogeneity Checks</Title>
            <Text style={{ lineHeight: 1.6 }}>
              When you click **Check** or **Solve**, frees validates unit consistency. If you add variables with incompatible units (e.g., adding a length to a time, like <code>x = 5 [m] + 3 [s]</code>), frees will compile and solve the math, but it will display a **Unit Warning** in yellow at the bottom of the screen. Clicking the warning reveals exactly which equations violated unit consistency.
            </Text>
          </Stack>
        );
      case 'arrays':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">5. Arrays & Duplicate Loops</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Arrays are highly useful for modeling multi-stage processes (like distillation columns or multi-stage compressors), finite-difference models, and parameter sweeps.
            </Text>

            <Title order={3}>Array Notation</Title>
            <Text>
              Arrays use square brackets to indicate index values. You can define single-dimensional or multi-dimensional arrays:
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item><Code>T[1] = 300</Code>: First element of array T.</List.Item>
              <List.Item><Code>H[2, 3] = 450</Code>: Element at row 2, column 3 of matrix H.</List.Item>
            </List>

            <Title order={3} mt="sm">The DUPLICATE Block</Title>
            <Text>
              To avoid manually typing out repeating equations, use a <Code>DUPLICATE</Code> loop. This is expanded at compile-time by the parser:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`N = 5\nDUPLICATE i = 1, N\n  X[i] = i * 10\n  Y[i] = X[i]^2\nEND`} />
              <Code block style={{ background: 'transparent' }}>
                {`N = 5\nDUPLICATE i = 1, N\n  X[i] = i * 10\n  Y[i] = X[i]^2\nEND`}
              </Code>
            </Paper>
            <Text size="sm" c="dimmed">
              This expands into 10 separate equations: <code>X[1] = 10</code>, <code>Y[1] = X[1]^2</code>, ..., <code>X[5] = 50</code>, <code>Y[5] = X[5]^2</code>.
            </Text>

            <Title order={3} mt="sm">Range Generation (MATLAB-style)</Title>
            <Text>
              Fill an array with an evenly-spaced sequence using a colon range
              <Code>start:step:stop</Code> (the step defaults to <Code>1</Code> if omitted).
              Append <Code>| Log</Code> for geometric spacing, where the middle number is the
              <strong> point count</strong> (<Code>start:count:stop</Code>); <Code>| Linear</Code>
              {' '}is the default.
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`speed = 0:10:100          { 0, 10, 20, ..., 100  -> speed[1..11] }
x     = -50:1:50 | Linear { -50, -49, ..., 50 }
freq  = 1:5:1000 | Log    { 5 points: 1, 10^0.75, 10^1.5, 10^2.25, 1000 }
vmax  = speed[11]`}</Code>
            </Paper>

            <Title order={3} mt="sm">Array Slices in Aggregate Functions</Title>
            <Text>
              You can pass slices of arrays using the double-dot <Code>..</Code> range notation as arguments to aggregate functions like <Code>sum</Code>, <Code>avg</Code>, <Code>min</Code>, and <Code>max</Code>:
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`Total_X = sum(X[1..5])\nAverage_Y = avg(Y[1..5])`}</Code>
            </Paper>
          </Stack>
        );
      case 'matrices':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">6. Matrices & Vectors</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees supports robust vector and matrix algebra. Rather than using runtime libraries that bypass equation dependencies, matrix and vector equations are compiled down to scalar constraint equations solved via Newton's method. This allows full differentiability, respects variable bounds, and works seamlessly with the rest of the solver.
            </Text>

            <Title order={3}>Declaring Vectors & Matrices</Title>
            <Text>
              Vectors and matrices are declared using slice notation or duplicate blocks:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`v[1..3] = [1, 2, 3]\nA[1..3, 1..3] = 0\nDUPLICATE i = 1, 3\n  A[i,i] = 10\nEND`} />
              <Code block style={{ background: 'transparent' }}>
                {`v[1..3] = [1, 2, 3]\nA[1..3, 1..3] = 0\nDUPLICATE i = 1, 3\n  A[i,i] = 10\nEND`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Matrix & Vector Operations</Title>
            <Text>
              frees provides built-in functions for algebraic operations:
            </Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Example Syntax</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>transpose(A)</Code></Table.Td>
                  <Table.Td>Matrix transpose</Table.Td>
                  <Table.Td><Code>B[1..3, 1..3] = transpose(A[1..2, 1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>inverse(A)</Code></Table.Td>
                  <Table.Td>Matrix inverse</Table.Td>
                  <Table.Td><Code>A_inv[1..3, 1..3] = inverse(A[1..3, 1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>dot(u, v)</Code></Table.Td>
                  <Table.Td>Vector dot product (scalar outcome)</Table.Td>
                  <Table.Td><Code>d = dot(u[1..3], v[1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>norm(v)</Code></Table.Td>
                  <Table.Td>Vector Euclidean ($L_2$) norm</Table.Td>
                  <Table.Td><Code>mag = norm(v[1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>cross(u, v)</Code></Table.Td>
                  <Table.Td>3D vector cross product</Table.Td>
                  <Table.Td><Code>w[1..3] = cross(u[1..3], v[1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>determinant(A)</Code></Table.Td>
                  <Table.Td>Matrix determinant (scalar outcome)</Table.Td>
                  <Table.Td><Code>det = determinant(A[1..3, 1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>SolveLinear(A, b)</Code></Table.Td>
                  <Table.Td>Solves the linear system $A \cdot x = b$ for vector $x$</Table.Td>
                  <Table.Td><Code>x[1..3] = SolveLinear(A[1..3, 1..3], b[1..3])</Code></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Triangular & Euler Decompositions</Title>
            <Text>
              Procedural submodels are available via the <Code>CALL</Code> statement for matrix factorizations and rotational dynamics:
            </Text>
            <List spacing="xs">
              <List.Item>
                <strong>LU Decomposition:</strong> Factorizes square matrix $A$ into lower triangular $L$ (with unit diagonal) and upper triangular $U$:
                <Code block mt="xs">{`CALL LUDecompose(A[1..3,1..3] : L[1..3,1..3], U[1..3,1..3])`}</Code>
              </List.Item>
              <List.Item>
                <strong>Euler rotation matrix:</strong> Generates a ZXZ rotation matrix $R$ based on Euler angles $\phi, \theta, \psi$ (in radians):
                <Code block mt="xs">{`CALL EulerRotate(phi, theta, psi : R[1..3, 1..3])`}</Code>
              </List.Item>
              <List.Item>
                <strong>Euler decomposition:</strong> Extracts ZXZ Euler angles $\phi, \theta, \psi$ from a 3D rotation matrix $R$:
                <Code block mt="xs">{`CALL EulerDecompose(R[1..3,1..3] : phi, theta, psi)`}</Code>
              </List.Item>
              <List.Item>
                <strong>Eigenvalues:</strong> Computes the eigenvalues of a square matrix $A$, reported in ascending order. The matrix entries may themselves be unknowns — the decomposition runs once they are solved:
                <Code block mt="xs">{`CALL Eigenvalues(A[1..3,1..3] : lambda[1..3])`}</Code>
              </List.Item>
              <List.Item>
                <strong>Eigenvalues & eigenvectors:</strong> Also returns the matrix $V$ whose column $k$ is the unit eigenvector of $\lambda_k$ (largest-magnitude component made positive). Real spectra only — symmetric matrices always qualify:
                <Code block mt="xs">{`CALL Eigen(A[1..3,1..3] : lambda[1..3], V[1..3,1..3])`}</Code>
              </List.Item>
            </List>

            <Title order={3} mt="sm">Practical Example: Linear System Solving</Title>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`A[1,1] = 2;  A[1,2] = 1;  A[1,3] = -1\nA[2,1] = -3; A[2,2] = -1; A[2,3] = 2\nA[3,1] = -2; A[3,2] = 1;  A[3,3] = 2\n\nb[1..3] = [8, -11, -3]\n\nx[1..3] = SolveLinear(A[1..3,1..3], b[1..3])`} />
              <Code block style={{ background: 'transparent' }}>
                {`A[1,1] = 2;  A[1,2] = 1;  A[1,3] = -1\nA[2,1] = -3; A[2,2] = -1; A[2,3] = 2\nA[3,1] = -2; A[3,2] = 1;  A[3,3] = 2\n\nb[1..3] = [8, -11, -3]\n\nx[1..3] = SolveLinear(A[1..3,1..3], b[1..3])`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'functions':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">7. Functions & Procedures (Imperative Logic)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              While the global Editor window is declarative and order-independent, you can write procedural, sequential logic using **Functions** and **Procedures**. Inside these blocks, code is executed top-to-bottom.
            </Text>

            <Title order={3}>Functions (Scalar output)</Title>
            <Text size="sm">
              Functions take inputs and return a single, scalar value. Inside a function body:
              <br/>
              - Assign values using the sequential assignment operator <Code>:=</Code>.
              <br/>
              - Control flow is supported using <Code>IF-THEN-ELSE-END</Code> and <Code>REPEAT-UNTIL</Code> loops.
              <br/>
              - Assign the final returned value to the function's name.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`FUNCTION FrictionFactor(Re, epsilon_d)\n  IF Re < 2300 THEN\n    FrictionFactor := 64 / Re\n  ELSE\n    { Turbulent flow - Haaland approximation }\n    FrictionFactor := (1.8 * log10((epsilon_d / 3.7)^1.11 + 6.9 / Re))^-2\n  END\nEND\n\n{ Call function directly in equations }\nf = FrictionFactor(25000, 0.001)`} />
              <Code block style={{ background: 'transparent' }}>
                {`FUNCTION FrictionFactor(Re, epsilon_d)
  IF Re < 2300 THEN
    FrictionFactor := 64 / Re
  ELSE
    { Turbulent flow - Haaland approximation }
    FrictionFactor := (1.8 * log10((epsilon_d / 3.7)^1.11 + 6.9 / Re))^-2
  END
END

{ Call function directly in equations }
f = FrictionFactor(25000, 0.001)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Procedures (Multiple outputs)</Title>
            <Text size="sm">
              Procedures execute sequentially and can return multiple values.
              <br/>
              - Define the inputs and outputs separated by a colon <Code>:</Code> in the parameter list.
              <br/>
              - Invoke using a <Code>CALL</Code> statement.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`PROCEDURE CylinderGeo(diameter, height : area, volume)\n  radius := diameter / 2\n  area := 2 * pi * radius * (radius + height)\n  volume := pi * radius^2 * height\nEND\n\n{ Call procedure }\nCALL CylinderGeo(0.5, 2.0 : A_cyl, V_cyl)`} />
              <Code block style={{ background: 'transparent' }}>
                {`PROCEDURE CylinderGeo(diameter, height : area, volume)
  radius := diameter / 2
  area := 2 * pi * radius * (radius + height)
  volume := pi * radius^2 * height
END

{ Call procedure }
CALL CylinderGeo(0.5, 2.0 : A_cyl, V_cyl)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Function Tables (Tabulated Functions)</Title>
            <Text size="sm">
              Function Tables allow you to turn tabular data (from the **Graph Digitizer** or entered manually) into callable functions directly within your equations.
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item>
                <strong>Function Table (without Curve) — 1D:</strong> Represents a single-argument function <Code>y = f(x)</Code>. It consists of one input column (<Code>x</Code>) and one output column (<Code>y</Code>).
              </List.Item>
              <List.Item>
                <strong>Function Table (with Curve family) — 2D:</strong> Represents a multi-argument function <Code>y = f(x, z)</Code> where <Code>z</Code> is a curve family parameter (e.g., temperature, pressure). The table interpolates linearly across the independent variables and blends between the closest parameter curves.
              </List.Item>
            </List>

            <Alert color="blue" title="Out-of-Range Guess Auto-Adjustment" mt="xs">
              Tabulated functions clamp out-of-range values to the nearest edge. Because clamping creates a flat line (zero derivative), Newton's method can stall if your initial guess starts outside the table.
              <br/><br/>
              To solve this, <strong>frees automatically checks initial guesses</strong> before solving. If any argument variable lies outside the table's range, its guess value is automatically overridden to the <strong>average of the range</strong> (i.e. <Code>(min + max) / 2</Code>). This provides a non-zero derivative and ensures stable convergence.
            </Alert>

            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`{ Call 1D Function Table }\nU1 = myfunc(Re)\n\n{ Call 2D Function Table with family parameter }\nU2 = htc(Re, T)`} />
              <Code block style={{ background: 'transparent' }}>
                {`{ Call 1D Function Table }
U1 = myfunc(Re)

{ Call 2D Function Table with family parameter }
U2 = htc(Re, T)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Defining Tables in Code (TABLE … END)</Title>
            <Text size="sm">
              Besides the Graph Digitizer and manual editor, you can define a Function
              Table directly in the editor text with a <Code>TABLE … END</Code> block. The
              block name becomes the callable function; the first column is the lookup
              argument and each further column is one curve. Body rows are whitespace-separated
              numbers; <Code>{`//`}</Code> comments are allowed. Code-defined tables appear in
              the Tables window badged <strong>code</strong> (read-only there — the editor text
              is their source). Add the optional flags <Code>XLOG</Code> / <Code>YLOG</Code> to
              interpolate an axis in log space.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`TABLE fanPressure(rpm)\n  // rpm   dP[Pa]\n  1000    120\n  2000    310\n  3000    560\nEND\ndP = fanPressure(2500)\n\n{ 2D curve family: parameter values after the colon }\nTABLE htc(Re : T = 100, 200)\n  0     0     0\n  10    10    30\nEND\nU = htc(5, 150)`} />
              <Code block style={{ background: 'transparent' }}>
                {`TABLE fanPressure(rpm)
  // rpm   dP[Pa]
  1000    120
  2000    310
  3000    560
END
dP = fanPressure(2500)

{ 2D curve family: parameter values after the colon }
TABLE htc(Re : T = 100, 200)
  0     0     0
  10    10    30
END
U = htc(5, 150)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Parametric Tables in Code (PARAMETRIC … END)</Title>
            <Text size="sm">
              Declare a Parametric run-table in the editor with a
              <Code>PARAMETRIC name(vars…) … END</Code> block. Each body line fills one
              column with a range (<Code>start:step:stop</Code>, optionally <Code>| Log</Code>)
              or an explicit list <Code>[a, b, c]</Code>. The table appears in the Tables
              window badged <strong>code</strong>; run it with <strong>Solve Table</strong>.
              The block itself adds no equations to the main system.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`PARAMETRIC sweep1 (T_in, mdot)\n  T_in = 300:10:350 | Linear\n  mdot = [0.1, 0.2, 0.4]\nEND\nQ = mdot * 4180 * (T_in - 290)`} />
              <Code block style={{ background: 'transparent' }}>
                {`PARAMETRIC sweep1 (T_in, mdot)
  T_in = 300:10:350 | Linear
  mdot = [0.1, 0.2, 0.4]
END
Q = mdot * 4180 * (T_in - 290)`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'modules':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">8. Modular Submodels (Modules)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              A <strong>Module</strong> is a declarative submodel. Unlike procedures (which solve sequentially), modules contain equations that are grafted directly into the global system of equations and solved <strong>simultaneously</strong>.
            </Text>

            <Title order={3}>Defining and Calling Modules</Title>
            <Text size="sm">
              - Define inputs and outputs separated by a colon <Code>:</Code>.
              <br/>
              - Write declarative equations inside using the standard equality operator <Code>=</Code>.
              <br/>
              - When called, the solver automatically prefixes all internal variables inside the module with a unique namespace (e.g. <code>m1.temp</code>, <code>m2.temp</code>) so they do not conflict.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`MODULE ParallelPipe(P1, P2, D, L, rho, mu : m_dot)\n  { Friction factors and mass flow relations inside the module }\n  delta_P = P1 - P2\n  delta_P = f * (L / D) * (rho * V^2 / 2)\n  Re = rho * V * D / mu\n  f = 64 / Re { Laminar flow (oil: Re < 2300) }\n  A = pi * D^2 / 4\n  m_dot = rho * V * A\nEND\n\n{ Call module - equations solved simultaneously with main system }\nCALL ParallelPipe(150 [kPa], 100 [kPa], 0.05, 10, 900, 0.29 : m_flow_1)\nCALL ParallelPipe(150 [kPa], 100 [kPa], 0.08, 10, 900, 0.29 : m_flow_2)\nm_flow_total = m_flow_1 + m_flow_2`} />
              <Code block style={{ background: 'transparent' }}>
                {`MODULE ParallelPipe(P1, P2, D, L, rho, mu : m_dot)
  { Friction factors and mass flow relations inside the module }
  delta_P = P1 - P2
  delta_P = f * (L / D) * (rho * V^2 / 2)
  Re = rho * V * D / mu
  f = 64 / Re { Laminar flow (oil: Re < 2300) }
  A = pi * D^2 / 4
  m_dot = rho * V * A
END

{ Call module - equations solved simultaneously with main system }
CALL ParallelPipe(150 [kPa], 100 [kPa], 0.05, 10, 900, 0.29 : m_flow_1)
CALL ParallelPipe(150 [kPa], 100 [kPa], 0.08, 10, 900, 0.29 : m_flow_2)
m_flow_total = m_flow_1 + m_flow_2`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">PROCEDURE vs MODULE</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Feature</Table.Th>
                  <Table.Th>Procedure</Table.Th>
                  <Table.Th>Module</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><strong>Execution Mode</strong></Table.Td>
                  <Table.Td>Sequential (imperative, top-to-bottom)</Table.Td>
                  <Table.Td>Simultaneous (declarative equations added to global system)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Assignment</strong></Table.Td>
                  <Table.Td>Uses assignment operator <Code>:=</Code></Table.Td>
                  <Table.Td>Uses equality operator <Code>=</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Control Flow</strong></Table.Td>
                  <Table.Td>Supports <Code>IF</Code>, <Code>REPEAT-UNTIL</Code></Table.Td>
                  <Table.Td>Not supported (must use mathematical algebraic equations)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Use Cases</strong></Table.Td>
                  <Table.Td>Explicit calculations, complex procedural logic</Table.Td>
                  <Table.Td>Reusable sub-assemblies, physical equipment blocks</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        );
      case 'thermo':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">9. Thermodynamic Fluid Properties (CoolProp)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees is equipped with a direct bridge to the industry-standard **CoolProp** thermodynamic database, allowing you to fetch high-accuracy properties for dozens of fluids.
            </Text>

            <Title order={3}>Syntax & Structure</Title>
            <Text>
              Property calls require a fluid name as the first argument, followed by exactly **two** independent state variables (using named syntax):
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`Result = PropertyFunction(FluidName, InputIndicator1 = Value1, InputIndicator2 = Value2)`}</Code>
            </Paper>
            <Text size="sm">
              Example: <code>h1 = Enthalpy(R134a, T=25 [C], P=100 [kPa])</code>
            </Text>

            <Title order={3} mt="sm">Supported Fluid Names</Title>
            <Group gap="xs">
              <Badge color="blue" variant="filled">Water</Badge>
              <Badge color="blue" variant="filled">Steam</Badge>
              <Badge color="indigo" variant="filled">Air</Badge>
              <Badge color="cyan" variant="filled">CarbonDioxide (R744)</Badge>
              <Badge color="cyan" variant="filled">Nitrogen</Badge>
              <Badge color="cyan" variant="filled">Oxygen</Badge>
              <Badge color="cyan" variant="filled">Hydrogen</Badge>
              <Badge color="cyan" variant="filled">Helium</Badge>
              <Badge color="cyan" variant="filled">Argon</Badge>
              <Badge color="teal" variant="filled">Methane</Badge>
              <Badge color="teal" variant="filled">Ethane</Badge>
              <Badge color="teal" variant="filled">Propane (R290)</Badge>
              <Badge color="teal" variant="filled">Isobutane (R600a)</Badge>
              <Badge color="teal" variant="filled">Butane (R600)</Badge>
              <Badge color="violet" variant="filled">R134a</Badge>
              <Badge color="violet" variant="filled">R12</Badge>
              <Badge color="violet" variant="filled">R22</Badge>
              <Badge color="violet" variant="filled">R32</Badge>
              <Badge color="violet" variant="filled">R123</Badge>
              <Badge color="violet" variant="filled">R245fa</Badge>
              <Badge color="violet" variant="filled">R404a</Badge>
              <Badge color="violet" variant="filled">R407c</Badge>
              <Badge color="violet" variant="filled">R410a</Badge>
              <Badge color="violet" variant="filled">R1234yf</Badge>
              <Badge color="violet" variant="filled">R1234ze</Badge>
              <Badge color="pink" variant="filled">Ammonia (R717)</Badge>
            </Group>

            <Title order={4} mt="sm">Glycol Coolants (aqueous mixtures)</Title>
            <Text size="sm">
              Automotive / HVAC coolants are written as a base name plus the
              glycol <strong>mass percentage</strong>, so the concentration is
              fully configurable. These are single-phase liquids — use
              <Code>T</Code> and <Code>P</Code> as the two state indicators
              (quality does not apply).
            </Text>
            <Group gap="xs">
              <Badge color="lime" variant="filled">EG50</Badge>
              <Badge color="lime" variant="filled">EG10</Badge>
              <Badge color="lime" variant="filled">MEG30</Badge>
              <Badge color="green" variant="filled">PG50</Badge>
              <Badge color="green" variant="filled">MPG30</Badge>
            </Group>
            <Text size="sm" mt="xs">
              <code>EG</code>/<code>MEG</code>/<code>EthyleneGlycol</code> →
              ethylene glycol, <code>PG</code>/<code>MPG</code>/<code>PropyleneGlycol</code>
              {' '}→ propylene glycol. Example:{' '}
              <code>rho = Density(EG50, T=20 [C], P=1 [atm])</code> for a 50/50
              ethylene-glycol / water mix; change <code>50</code> to any 1–99 for
              a different blend (e.g. <code>EG10</code> for 10/90).
            </Text>

            <Title order={3} mt="sm">Available Property Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>SI Unit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>Temperature</Code></Table.Td>
                  <Table.Td>Absolute Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Pressure</Code></Table.Td>
                  <Table.Td>Absolute Pressure</Table.Td>
                  <Table.Td>Pa</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Enthalpy</Code></Table.Td>
                  <Table.Td>Specific Enthalpy</Table.Td>
                  <Table.Td>J/kg</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Entropy</Code></Table.Td>
                  <Table.Td>Specific Entropy</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>IntEnergy</Code></Table.Td>
                  <Table.Td>Specific Internal Energy</Table.Td>
                  <Table.Td>J/kg</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Density</Code></Table.Td>
                  <Table.Td>Mass Density</Table.Td>
                  <Table.Td>kg/m³</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Volume</Code></Table.Td>
                  <Table.Td>Specific Volume (1 / Density)</Table.Td>
                  <Table.Td>m³/kg</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Quality</Code></Table.Td>
                  <Table.Td>Vapor quality (vapor mass fraction)</Table.Td>
                  <Table.Td>dimensionless (0 to 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cp</Code> or <Code>specheat</Code></Table.Td>
                  <Table.Td>Specific heat at constant pressure</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cv</Code></Table.Td>
                  <Table.Td>Specific heat at constant volume</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Viscosity</Code></Table.Td>
                  <Table.Td>Dynamic Viscosity</Table.Td>
                  <Table.Td>Pa-s</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Conductivity</Code></Table.Td>
                  <Table.Td>Thermal Conductivity</Table.Td>
                  <Table.Td>W/m-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Soundspeed</Code></Table.Td>
                  <Table.Td>Speed of Sound</Table.Td>
                  <Table.Td>m/s</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Input Indicators</Title>
            <Text size="sm">
              To query a state, use the following indicators as names:
              <br/>
              - <Code>T</Code>: Temperature
              <br/>
              - <Code>P</Code>: Pressure
              <br/>
              - <Code>H</Code>: Enthalpy
              <br/>
              - <Code>S</Code>: Entropy
              <br/>
              - <Code>U</Code>: Internal Energy
              <br/>
              - <Code>X</Code> or <Code>Q</Code>: Quality (vapor fraction, e.g. <code>x=1</code> for saturated vapor)
              <br/>
              - <Code>V</Code>, <Code>D</Code>, or <Code>Rho</Code>: density or specific volume
            </Text>

            <Title order={3} mt="sm">Ideal Gases (Chemical Formulas)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Spelled chemical formulas select <strong>ideal-gas</strong> property routines whose enthalpy
              is referenced to the <strong>enthalpy of formation at 298.15 K, 1 atm</strong> — the
              convention that makes combustion energy balances work directly.{' '}
              <code>Enthalpy(CO2, T=298.15)</code> returns −8941.6 kJ/kg, not 0. Full names
              (Nitrogen, CarbonDioxide, Methane) keep the real-fluid CoolProp models above.
            </Text>
            <Group gap="xs">
              <Badge color="orange" variant="filled">N2</Badge>
              <Badge color="orange" variant="filled">O2</Badge>
              <Badge color="orange" variant="filled">CO2</Badge>
              <Badge color="orange" variant="filled">CO</Badge>
              <Badge color="orange" variant="filled">H2O</Badge>
              <Badge color="orange" variant="filled">H2</Badge>
              <Badge color="orange" variant="filled">CH4</Badge>
              <Badge color="orange" variant="filled">C2H6</Badge>
              <Badge color="orange" variant="filled">C3H8</Badge>
              <Badge color="orange" variant="filled">C4H10</Badge>
              <Badge color="orange" variant="filled">C2H4</Badge>
              <Badge color="orange" variant="filled">C2H2</Badge>
              <Badge color="orange" variant="filled">SO2</Badge>
              <Badge color="orange" variant="filled">NO</Badge>
              <Badge color="orange" variant="filled">NO2</Badge>
            </Group>
            <Text size="sm" style={{ lineHeight: 1.6 }}>
              Ideal-gas enthalpy depends on temperature only: <code>h = Enthalpy(N2, T=1000)</code>.
              Entropy is absolute (third law) and needs the pressure:{' '}
              <code>s = Entropy(N2, T=400, P=101325)</code>. Also available:{' '}
              <Code>IntEnergy(gas, T=...)</Code>, <Code>Cp</Code>/<Code>Cv(gas, T=...)</Code>,{' '}
              <Code>Volume(gas, T=..., P=...)</Code>, and the inverses{' '}
              <Code>Temperature(gas, h=...)</Code> and <Code>Temperature(gas, s=..., P=...)</Code>.
              Specific heats use standard cubic polynomial fits, valid through flame
              temperatures — far beyond the real-fluid equations of state.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`{ Adiabatic flame temperature with ideal-gas functions }
{ CH4 + 2 O2 + 7.52 N2 -> CO2 + 2 H2O + 7.52 N2; per kmol of fuel }
M_ch4 = 16.043
M_o2 = 31.999
M_n2 = 28.013
M_co2 = 44.01
M_h2o = 18.015
T_in = 298.15 [K]
H_react = 1 * M_ch4 * Enthalpy(CH4, T=T_in) / 1000 + 2 * M_o2 * Enthalpy(O2, T=T_in) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_in) / 1000
H_prod = 1 * M_co2 * Enthalpy(CO2, T=T_flame) / 1000 + 2 * M_h2o * Enthalpy(H2O, T=T_flame) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_flame) / 1000
H_react = H_prod`} />
              <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                {`{ Adiabatic flame temperature with ideal-gas functions }
{ CH4 + 2 O2 + 7.52 N2 -> CO2 + 2 H2O + 7.52 N2; per kmol of fuel }
M_ch4 = 16.043
M_o2 = 31.999
M_n2 = 28.013
M_co2 = 44.01
M_h2o = 18.015
T_in = 298.15 [K]
H_react = 1 * M_ch4 * Enthalpy(CH4, T=T_in) / 1000 + 2 * M_o2 * Enthalpy(O2, T=T_in) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_in) / 1000
H_prod = 1 * M_co2 * Enthalpy(CO2, T=T_flame) / 1000 + 2 * M_h2o * Enthalpy(H2O, T=T_flame) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_flame) / 1000
H_react = H_prod`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'humidair':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">10. Psychrometrics (AirH2O / Humid Air)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Psychrometric calculations (heating, cooling, and humidifying moist air) are a core pillar of HVAC engineering. frees provides dedicated functions for moist air by calling the specialized <code>AirH2O</code> (or <code>HumidAir</code>) database.
            </Text>

            <Title order={3}>The 3-Indicator Requirement</Title>
            <Text>
              Unlike pure fluids (which require 2 properties), moist air has an additional degree of freedom: the amount of water vapor. Therefore, you must specify exactly **three** indicators. Typically, one of these is the absolute pressure <Code>P</Code>.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`P_atm = 101325 [Pa]\nT_db = 25 [C]\nRH = 0.60 { 60% relative humidity }\n\nh = Enthalpy(AirH2O, T=T_db, P=P_atm, R=RH)\nw = HumRat(AirH2O, T=T_db, P=P_atm, R=RH)\nT_wb = WetBulb(AirH2O, T=T_db, P=P_atm, R=RH)`} />
              <Code block style={{ background: 'transparent' }}>
                {`P_atm = 101325 [Pa]
T_db = 25 [C]
RH = 0.60 { 60% relative humidity }

h = Enthalpy(AirH2O, T=T_db, P=P_atm, R=RH)
w = HumRat(AirH2O, T=T_db, P=P_atm, R=RH)
T_wb = WetBulb(AirH2O, T=T_db, P=P_atm, R=RH)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Available Psychrometric Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>SI Unit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>Enthalpy</Code></Table.Td>
                  <Table.Td>Enthalpy per unit mass of **dry air**</Table.Td>
                  <Table.Td>J/kg-dry-air</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Entropy</Code></Table.Td>
                  <Table.Td>Entropy per unit mass of **dry air**</Table.Td>
                  <Table.Td>J/kg-dry-air-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Temperature</Code></Table.Td>
                  <Table.Td>Dry-bulb Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Volume</Code></Table.Td>
                  <Table.Td>Specific volume of mixture per mass of **dry air**</Table.Td>
                  <Table.Td>m³/kg-dry-air</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>HumRat</Code></Table.Td>
                  <Table.Td>Humidity Ratio (mass of water / mass of dry air)</Table.Td>
                  <Table.Td>kg-water/kg-dry-air</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>RelHum</Code></Table.Td>
                  <Table.Td>Relative Humidity</Table.Td>
                  <Table.Td>dimensionless (0 to 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>WetBulb</Code></Table.Td>
                  <Table.Td>Wet-bulb Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>DewPoint</Code></Table.Td>
                  <Table.Td>Dew-point Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cp</Code> or <Code>specheat</Code></Table.Td>
                  <Table.Td>Specific heat capacity of moist air per mass of dry air</Table.Td>
                  <Table.Td>J/kg-dry-air-K</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Psychrometric Input Indicators</Title>
            <Text size="sm">
              Define the state using these letters:
              <br/>
              - <Code>T</Code>: Dry-bulb Temperature
              <br/>
              - <Code>P</Code>: Total Pressure
              <br/>
              - <Code>H</Code>: Enthalpy
              <br/>
              - <Code>S</Code>: Entropy
              <br/>
              - <Code>V</Code>: Specific volume
              <br/>
              - <Code>W</Code>: Humidity ratio (humidity ratio)
              <br/>
              - <Code>R</Code> or <Code>RH</Code>: Relative humidity
              <br/>
              - <Code>B</Code> or <Code>Twb</Code>: Wet-bulb temperature
              <br/>
              - <Code>D</Code> or <Code>Tdp</Code>: Dew-point temperature
            </Text>
          </Stack>
        );
      case 'calculus':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">11. Numerical Integration (ODEs & Calculus)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frees includes equation-based calculus solvers that run numerical integration. You can compute integrals and solve systems containing first-order Ordinary Differential Equations (ODEs) alongside standard algebraic equations.
            </Text>

            <Title order={3}>Syntax</Title>
            <Text>
              To integrate an expression, use the built-in <Code>Integral</Code> function, which must appear **alone** on one side of an equation:
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`Result = Integral(IntegrandExpression, IntegrationVar, LowerLimit, UpperLimit [, StepSize])`}</Code>
            </Paper>

            <Title order={3} mt="sm">Theoretical Foundation</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The integration variable (e.g. <code>t</code>) is stepped from the lower limit to the upper limit. At each step, the solver treats <code>t</code> as a temporary constant and solves the remaining algebraic equations in the system. The integrand expression is then evaluated, and accumulation is computed using a **second-order predictor-corrector** (Euler predictor, trapezoidal corrector) scheme.
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item><strong>Adaptive Step Sizing:</strong> If the 5th argument is omitted, frees automatically varies the step size to satisfy a relative error tolerance of 1e-6.</List.Item>
              <List.Item><strong>Fixed Step Sizing:</strong> If you supply a positive number as the 5th argument, frees forces the solver to take exactly that step size.</List.Item>
            </List>

            <Title order={3} mt="sm">Solving first-order ODEs</Title>
            <Text>
              An ODE dy/dt = f(t, y) with initial condition y(t0) = y0 can be modeled as:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`y = y0 + Integral(dydt, t, 0, 5)\ndydt = y * cos(t)\ny0 = 1`} />
              <Code block style={{ background: 'transparent' }}>
                {`y = y0 + Integral(dydt, t, 0, 5)
dydt = y * cos(t)
y0 = 1`}
              </Code>
            </Paper>
            <Text size="sm">
              The analytical solution is y(t) = exp(sin(t)). At t = 5, the solver will converge to y = 0.3833.
            </Text>
          </Stack>
        );
      case 'complex':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">12. Complex Number Arithmetic</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Electrical, vibration, and control engineering models frequently rely on complex number arithmetic. frees supports full complex variables when **Complex Mode** is active.
            </Text>

            <Title order={3}>Activating Complex Mode</Title>
            <Text>
              You can toggle Complex Mode using the action bar or settings. Once active, frees automatically:
              <br/>
              1. Treats every variable as having a real component (suffix <code>_r</code>) and an imaginary component (suffix <code>_i</code>).
              <br/>
              2. Doubles the system dimensions (a system of $N$ variables becomes a simultaneous system of $2N$ real equations).
            </Text>

            <Title order={3} mt="sm">Imaginary Constants</Title>
            <Text>
              Enter imaginary numbers using the notation <Code>1i</Code> or <Code>1j</Code>:
            </Text>
            <Paper withBorder p="sm" bg="dark.8"><Code block>{`z1 = 3 + 4i\nz2 = 5 - 2j`}</Code></Paper>

            <Title order={3} mt="sm">Supported Complex Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Function</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>real(z)</Code></Table.Td>
                  <Table.Td>Extracts the real part of z</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>imag(z)</Code></Table.Td>
                  <Table.Td>Extracts the imaginary part of z</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>abs(z)</Code></Table.Td>
                  <Table.Td>Computes the magnitude / absolute value of complex z</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sin(z), cos(z)</Code></Table.Td>
                  <Table.Td>Complex sine and cosine</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>exp(z)</Code></Table.Td>
                  <Table.Td>Complex exponential ($e^z$)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>ln(z)</Code></Table.Td>
                  <Table.Td>Complex natural logarithm</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sqrt(z)</Code></Table.Td>
                  <Table.Td>Complex square root</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Alert color="indigo" title="Finding Phase Angles without atan2">
              Since <code>atan2</code> is not supported directly in complex mode, you can solve for a real phase angle <code>theta</code> declaratively using the solver itself:
              <Paper withBorder p="sm" mt="xs" bg="dark.9">
                <Code block>{`z = 3 + 4i\nreal(z) = abs(z) * cos(theta)\nimag(z) = abs(z) * sin(theta)`}</Code>
              </Paper>
              The solver will solve for <code>theta</code> in radians simultaneously!
            </Alert>
          </Stack>
        );
      case 'examples':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">13. Engineering Examples & Case Studies</Title>
            <Text>
              These real-world examples highlight how students and engineers can use frees to model multi-domain physics and thermodynamic cycles.
            </Text>

            <Accordion variant="separated">
              <Accordion.Item value="mech">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Mechanical Engineering: Ideal Rankine Steam Cycle</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    This example analyzes an ideal Rankine steam power cycle, computing state enthalpies, turbine work, pump work, thermal efficiency, and mass flow rate.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Ideal Rankine Steam Power Cycle }\nP_high = 8000 [kPa]  { Boiler pressure }\nP_low = 10 [kPa]     { Condenser pressure }\nT_boiler = 500 [C]   { Boiler temperature }\neta_turb = 0.85      { Isentropic turbine efficiency }\neta_pump = 0.90      { Isentropic pump efficiency }\nW_dot_net = 10000 [kW] { Target net power output }\n\n{ State 1: Turbine Inlet (Superheated Steam) }\nh[1] = Enthalpy(Water, P=P_high, T=T_boiler)\ns[1] = Entropy(Water, P=P_high, T=T_boiler)\nT[1] = T_boiler\n\n{ State 2s: Isentropic Turbine Exit }\ns_2s = s[1]\nh_2s = Enthalpy(Water, P=P_low, s=s_2s)\n\n{ State 2: Actual Turbine Exit }\nh[2] = h[1] - eta_turb * (h[1] - h_2s)\ns[2] = Entropy(Water, P=P_low, h=h[2])\nT[2] = Temperature(Water, P=P_low, h=h[2])\n\n{ State 3: Condenser Exit (Saturated Liquid) }\nh[3] = Enthalpy(Water, P=P_low, x=0)\nv[3] = Volume(Water, P=P_low, x=0)\ns[3] = Entropy(Water, P=P_low, x=0)\nT[3] = Temperature(Water, P=P_low, x=0)\n\n{ State 4s: Isentropic Pump Exit }\ns_4s = s[3]\nh_4s = Enthalpy(Water, P=P_high, s=s_4s)\n\n{ State 4: Actual Pump Exit }\nh[4] = h[3] + (h_4s - h[3]) / eta_pump\ns[4] = Entropy(Water, P=P_high, h=h[4])\nT[4] = Temperature(Water, P=P_high, h=h[4])\n\n{ Work and Heat Transfers }\nw_turb = h[1] - h[2]\nw_pump = h[4] - h[3]\nq_boiler = h[1] - h[4]\nq_cond = h[2] - h[3]\n\n{ Performance Parameters }\nw_net = w_turb - w_pump\neta_th = w_net / q_boiler * 100\n\n{ Mass flow rate needed for 10 MW net power }\nW_dot_net = m_dot * w_net`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Ideal Rankine Steam Power Cycle }
P_high = 8000 [kPa]  { Boiler pressure }
P_low = 10 [kPa]     { Condenser pressure }
T_boiler = 500 [C]   { Boiler temperature }
eta_turb = 0.85      { Isentropic turbine efficiency }
eta_pump = 0.90      { Isentropic pump efficiency }
W_dot_net = 10000 [kW] { Target net power output }

{ State 1: Turbine Inlet (Superheated Steam) }
h[1] = Enthalpy(Water, P=P_high, T=T_boiler)
s[1] = Entropy(Water, P=P_high, T=T_boiler)
T[1] = T_boiler

{ State 2s: Isentropic Turbine Exit }
s_2s = s[1]
h_2s = Enthalpy(Water, P=P_low, s=s_2s)

{ State 2: Actual Turbine Exit }
h[2] = h[1] - eta_turb * (h[1] - h_2s)
s[2] = Entropy(Water, P=P_low, h=h[2])
T[2] = Temperature(Water, P=P_low, h=h[2])

{ State 3: Condenser Exit (Saturated Liquid) }
h[3] = Enthalpy(Water, P=P_low, x=0)
v[3] = Volume(Water, P=P_low, x=0)
s[3] = Entropy(Water, P=P_low, x=0)
T[3] = Temperature(Water, P=P_low, x=0)

{ State 4s: Isentropic Pump Exit }
s_4s = s[3]
h_4s = Enthalpy(Water, P=P_high, s=s_4s)

{ State 4: Actual Pump Exit }
h[4] = h[3] + (h_4s - h[3]) / eta_pump
s[4] = Entropy(Water, P=P_high, h=h[4])
T[4] = Temperature(Water, P=P_high, h=h[4])

{ Work and Heat Transfers }
w_turb = h[1] - h[2]
w_pump = h[4] - h[3]
q_boiler = h[1] - h[4]
q_cond = h[2] - h[3]

{ Performance Parameters }
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100

{ Mass flow rate needed for 10 MW net power }
W_dot_net = m_dot * w_net`}
                    </Code>
                  </Paper>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="elec">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Electrical Engineering: AC Load Power Factor Correction</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    This example analyzes a parallel inductive load (like an electric motor) and determines the capacitor value needed to correct the power factor from 0.70 to a target of 0.98. Enable **Complex Mode** for this example.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ AC Power Factor Correction - Enable Complex Mode! }\nV_rms = 230 + 0i      { Grid Voltage }\nf = 50 [Hz]           { Grid Frequency }\nomega = 2 * pi * f    { Angular Frequency }\n\n{ Inductive Load (e.g. Motor) }\nR_load = 15 [ohm]\nL_load = 0.05 [H]\nZ_load = R_load + 1i * omega * L_load\n\n{ Uncorrected Circuit Analysis }\nI_load = V_rms / Z_load\nS_uncorrected = V_rms * (real(I_load) - 1i * imag(I_load)) { V * conj(I) }\nP_active = real(S_uncorrected)\nQ_reactive_old = imag(S_uncorrected)\nPF_old = P_active / abs(S_uncorrected)\n\n{ Target Power Factor (0.98) }\nPF_new = 0.98\nS_corrected_mag = P_active / PF_new\nQ_reactive_new = sqrt(S_corrected_mag^2 - P_active^2)\n\n{ Reactive power needed from Capacitor }\nQ_c = Q_reactive_old - Q_reactive_new\n\n{ Capacitor impedance and capacitance }\nQ_c = abs(V_rms)^2 / abs(Z_c)\nZ_c = -1i / (omega * C_corr)`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ AC Power Factor Correction - Enable Complex Mode! }
V_rms = 230 + 0i      { Grid Voltage }
f = 50 [Hz]           { Grid Frequency }
omega = 2 * pi * f    { Angular Frequency }

{ Inductive Load (e.g. Motor) }
R_load = 15 [ohm]
L_load = 0.05 [H]
Z_load = R_load + 1i * omega * L_load

{ Uncorrected Circuit Analysis }
I_load = V_rms / Z_load
S_uncorrected = V_rms * (real(I_load) - 1i * imag(I_load)) { V * conj(I) }
P_active = real(S_uncorrected)
Q_reactive_old = imag(S_uncorrected)
PF_old = P_active / abs(S_uncorrected)

{ Target Power Factor (0.98) }
PF_new = 0.98
S_corrected_mag = P_active / PF_new
Q_reactive_new = sqrt(S_corrected_mag^2 - P_active^2)

{ Reactive power needed from Capacitor }
Q_c = Q_reactive_old - Q_reactive_new

{ Capacitor impedance and capacitance }
Q_c = abs(V_rms)^2 / abs(Z_c)
Z_c = -1i / (omega * C_corr)`}
                    </Code>
                  </Paper>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="circuit-matrix">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Electrical Engineering: DC Mesh Analysis with Matrix Algebra</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    This example applies Kirchhoff's Voltage Law to a three-mesh resistive network with two voltage sources. The mesh equations are written directly as a resistance matrix and solved in one step with <Code>SolveLinear</Code>.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ DC Circuit Mesh Analysis via Matrix Algebra }\nV_s1 = 10 [V]   { Source driving mesh 1 }\nV_s2 = 8 [V]    { Source driving mesh 3 }\n\nR_1 = 2 [ohm];  R_2 = 4 [ohm];  R_3 = 2 [ohm]\nR_4 = 6 [ohm];  R_5 = 4 [ohm]\n\n{ Resistance matrix from Kirchhoff's Voltage Law }\n{ Diagonal: total resistance around each mesh. Off-diagonal: -(shared resistance) }\nR[1,1] = R_1 + R_2;  R[1,2] = -R_2;             R[1,3] = 0\nR[2,1] = -R_2;       R[2,2] = R_2 + R_3 + R_4;  R[2,3] = -R_4\nR[3,1] = 0;          R[3,2] = -R_4;             R[3,3] = R_4 + R_5\n\n{ Source vector: net EMF driving each mesh }\nV[1..3] = [V_s1, 0, V_s2]\n\n{ Solve R * I = V for the mesh currents }\nI[1..3] = SolveLinear(R[1..3,1..3], V[1..3])\n\n{ Branch currents through the shared resistors }\nI_R2 = I[1] - I[2]\nI_R4 = I[2] - I[3]\n\n{ Energy check: delivered power equals dissipated power }\nP_delivered = V_s1 * I[1] + V_s2 * I[3]`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ DC Circuit Mesh Analysis via Matrix Algebra }
V_s1 = 10 [V]   { Source driving mesh 1 }
V_s2 = 8 [V]    { Source driving mesh 3 }

R_1 = 2 [ohm];  R_2 = 4 [ohm];  R_3 = 2 [ohm]
R_4 = 6 [ohm];  R_5 = 4 [ohm]

{ Resistance matrix from Kirchhoff's Voltage Law }
{ Diagonal: total resistance around each mesh. Off-diagonal: -(shared resistance) }
R[1,1] = R_1 + R_2;  R[1,2] = -R_2;             R[1,3] = 0
R[2,1] = -R_2;       R[2,2] = R_2 + R_3 + R_4;  R[2,3] = -R_4
R[3,1] = 0;          R[3,2] = -R_4;             R[3,3] = R_4 + R_5

{ Source vector: net EMF driving each mesh }
V[1..3] = [V_s1, 0, V_s2]

{ Solve R * I = V for the mesh currents }
I[1..3] = SolveLinear(R[1..3,1..3], V[1..3])

{ Branch currents through the shared resistors }
I_R2 = I[1] - I[2]
I_R4 = I[2] - I[3]

{ Energy check: delivered power equals dissipated power }
P_delivered = V_s1 * I[1] + V_s2 * I[3]`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    The solver expands SolveLinear into the three KVL equations and finds the mesh currents I[1] = 3 A, I[2] = 2 A, I[3] = 2 A, so the shared resistor R_4 carries no current and the sources deliver 46 W. The same pattern scales to any n×n nodal or mesh formulation.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="vibration-eigen">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Mechanical Vibrations: Natural Frequencies & Mode Shapes (Eigenvalues)</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    Two equal carts coupled by three springs form a classic 2-DOF free-vibration problem. The natural frequencies are the square roots of the eigenvalues of the dynamic matrix $D = K/m$, and the eigenvector columns are the mode shapes.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Two-DOF Vibration: Natural Frequencies & Mode Shapes }\nm = 10 [kg]       { Mass of each cart }\nk = 1000 [N/m]    { Stiffness of each of the three springs }\n\n{ Stiffness matrix for two equal masses coupled by three springs }\nK[1,1] = 2*k;  K[1,2] = -k\nK[2,1] = -k;   K[2,2] = 2*k\n\n{ Dynamic matrix D = K/m (equal masses) }\nD[1,1] = K[1,1]/m; D[1,2] = K[1,2]/m\nD[2,1] = K[2,1]/m; D[2,2] = K[2,2]/m\n\n{ Eigenvalues are omega^2; columns of Phi are the mode shapes }\nCALL Eigen(D[1..2,1..2] : lambda[1..2], Phi[1..2,1..2])\n\nomega[1] = sqrt(lambda[1]);  omega[2] = sqrt(lambda[2])\nf[1] = omega[1]/(2*pi);      f[2] = omega[2]/(2*pi)`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Two-DOF Vibration: Natural Frequencies & Mode Shapes }
m = 10 [kg]       { Mass of each cart }
k = 1000 [N/m]    { Stiffness of each of the three springs }

{ Stiffness matrix for two equal masses coupled by three springs }
K[1,1] = 2*k;  K[1,2] = -k
K[2,1] = -k;   K[2,2] = 2*k

{ Dynamic matrix D = K/m (equal masses) }
D[1,1] = K[1,1]/m; D[1,2] = K[1,2]/m
D[2,1] = K[2,1]/m; D[2,2] = K[2,2]/m

{ Eigenvalues are omega^2; columns of Phi are the mode shapes }
CALL Eigen(D[1..2,1..2] : lambda[1..2], Phi[1..2,1..2])

omega[1] = sqrt(lambda[1]);  omega[2] = sqrt(lambda[2])
f[1] = omega[1]/(2*pi);      f[2] = omega[2]/(2*pi)`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    Eigenvalues come back ascending: lambda = 100 and 300, so omega = 10 and 17.32 rad/s (f = 1.59 and 2.76 Hz). The first mode shape (0.707, 0.707) has both carts moving in phase; the second (0.707, −0.707) is the anti-phase mode where the middle spring works.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="stress-eigen">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Solid Mechanics: Principal Stresses from the Stress Tensor (Eigenvalues)</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    The principal stresses of a plane stress state are the eigenvalues of the Cauchy stress tensor, and the principal directions are its eigenvectors — no Mohr's circle construction needed.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Principal Stresses of a 2D Stress State }\nsigma_x = 60 [MPa]\nsigma_y = 20 [MPa]\ntau_xy = 15 [MPa]\n\n{ Cauchy stress tensor }\nS[1,1] = sigma_x;  S[1,2] = tau_xy\nS[2,1] = tau_xy;   S[2,2] = sigma_y\n\n{ Principal stresses = eigenvalues; principal directions = eigenvectors }\nCALL Eigen(S[1..2,1..2] : sigma_p[1..2], N[1..2,1..2])\n\n{ Maximum in-plane shear stress and major principal angle }\ntau_max = (sigma_p[2] - sigma_p[1]) / 2\ntheta_p = arctan(N[2,2]/N[1,2]) * 180/pi`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Principal Stresses of a 2D Stress State }
sigma_x = 60 [MPa]
sigma_y = 20 [MPa]
tau_xy = 15 [MPa]

{ Cauchy stress tensor }
S[1,1] = sigma_x;  S[1,2] = tau_xy
S[2,1] = tau_xy;   S[2,2] = sigma_y

{ Principal stresses = eigenvalues; principal directions = eigenvectors }
CALL Eigen(S[1..2,1..2] : sigma_p[1..2], N[1..2,1..2])

{ Maximum in-plane shear stress and major principal angle }
tau_max = (sigma_p[2] - sigma_p[1]) / 2
theta_p = arctan(N[2,2]/N[1,2]) * 180/pi`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    With sigma_x = 60, sigma_y = 20, tau_xy = 15 MPa the principal stresses are 15 and 65 MPa (ascending), tau_max = 25 MPa, and the major principal axis sits at theta_p = 18.43° — matching the Mohr's circle result tan(2θ) = 2τ/(σx−σy). Stresses solve in SI (Pa) per the frees SI-always rule.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="chem">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Chemical Engineering: Adiabatic Flame Temperature</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    Finds the adiabatic flame temperature of methane ($CH_4$) burned with 100% theoretical air, balancing stoichiometric enthalpies and variable specific heat capacities.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Adiabatic Flame Temp - Methane Combustion }\nT_reactants = 298.15 [K]  { Inlet temp }\n\n{ Enthalpies of formation in kJ/kmol }\nhf_ch4 = -74850\nhf_o2 = 0\nhf_n2 = 0\nhf_co2 = -393520\nhf_h2o = -241820\n\n{ Enthalpy of reactants at T_reactants (sensible enthalpy is 0) }\nH_reactants = 1 * hf_ch4 + 2 * hf_o2 + 7.52 * hf_n2\n\n{ Enthalpy of products at Adiabatic Flame Temp (T_flame) }\n{ Specific heats modeled as polynomial function of T }\n{ Cp = A + B*T + C*T^2 + D*T^3 }\n\n{ Sensible enthalpy integrations from reference 298.15K }\ndH_co2 = Integral(Cp_co2, T, 298.15, T_flame)\ndH_h2o = Integral(Cp_h2o, T, 298.15, T_flame)\ndH_n2 = Integral(Cp_n2, T, 298.15, T_flame)\n\n{ Sensible heats in kJ/kmol-K }\nCp_co2 = 22.26 + 5.981e-2 * T - 3.501e-5 * T^2 + 7.469e-9 * T^3\nCp_h2o = 32.24 + 0.1923e-2 * T + 1.055e-5 * T^2 - 3.595e-9 * T^3\nCp_n2 = 28.90 - 0.1571e-2 * T + 0.8081e-5 * T^2 - 2.873e-9 * T^3\n\nH_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)\n\n{ Energy Balance: H_reactants = H_products }\nH_reactants = H_products`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Adiabatic Flame Temp - Methane Combustion }
T_reactants = 298.15 [K]  { Inlet temp }

{ Enthalpies of formation in kJ/kmol }
hf_ch4 = -74850
hf_o2 = 0
hf_n2 = 0
hf_co2 = -393520
hf_h2o = -241820

{ Enthalpy of reactants at T_reactants (sensible enthalpy is 0) }
H_reactants = 1 * hf_ch4 + 2 * hf_o2 + 7.52 * hf_n2

{ Enthalpy of products at Adiabatic Flame Temp (T_flame) }
{ Specific heats modeled as polynomial function of T }
{ Cp = A + B*T + C*T^2 + D*T^3 }

{ Sensible enthalpy integrations from reference 298.15K }
dH_co2 = Integral(Cp_co2, T, 298.15, T_flame)
dH_h2o = Integral(Cp_h2o, T, 298.15, T_flame)
dH_n2 = Integral(Cp_n2, T, 298.15, T_flame)

{ Sensible heats in kJ/kmol-K }
Cp_co2 = 22.26 + 5.981e-2 * T - 3.501e-5 * T^2 + 7.469e-9 * T^3
Cp_h2o = 32.24 + 0.1923e-2 * T + 1.055e-5 * T^2 - 3.595e-9 * T^3
Cp_n2 = 28.90 - 0.1571e-2 * T + 0.8081e-5 * T^2 - 2.873e-9 * T^3

H_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)

{ Energy Balance: H_reactants = H_products }
H_reactants = H_products`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    The upper limit T_flame is an unknown of the system: frees inlines the c_p polynomials into the integrals and solves the energy balance directly (about 2345 K, matching the ideal-gas table data) with no manual guesses needed.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              {CYCLE_EXAMPLES.map((ex) => (
                <Accordion.Item value={ex.value} key={ex.value}>
                  <Accordion.Control>
                    <Text fw={600} c="cyan.4">{ex.title}</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Text size="sm" mb="sm">{ex.description}</Text>
                    <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                      <CopyButton code={ex.code} />
                      <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                        {ex.code}
                      </Code>
                    </Paper>
                    <Text size="xs" mt="xs" c="dimmed">{ex.note}</Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        );
      case 'api':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">14. Solver Reference & Troubleshooting API</Title>
            <Text style={{ lineHeight: 1.6 }}>
              This section is a technical reference for debugging failed systems, syntax limitations, and error codes in frees.
            </Text>

            <Accordion variant="separated">
              <Accordion.Item value="dof">
                <Accordion.Control><strong>Degrees of Freedom (DOF) Mismatch</strong></Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.6 }}>
                    This error occurs when the number of independent equations does not match the number of unique variables.
                    <br/><br/>
                    - <strong>Underspecified:</strong> There are fewer equations than variables (e.g. 2 equations, 3 variables). The system has infinite solutions. To fix: specify boundary values for one of the variables or write another equation.
                    <br/>
                    - <strong>Overspecified:</strong> There are more equations than variables. The system is over-determined. To fix: remove redundant equations or define the variables that were assumed constants.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="conv">
                <Accordion.Control><strong>Newton Solver Divergence / "Did Not Converge"</strong></Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.6 }}>
                    Newton's method is extremely fast but can fail if guess values are poor, or if the equations contain mathematical singularities.
                    <br/><br/>
                    - <strong>Singularities / Domain Errors:</strong> If a variable becomes negative during intermediate steps, functions like <code>sqrt()</code> or <code>ln()</code> will throw domain errors. Set **lower bounds** (e.g. 0.0001) to keep values safe.
                    <br/>
                    - <strong>Divide by Zero:</strong> Avoid expressions like <code>y = 1 / x</code> if <code>x</code> starts with a guess value of 0. Change the initial guess to a non-zero value.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="warnings">
                <Accordion.Control><strong>Understanding Warnings vs Errors</strong></Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.6 }}>
                    - <strong>Error:</strong> Prevents compilation or solving (e.g., syntax errors, DOF mismatch, division by zero). The solver halts.
                    <br/>
                    - <strong>Warning:</strong> The solver successfully completes and provides math solutions, but issues a warning (e.g., unit dimension inconsistencies). Always check warnings to verify that your equations represent correct physical relationships.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        );
      case 'optimization':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">15. Multi-Variable Optimization & Advanced Plotting</Title>
            
            <Title order={3} mt="sm">Multi-Variable Optimization</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              frees supports optimizing a target objective variable by adjusting one or more independent (decision) variables within specified bounds.
            </Text>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              You can choose from three optimization algorithms depending on your problem:
            </Text>
            <List spacing="xs" size="sm" mt="xs" style={{ paddingLeft: '20px' }}>
              <List.Item>
                <strong>Brent's Method:</strong> Best for one-dimensional optimization. Requires a single independent variable and finite bounds. Extremely fast and guarantees convergence for unimodal functions.
              </List.Item>
              <List.Item>
                <strong>Nelder-Mead Simplex:</strong> A derivative-free optimization method suitable for multi-variable problems. It works by constructing a simplex (a generalized triangle) and moving it towards the minimum/maximum. Highly robust for non-smooth or noisy objectives.
              </List.Item>
              <List.Item>
                <strong>BOBYQA (Bound Optimization BY Quadratic Approximation):</strong> An advanced algorithm for multi-variable bound-constrained optimization. It iteratively builds a quadratic model of the objective function. Extremely efficient and requires fewer function evaluations than Simplex for smooth functions.
              </List.Item>
            </List>

            <Alert color="blue" title="Optimization Setup" mt="xs">
              To run an optimization, click the <strong>Min/Max</strong> (target) icon in the left rail. Choose your objective variable, select one or more independent variables, give each its bounds, pick the method (Brent for one variable, Nelder-Mead Simplex or BOBYQA for several), optionally add constraints, and click <strong>Minimize</strong>/<strong>Maximize</strong>.
            </Alert>

            <Title order={3} mt="md">Constrained Optimization (Barrier & Augmented Lagrangian)</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Beyond simple variable bounds, the Min/Max dialog accepts <strong>constraints</strong> — one per
              line — that the optimum must satisfy. Each constraint is an expression compared against a numeric
              constant:
            </Text>
            <List spacing="xs" size="sm" mt="xs" style={{ paddingLeft: '20px' }}>
              <List.Item>
                <strong>Inequalities</strong> (<Code>x + y &lt;= 10</Code>, <Code>m_dot &gt;= 0.5</Code>) are
                enforced with a <strong>log-barrier method</strong>: a term −μ·ln(−g(x)) repels the search from
                the constraint boundary, and μ is tightened geometrically over successive outer iterations.
                Infeasible trial points receive a smooth exterior quadratic penalty so the optimizer can recover
                from an infeasible start.
              </List.Item>
              <List.Item>
                <strong>Equalities</strong> (<Code>x * y = 4</Code>) are enforced with an
                <strong> augmented Lagrangian</strong>: the objective is augmented with λ·h(x) + (ρ/2)·h(x)²,
                and the multiplier λ is updated after each outer iteration until the violation falls below
                tolerance.
              </List.Item>
            </List>
            <Text size="sm" style={{ lineHeight: 1.6 }}>
              Example: maximizing the rectangle area <Code>A = w*h</Code> with <Code>w + h = 10</Code> in the
              equations and the constraint <Code>w &lt;= 3</Code> yields the boundary optimum w = 3, A = 21
              instead of the unconstrained w = 5, A = 25.
            </Text>

            <Title order={3} mt="md">Curve Fitting (Levenberg-Marquardt Least Squares)</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              The <strong>Curve Fit</strong> tool (function icon in the left rail) fits the parameters of a model
              equation to experimental (x, y) data by minimizing the sum of squared residuals with the
              Levenberg-Marquardt algorithm.
            </Text>
            <List spacing="xs" size="sm" mt="xs" style={{ paddingLeft: '20px' }}>
              <List.Item>Enter a model such as <Code>y = a * exp(-b * x) + c</Code> with the dependent variable alone on one side.</List.Item>
              <List.Item>Name the independent variable and the parameters to fit (e.g. <Code>a, b, c</Code>).</List.Item>
              <List.Item>Paste the data points one pair per line (<Code>x y</Code>, separated by spaces, commas, or tabs).</List.Item>
              <List.Item>Optionally give initial guesses (defaults to 1 for every parameter).</List.Item>
            </List>
            <Text size="sm" style={{ lineHeight: 1.6 }}>
              The result reports the fitted parameter values together with the goodness-of-fit measures
              R² and RMSE and the iteration count. Any expression the equation engine understands — including
              special functions like <Code>erf</Code> or <Code>gamma</Code> — can appear in the model.
            </Text>

            <Title order={3} mt="md">Analytical Jacobians</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              The Newton solver differentiates equation blocks <strong>symbolically</strong> whenever every
              equation in the block has a closed-form derivative — including the special functions
              (<Code>erf</Code>, <Code>erfc</Code>, <Code>erfinv</Code>, <Code>gamma</Code>,
              <Code>loggamma</Code>, <Code>beta</Code>, <Code>besselj</Code>, <Code>besseli</Code>) via their
              analytical derivatives (e.g. Γ'(x) = Γ(x)·ψ(x), J'ₙ = (Jₙ₋₁ − Jₙ₊₁)/2). Blocks containing
              constructs without symbolic derivatives (property calls, integrals, procedures) automatically
              fall back to finite-difference Jacobians.
            </Text>

            <Title order={3} mt="md">Advanced Plot Window Extensions</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              The Plot Window features rich data visualization capabilities to analyze parametric sweeps and cycle paths. You can configure and display the following chart styles:
            </Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '180px' }}>Chart Type</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Configuration Requirements</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><strong>Line Chart</strong></Table.Td>
                  <Table.Td>Plots continuous lines joining the data points of parametric runs. Variables with different magnitudes can be assigned to a secondary right Y axis (dual-Y).</Table.Td>
                  <Table.Td>Requires an X-axis variable and one or more Y-axis variables; right-axis variables are optional.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Bar Chart</strong></Table.Td>
                  <Table.Td>Displays discrete rectangular bars grouped or stacked for comparison.</Table.Td>
                  <Table.Td>Requires an X-axis variable and one or more Y-axis variables.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Pie Chart</strong></Table.Td>
                  <Table.Td>Displays proportion slices representing the values of a variable.</Table.Td>
                  <Table.Td>Requires an X-axis variable (categories) and a single Y-axis variable (values).</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Histogram</strong></Table.Td>
                  <Table.Td>Shows the frequency distribution of a variable's values.</Table.Td>
                  <Table.Td>Requires only selecting the variable in the Y-axis variables picker (X-axis is ignored).</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Scatter (Bubble) Chart</strong></Table.Td>
                  <Table.Td>Plots individual points where markers can have a variable size based on a third dimension.</Table.Td>
                  <Table.Td>Requires an X-axis variable, Y-axis variables, and an optional bubble size variable.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>3D Surface Chart</strong></Table.Td>
                  <Table.Td>Renders a 3D mesh surface using three continuous variables.</Table.Td>
                  <Table.Td>Requires X-axis, Y-axis, and Z-axis variables.</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="md">Detailed Examples & Walkthroughs</Title>

            <Card withBorder padding="md" radius="md" bg="dark.8" mt="xs">
              <Text fw={600} size="sm" c="blue.4">Example 1: Multi-Variable Cylinder Surface Area Minimization</Text>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                Suppose we want to design a cylindrical canister that holds exactly 1000 cm³ of fluid. We want to minimize its surface area (to reduce material cost) by adjusting the radius <code>r</code> and height <code>h</code>.
              </Text>
              <Text size="xs" mt="xs" fw={500}>Equations:</Text>
              <Paper withBorder p="xs" bg="dark.9" radius="md" mt="xs" style={{ position: 'relative' }}>
                <CopyButton code={`{ Cylinder Minimization }
V = pi * r^2 * h
A = 2 * pi * r^2 + 2 * pi * r * h`} />
                <Code block style={{ background: 'transparent' }}>
                  {`{ Cylinder Minimization }
V = pi * r^2 * h
A = 2 * pi * r^2 + 2 * pi * r * h`}
                </Code>
              </Paper>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                Note that <code>pi</code> is a built-in constant — writing <code>pi = 3.14159265</code> would
                add an extra equation and overspecify the system. The volume requirement is entered as an
                equality <em>constraint</em> rather than an equation, so that both <code>r</code> and
                <code>h</code> stay free for the optimizer.
              </Text>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                <strong>How to Optimize:</strong>
                <br/>
                1. Paste the equations into the editor and click <strong>Check (F4)</strong>.
                <br/>
                2. Click the <strong>Min/Max</strong> (target) icon in the left rail.
                <br/>
                3. Set the Objective Variable to <code>A</code>, and set Goal to <strong>Minimize</strong>.
                <br/>
                4. Add Independent Variables <code>r</code> and <code>h</code> and give each the bounds 1 to 20.
                <br/>
                5. Select <strong>Nelder-Mead Simplex</strong> or <strong>BOBYQA</strong> as the method (Brent is only available with a single variable).
                <br/>
                6. Enter <code>V = 1000</code> in the Constraints box.
                <br/>
                7. Click <strong>Minimize</strong>. The solver finds the optimum dimensions <code>r ≈ 5.42 cm</code> and <code>h ≈ 10.84 cm</code> (h = 2r), yielding the minimal surface area <code>A ≈ 553.58 cm²</code>.
              </Text>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                <strong>1-D alternative:</strong> keep <code>V = 1000</code> as an equation in the editor
                instead; then the system has a single degree of freedom, and varying only <code>r</code> with
                <strong> Brent's method</strong> reaches the same optimum.
              </Text>
            </Card>

            <Card withBorder padding="md" radius="md" bg="dark.8" mt="sm">
              <Text fw={600} size="sm" c="blue.4">Example 2: Visualizing 3D Thermodynamic Surfaces</Text>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                We can map the relationship between Pressure (P), Specific Volume (v), and Temperature (T) of a substance over a range of states and plot a 3D Surface diagram.
              </Text>
              <Text size="xs" mt="xs" fw={500}>Equations:</Text>
              <Paper withBorder p="xs" bg="dark.9" radius="md" mt="xs" style={{ position: 'relative' }}>
                <CopyButton code={`{ Ideal Gas law grid }
P * v = R * T
R = 0.287 { Air gas constant in kJ/kg-K }`} />
                <Code block style={{ background: 'transparent' }}>
                  {`{ Ideal Gas law grid }
P * v = R * T
R = 0.287 { Air gas constant in kJ/kg-K }`}
                </Code>
              </Paper>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                <strong>How to Plot a 3D Surface:</strong>
                <br/>
                1. Set up a Parametric Table by clicking the <strong>Parametric Table</strong> tab.
                <br/>
                2. Add <code>T</code> and <code>P</code> as table variables, and fill the columns with a grid of values (e.g., T from 300 to 600 K, P from 100 to 500 kPa).
                <br/>
                3. Click <strong>Solve Table</strong>. The solver will calculate the corresponding volumes (<code>v</code>) for every run.
                <br/>
                4. Go to the <strong>Plots</strong> tab, click <strong>Add Plot</strong>, and select <strong>X-Y (parametric table)</strong>.
                <br/>
                5. Set the Chart Type to <strong>3D Surface</strong>.
                <br/>
                6. Configure the variables: set X-axis to <code>T</code>, Y-axis (Value) to <code>P</code>, and Z-axis to <code>v</code>.
                <br/>
                7. Click <strong>Apply</strong>. A fully interactive 3D surface plot will be generated, allowing you to rotate, pan, and hover over individual state values.
              </Text>
            </Card>

            <Card withBorder padding="md" radius="md" bg="dark.8" mt="sm">
              <Text fw={600} size="sm" c="blue.4">Example 3: Container Loading (Bin Packing Continuous Optimization)</Text>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                Suppose we need to load boxes of three different sizes (Small, Medium, Large) into a standard 20 ft shipping container. 
                We want to maximize the total dollar value of the cargo we carry. The container has a volume limit of 33 m³ and a payload weight limit of 20,000 kg.
              </Text>
              <Text size="xs" mt="xs" fw={500}>Parameters:</Text>
              <List spacing="xs" size="xs" mt="xs" style={{ paddingLeft: '20px' }}>
                <List.Item><strong>Box A (Small):</strong> Volume = 0.04 m³, Weight = 10 kg, Value = $100</List.Item>
                <List.Item><strong>Box B (Medium):</strong> Volume = 0.15 m³, Weight = 25 kg, Value = $300</List.Item>
                <List.Item><strong>Box C (Large):</strong> Volume = 0.50 m³, Weight = 60 kg, Value = $800</List.Item>
              </List>
              <Text size="xs" mt="xs" fw={500}>Equations:</Text>
              <Paper withBorder p="xs" bg="dark.9" radius="md" mt="xs" style={{ position: 'relative' }}>
                <CopyButton code={`{ Container Loading Optimization }
{ Box quantities }
{ xA: Small, xB: Medium, xC: Large }

V_total = 0.04 * xA + 0.15 * xB + 0.50 * xC
W_total = 10 * xA + 25 * xB + 60 * xC

value = 100 * xA + 300 * xB + 800 * xC

{ Penalty variables if container volume (33m³) or weight (20t) limits are exceeded }
V_penalty = (V_total > 33) * 10000 * (V_total - 33)^2
W_penalty = (W_total > 20000) * 100 * (W_total - 20000)^2

{ Objective function to maximize }
U = value - V_penalty - W_penalty`} />
                <Code block style={{ background: 'transparent' }}>
                  {`{ Container Loading Optimization }
{ Box quantities }
{ xA: Small, xB: Medium, xC: Large }

V_total = 0.04 * xA + 0.15 * xB + 0.50 * xC
W_total = 10 * xA + 25 * xB + 60 * xC

value = 100 * xA + 300 * xB + 800 * xC

{ Penalty variables if container volume (33m³) or weight (20t) limits are exceeded }
V_penalty = (V_total > 33) * 10000 * (V_total - 33)^2
W_penalty = (W_total > 20000) * 100 * (W_total - 20000)^2

{ Objective function to maximize }
U = value - V_penalty - W_penalty`}
                </Code>
              </Paper>
              <Text size="xs" mt="xs" style={{ lineHeight: 1.6 }}>
                <strong>How to Optimize:</strong>
                <br/>
                1. Paste these equations into the editor and click <strong>Check (F4)</strong>.
                <br/>
                2. Click the <strong>Min/Max</strong> (target) icon in the left rail.
                <br/>
                3. Choose the objective variable <code>U</code>, set Goal to <strong>Maximize</strong>.
                <br/>
                4. Add Independent Variables:
                <br/>
                &nbsp;&nbsp;&nbsp;&nbsp;- <code>xA</code> (bounds 0 to 825)
                <br/>
                &nbsp;&nbsp;&nbsp;&nbsp;- <code>xB</code> (bounds 0 to 220)
                <br/>
                &nbsp;&nbsp;&nbsp;&nbsp;- <code>xC</code> (bounds 0 to 66)
                <br/>
                5. Select <strong>Nelder-Mead Simplex</strong> or <strong>BOBYQA</strong> as the optimizer method.
                <br/>
                6. Click <strong>Optimize</strong>. The continuous solver will automatically allocate quantities to maximize value while strictly respecting both physical volume and weight constraints.
              </Text>
            </Card>
          </Stack>
        );
      case 'diagram':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">16. Diagram Window</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The <strong>Diagram</strong> tab (schematic icon in the left rail) is a vector editor for building
              interactive schematics — cycle diagrams, free-body sketches, control panels — whose values come
              live from the solver. It has two modes, switched at the top-left:
            </Text>
            <List spacing="xs" size="sm" style={{ paddingLeft: '20px' }}>
              <List.Item>
                <strong>Development</strong> — draw and arrange the diagram.
              </List.Item>
              <List.Item>
                <strong>Run</strong> — editing is locked; form controls become live and labels show solved values.
              </List.Item>
            </List>

            <Title order={3} mt="sm">Drawing</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Pick a tool — line, arrow, rectangle, circle/ellipse, or rich label — and drag on the canvas. The
              <strong> Component Library</strong> menu adds pre-built engineering symbols (turbine, pump,
              compressor, valve, heat exchanger, vessel, condenser/evaporator, spring-damper). A configurable
              grid with snap-to-grid keeps things aligned; use the <strong>Pan</strong> tool (or a middle-mouse
              drag) to pan, scroll to zoom, and the zoom-to-fit button to frame everything. Selected elements
              show resize handles (line endpoints are individually draggable); arrow keys nudge by one grid step
              (Shift = 1&nbsp;px), and the properties panel sets colors, stroke width, rotation, opacity, and
              per-shape options. Diagrams are saved automatically in the browser.
            </Text>
            <Title order={4} mt="xs">Selecting & editing</Title>
            <Text style={{ lineHeight: 1.6 }}>
              With the <strong>Select</strong> tool, click an element to select it, drag a <strong>marquee</strong>
              {' '}over empty canvas to select everything it touches, or <strong>Shift/Ctrl-click</strong> to add
              and remove elements from the selection. A multi-selection moves together and resizes proportionally
              from its group handles. Standard shortcuts apply: <strong>Ctrl+Z</strong> / <strong>Ctrl+Y</strong>
              {' '}(or Ctrl+Shift+Z) undo and redo every change; <strong>Ctrl+C / X / V</strong> copy, cut, and
              paste; <strong>Ctrl+D</strong> duplicates; <strong>Ctrl+A</strong> selects all; <strong>Del</strong>
              {' '}removes the selection. Undo and redo are also on the toolbar.
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              While dragging, elements <strong>snap</strong> to other elements' edges and centers with pink guide
              lines (in addition to the grid). Hold <strong>Shift</strong> while resizing to lock the aspect
              ratio. A selected element shows a <strong>rotate handle</strong> above it — drag to rotate, holding
              Shift to snap to 15° steps. With two or more elements selected, the properties panel offers
              <strong> align</strong> (left/right/top/bottom/centers) and, for three or more,
              <strong> distribute</strong> (even horizontal/vertical spacing).
            </Text>

            <Title order={3} mt="md">Variable Binding & Form Controls</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The <strong>Form Controls</strong> menu places widgets that bind to solver variables. Each widget
              has a <strong>bound variable</strong> set in its properties (a trailing <code>$</code> binds a
              string variable):
            </Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '140px' }}>Control</Table.Th>
                  <Table.Th>Effect on the solve</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><strong>Input</strong></Table.Td>
                  <Table.Td>Fixes the variable to the typed value (adds <code>var = value</code>).</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Slider</strong></Table.Td>
                  <Table.Td>Fixes the variable to the slider position (min/max/step configurable).</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Dropdown</strong></Table.Td>
                  <Table.Td>Fixes the variable to the chosen option — numeric, or a string for a <code>name$</code> variable (e.g. a fluid).</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Checkbox</strong></Table.Td>
                  <Table.Td>Fixes the variable to 1 (checked) or 0 (unchecked).</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Output</strong></Table.Td>
                  <Table.Td>Read-only — displays the solved value and units of its variable.</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Text style={{ lineHeight: 1.6 }}>
              The input-type controls are appended to your equations as fixed values, so a control should supply
              a degree of freedom the equations leave open. For example, with{' '}
              <code>Q = m * cp * (T2 - T1)</code> and <code>m</code>, <code>cp</code>, <code>T1</code> given,
              <code> T2</code> is free — bind a slider to <code>T2</code> and the system becomes solvable, with
              <code> Q</code> updating as you drag. Binding a control to an already-determined variable makes the
              system overspecified (reported by Check), exactly as if you had typed the extra equation.
            </Text>
            <Alert color="blue" title="Workflow" mt="xs">
              Build the diagram in Development mode and set each control's bound variable. Switch to{' '}
              <strong>Run</strong> mode, then use the top bar's <strong>Check</strong> and <strong>Solve</strong>{' '}
              buttons as usual: adjust inputs/sliders/dropdowns and press Solve to see Outputs and{' '}
              <code>{'{varname}'}</code> labels update. Changing a control's value does not require re-Checking;
              adding, removing, or rebinding a control does.
            </Alert>
            <Text style={{ lineHeight: 1.6 }}>
              <strong>Rich labels</strong> may embed <code>{'{varname}'}</code> placeholders anywhere in their
              text; in Run mode each is replaced by that variable's solved value and unit — handy for annotating
              state points directly on a schematic.
            </Text>

            <Title order={3} mt="md">Animations & Live Attributes (Run mode)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Every shape's properties panel has a <strong>Run-mode bindings</strong> section. Enter a formula
              of solved variables for any attribute — <strong>Δx</strong>, <strong>Δy</strong>,{' '}
              <strong>Width</strong>, <strong>Height</strong>, <strong>Rotation</strong>, or{' '}
              <strong>Opacity</strong> — and it is recomputed each time you Solve. Δx/Δy offset the authored
              position, so a piston bound with Δy = <code>{'stroke*sin(theta)'}</code> slides as{' '}
              <code>theta</code> changes across parametric runs.
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              Formulas support <code>+ - * / ^</code>, parentheses, the constant <code>pi</code>, and the
              functions <code>sin cos tan asin acos atan sqrt abs exp ln log10 min max pow mod</code>. A formula
              that references an unsolved variable simply leaves the authored value in place.
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              Lines and arrows offer a <strong>Flow animation</strong> toggle: the line becomes a moving dashed
              pipe whose speed is a formula (e.g. a mass-flow or velocity variable) and whose sign sets the
              direction. Combined with bound geometry, this drives schematic flow visualizations.
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              In Run mode, hovering any bound element shows a <strong>tooltip</strong> with the live values of
              every variable it references — a quick way to read the thermodynamic state at a node.
            </Text>

            <Title order={3} mt="md">Playback Over Parametric Table Runs</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Solve a <strong>Parametric Table</strong> and a <strong>playback bar</strong> appears at the top of
              the Diagram in Run mode. Play, pause, step, or scrub through the table's solved runs, and the whole
              diagram animates — bound positions, rotations, sizes, flow speeds, output badges, and{' '}
              <code>{'{varname}'}</code> labels all update to each run's values. Toggle looping, set the speed
              (0.5× / 1× / 2×), or press the <strong>broadcast</strong> button to drop back to the single live
              solve. This turns a parametric study into an animation — e.g. a piston cycling through crank
              angles, or a refrigeration cycle sweeping condenser temperatures.
            </Text>

            <Title order={3} mt="md">Embedded Charts & Plotly Dashboard Widgets</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The <strong>Embedded Chart</strong> tool drops a live line chart onto the canvas. Set its X and Y
              variables in the properties panel and it plots those columns across the parametric table runs;
              during playback a marker tracks the current run. The chart is a normal diagram element — move,
              resize, and place it alongside the schematic so the plot sits next to the equipment it describes.
            </Text>
            <Text style={{ lineHeight: 1.6 }}>
              For richer plots, a chart element can instead <strong>embed an existing Plot</strong> by id — any
              X-Y, property, or psychrometric diagram you built in the Plots window is rendered inside the
              schematic with the full Plotly engine (zoom, hover, legends and all). This turns the Diagram into a
              <strong> live dashboard</strong>: arrange Outputs, gauges, and full interactive charts on one canvas
              and they all refresh on each Solve or table-playback step.
            </Text>

            <Title order={3} mt="md">Gauges & Indicator Widgets</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The <strong>Widget</strong> menu adds analogue indicators bound to a solved variable — a{' '}
              <strong>dial</strong>, horizontal/vertical <strong>bar</strong>, <strong>tank</strong>, or{' '}
              <strong>thermometer</strong>. Each takes a min/max range (entered as formulas of solved variables)
              plus optional <strong>low/high warning</strong> and <strong>low/high danger</strong> thresholds, so
              the gauge turns amber or red as a value leaves its safe band. Give it a unit string and label and it
              reads like a real instrument panel in Run mode.
            </Text>

            <Title order={3} mt="md">Conditional Formatting & Value-Driven Fill</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Any shape can carry <strong>conditional style rules</strong>: a boolean formula of solved variables
              (e.g. <code>{'T > T_max'}</code>) that, when true, overrides the element's stroke, fill, or opacity —
              or <strong>hides</strong> it entirely. Stack several rules to flag operating regimes (safe / warning
              / trip) directly on the schematic. Separately, a <strong>value-driven fill</strong> interpolates a
              shape's fill between two colors as a bound variable sweeps from a min to a max formula — a built-in
              heat-map for temperatures, pressures, or stresses.
            </Text>

            <Title order={3} mt="md">Active Controls (write to value, guess, or bounds)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Beyond the basic Input/Slider/Dropdown/Checkbox, the Form Controls menu adds a{' '}
              <strong>Stepper</strong>, a <strong>Radio group</strong>, and a <strong>Calculate Button</strong>{' '}
              that runs Check or Solve straight from the canvas. Every input-type control also has a{' '}
              <strong>binding target</strong>: instead of fixing the variable with an equation, it can write the
              widget's value to that variable's <strong>initial guess</strong> or its <strong>lower/upper
              bound</strong> — so a slider can steer the solver's starting point or feasibility window rather than
              pinning the answer.
            </Text>

            <Title order={3} mt="md">Connectors, Anchors & Hotspots</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Library components expose named <strong>anchor points</strong> (a turbine's inlet/outlet, a vessel's
              ports, etc.). The <strong>Connector</strong> tool links two anchors with a straight, orthogonal, or
              curved line that stays attached as you move either component — and carries the same flow-animation
              and arrow options as a plain line. A <strong>Hotspot</strong> is an invisible clickable region that,
              in Run mode, jumps to another tab, runs an equation query, opens a plot, or switches to another
              diagram — handy for building navigable multi-screen models.
            </Text>

            <Title order={3} mt="md">Path-Following Motion & the Time Clock</Title>
            <Text style={{ lineHeight: 1.6 }}>
              In addition to the per-attribute bindings above, an element can be set to <strong>follow a path</strong>:
              its center tracks a point along a chosen line at a progress of 0–1 given by a formula, optionally
              orienting itself to the path tangent. Animation formulas may reference the built-in <strong>time
              clock</strong> <code>t</code>, so motion can <strong>tween</strong> smoothly over real time
              (a piston reciprocating, a marker traversing a cycle) independent of parametric runs.
            </Text>

            <Title order={3} mt="md">Templates, Multiple Diagrams, Export & Recording</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Start from a built-in <strong>template</strong> — Vapor-Compression Refrigeration, Rankine Steam
              Power Cycle, Brayton Gas Turbine Cycle, a Simple Piping Network, or a Spring-Mass free-body diagram —
              and a fully wired schematic drops onto the canvas. A workspace can hold <strong>several named
              diagrams</strong>, switched from the diagram selector. Finished diagrams <strong>export</strong> to
              SVG, PNG, PDF, or EPS, and a Run-mode animation (live solve or table playback) can be{' '}
              <strong>recorded</strong> to a WebM video. The whole workspace — equations, variable drafts, tables,
              plots, and every diagram — saves to a single <strong>frees project file</strong> for sharing or
              archiving.
            </Text>
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
        width: 300,
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
        <AppShell.Section grow component={ScrollArea}>
          <Text fw={700} size="xs" c="dimmed" mb="sm" style={{ letterSpacing: '1px' }}>
            DOCUMENTATION SECTIONS
          </Text>
          {SECTIONS.map((section) => (
            <NavLink
              key={section.id}
              label={section.label}
              active={active === section.id}
              onClick={() => {
                setActive(section.id);
                if (opened) toggle();
              }}
              variant="light"
              color="blue"
              styles={{
                label: { fontWeight: active === section.id ? 600 : 400 },
                root: { borderRadius: '6px', marginBottom: '2px' }
              }}
            />
          ))}
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
