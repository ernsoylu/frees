// The worked-example catalog behind the Help page's Examples tab.
//
// Extracted from HelpPage.tsx, which is a 3,800-line component that had this
// 2,000-line data table sitting in the middle of it. Two reasons, and the
// second is the load-bearing one:
//
//   * a component file should not be mostly data; and
//   * this catalog is ~2,100 lines of SonarCloud-reported duplication, and it
//     is INHERENT duplication of exactly the kind `sonar.cpd.exclusions`
//     already covers for `fixtures/**` — every entry is the same
//     {value, title, description, code} shape wrapped around a .frees
//     document, and the documents repeat each other's idiom by design.
//     Splitting the data out lets that exclusion name a pure data module
//     instead of swallowing a file that also holds real component logic.
//
// Entries are plain data: no interpolation, no imports, no logic.

export const CYCLE_EXAMPLES = [

  // ── Hard cross-discipline case studies (all verified against the solver) ──
  {
    value: "combined-cycle",
    title: "Energy Systems: Combined Brayton–Rankine Cycle through an HRSG",
    description: "A complete combined-cycle power plant: an air-standard gas turbine (Brayton) tops a steam Rankine cycle, the two coupled through a Heat Recovery Steam Generator. The HRSG energy balance fixes the steam-to-gas mass ratio; the real-fluid backend supplies every steam state.",
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

{ ---- Steam Rankine bottoming (real-water properties) ---- }
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
GUESS Me = 2.9
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
Tper = 2*pi#*sqrt(a^3/mu)     { orbital period }
tk = Tper/4                  { a quarter-period after perigee }
M = 2*pi#*tk/Tper             { mean anomaly }
M = EA - ecc*sin(EA)         { Kepler's equation (guess EA = 2) }
nu = 2*arctan( sqrt((1+ecc)/(1-ecc)) * tan(EA/2) )
nu_deg = nu*180/pi#
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
  V[j] = Q[j]/(pi#/4*D[j]^2)
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
    value: "pelton-turbine",
    title: "Turbomachinery: Pelton Wheel (Impulse Turbine) Design",
    description: "Designs a single-jet Pelton wheel for a high-head hydro site. The jet velocity comes from the net head through the nozzle velocity coefficient; the optimum bucket speed sets the wheel diameter at a given rotational speed (entered in rpm, which frees converts to rad/s). The jet diameter follows from continuity, and the bucket force/power use the momentum change through the deflection angle. Demonstrates angle units (deg → rad), rpm → rad/s, and dimensionally derived results.",
    note: "Vj ≈ 75.2 m/s, bucket speed u ≈ 34.6 m/s, wheel diameter D ≈ 1.32 m, jet diameter d ≈ 92 mm (jet ratio D/d ≈ 14.4). Bucket power ≈ 1.28 MW from 1.47 MW of water power — hydraulic efficiency η_h ≈ 90% (wheel efficiency on head ≈ 87% after the nozzle loss).",
    code: `{ Pelton Wheel (Impulse Turbine) Design — single jet }
{ High-head hydro: given net head, flow and speed, size the wheel and
  jet and find the power and efficiency. }
rho = 1000 [kg/m^3]
g = 9.81 [m/s^2]
H = 300 [m]            { net head at the nozzle }
Q = 0.5 [m^3/s]        { volumetric flow (one jet) }
N = 500 [rpm]          { runner speed — rpm auto-converts to rad/s }
C_v = 0.98             { nozzle velocity coefficient }
phi = 0.46             { speed ratio  u / Vj  (optimum ~0.46) }
beta = 165 [deg]       { bucket outlet angle }
k = 0.85               { relative-velocity friction factor }

{ Jet from the nozzle }
Vj = C_v * sqrt(2 * g * H)

{ Optimum bucket (peripheral) speed and the wheel diameter.
  N is an angular velocity in rad/s, so u = N * D_wheel/2.
  (D_wheel and d_jet must differ — names are case-insensitive in frees.) }
u = phi * Vj
u = N * (D_wheel / 2)

{ Jet diameter from continuity, and the jet ratio (good design 11–14) }
Q = (pi# / 4) * d_jet^2 * Vj
m_ratio = D_wheel / d_jet

{ Force and power on the buckets (jet deflected through 180° − beta) }
F = rho * Q * (Vj - u) * (1 + k * cos(180 [deg] - beta))
P_bucket = F * u

{ Water power available and the efficiencies }
P_water = rho * g * Q * H
eta_hydraulic = P_bucket / (0.5 * rho * Q * Vj^2) * 100
eta_wheel = P_bucket / P_water * 100`,
  },
  {
    value: "ev-longitudinal",
    title: "Vehicle Dynamics: EV Longitudinal Road-Load, Power & Range",
    description: "The longitudinal road-load model for an electric car: tractive force as the sum of rolling resistance, aerodynamic drag and road grade, then wheel power, battery power through the drivetrain efficiency, the energy consumed per metre, and the range from a usable pack. Change the grade angle alpha to see hill-climb demand. (Grounded in the Electric Vehicle Design text in the linked notebook.)",
    note: "Flat 120 km/h cruise: tractive force ≈ 617 N, battery power ≈ 24 kW, consumption ≈ 722 J/m (≈ 200 Wh/km), and ≈ 2.995e5 m ≈ 300 km of range from a 60 kWh pack. Set alpha = 5 [deg] and the climb term M·g·sin(alpha) dominates.",
    code: `{ EV longitudinal road-load: force, power, consumption and range }
{ F_trac = rolling + grade + aero; P_batt = P_wheel / drivetrain efficiency. }
M = 1500 [kg]          { vehicle mass }
g = 9.81 [m/s^2]
Crr = 0.012            { rolling-resistance coefficient }
rho = 1.2 [kg/m^3]     { air density }
Cd = 0.30              { drag coefficient }
A_f = 2.2 [m^2]        { frontal area }
alpha = 0 [deg]        { road grade angle (0 = flat) }
V = 120 [km/h]         { cruise speed (auto-converts to m/s) }
eta_t = 0.90           { transmission efficiency }
eta_m = 0.95           { motor + inverter efficiency }
E_pack = 60 [kWh]      { usable battery energy }

F_roll  = M*g*Crr*cos(alpha)
F_grade = M*g*sin(alpha)
F_aero  = 0.5*rho*Cd*A_f*V^2
F_trac  = F_roll + F_grade + F_aero
P_wheel = F_trac*V
P_batt  = P_wheel/(eta_t*eta_m)
cons    = P_batt/V          { energy per distance [J/m]; divide by 3.6 for Wh/km }
Range   = E_pack/cons       { [m]; /1000 for km }`,
  },
  {
    value: "ev-lateral",
    title: "Vehicle Dynamics: Lateral Bicycle Model & Understeer Gradient",
    description: "The steady-state single-track (bicycle) model: axle loads from the CG position, the understeer gradient from front/rear cornering stiffness, the front steer angle to hold a curve (Ackermann plus the dynamic term), and the characteristic speed of the understeering vehicle. Kus > 0 confirms a stable, understeering layout.",
    note: "With the front-biased CG and equal axle stiffness, Kus ≈ 0.037 (understeer). At R = 100 m and 25 m/s the required steer is δ ≈ 3.0°, and the characteristic speed (steer = twice Ackermann, peak yaw gain) is ≈ 27.6 m/s ≈ 99 km/h.",
    code: `{ Steady-state lateral (bicycle) model: understeer gradient and steer angle }
m = 1730 [kg]
g = 9.81 [m/s^2]
a = 1.189 [m]          { CG to front axle }
b = 1.696 [m]          { CG to rear axle }
Cf = 80000 [N/rad]     { front axle cornering stiffness }
Cr = 80000 [N/rad]     { rear axle cornering stiffness }
R = 100 [m]            { turn radius }
V = 25 [m/s]           { cornering speed }

L = a + b                       { wheelbase }
W_f = m*g*b/L                   { static front axle load }
W_r = m*g*a/L                   { static rear axle load }
Kus = W_f/Cf - W_r/Cr           { understeer gradient (>0 understeer) }
a_y = V^2/(g*R)                 { lateral acceleration [g] }
delta = L/R + Kus*a_y           { front steer angle [rad] }
delta_deg = delta*Convert('rad','deg')
u_char = sqrt(g*L/Kus)          { characteristic speed [m/s] }`,
  },
  {
    value: "ev-sizing",
    title: "EV Powertrain: Motor & Battery Sizing (acceleration, gradeability, range)",
    description: "Sizes the traction motor and battery from performance targets. The motor must satisfy the harder of two demands — mean power to reach 100 km/h in the acceleration time, and steady power to hold a 6° grade at 60 km/h — taken with max(). The battery is sized from the cruise road-load and a target range. (Methodology from the Electric Vehicle Design text in the linked notebook.)",
    note: "Acceleration (≈93 kW) dominates gradeability (≈37 kW), so size the motor at ≈93 kW. A 400 km range at 110 km/h needs E_need ≈ 2.5e8 J ≈ 69 kWh of usable energy.",
    code: `{ EV motor + battery sizing from acceleration, gradeability and range }
M = 1600 [kg]
g = 9.81 [m/s^2]
Crr = 0.012
rho = 1.2 [kg/m^3]
Cd = 0.28
A_f = 2.3 [m^2]
eta = 0.88             { combined drivetrain efficiency }

{ 1) Acceleration: mean power to reach V_f in t_acc (energy method) }
V_f = 100 [km/h]
t_acc = 7 [s]
delta = 1.05           { rotational-inertia mass factor }
E_kin = 0.5*M*delta*V_f^2
P_acc = E_kin/t_acc

{ 2) Gradeability: hold a grade at steady speed }
theta = 6 [deg]
V_grade = 60 [km/h]
F_grade = M*g*(Crr*cos(theta)+sin(theta)) + 0.5*rho*Cd*A_f*V_grade^2
P_grade = F_grade*V_grade/eta

{ Motor must cover the harder requirement }
P_motor = max(P_acc, P_grade)

{ 3) Battery sizing from cruise road-load and target range }
V_cr = 110 [km/h]
F_cr = M*g*Crr + 0.5*rho*Cd*A_f*V_cr^2
cons = F_cr/eta            { [J/m] }
Range_target = 400 [km]
E_need = cons*Range_target { usable energy [J]; /3.6e6 for kWh }`,
  },
  {
    value: "ev-battery-pack",
    title: "EV Powertrain: Battery Pack Design & Cell Selection (Batemo database)",
    description: "Designs a pack from a target voltage, energy and peak power, then checks a real cell against the load. The cell is the Molicel INR21700-P42A taken from the Batemo Cell Explorer database in the linked notebook. Series count sets voltage, parallel count sets energy; the per-cell peak current must stay under the cell's rating. Battery quantities use conventional units (V, Ah, A, Wh, kWh) rather than SI, so they are kept unitless here.",
    note: "112S × 42P ≈ 4700 cells gives ~400 V, ~175 Ah and ~70 kWh. A 150 kW peak draws 375 A from the pack (2.1C) = 9 A per cell — well under the P42A's 45 A continuous limit (36 A headroom). Round Ns/Np up to whole cells in practice.",
    code: `{ Battery pack design + cell selection (engineering units, see comments) }
{ Cell: Molicel INR21700-P42A from the Batemo Cell Explorer database. }
V_pack = 400           { target nominal pack voltage [V] }
E_target = 70          { required usable energy [kWh] }
P_peak = 150           { peak power demand [kW] }

V_cell = 3.6           { cell nominal voltage [V] }
Q_cell = 4.2           { cell capacity [Ah] }
I_cell_max = 45        { cell max continuous discharge [A] }
E_cell = V_cell*Q_cell { cell energy [Wh] }

Ns = V_pack/V_cell             { cells in series (round up) }
Np = E_target*1000/(Ns*E_cell) { parallel strings (kWh -> Wh) }
N_cells = Ns*Np
E_pack = N_cells*E_cell/1000   { pack energy [kWh] }
Q_pack = Np*Q_cell             { pack capacity [Ah] }
I_peak = P_peak*1000/V_pack    { peak pack current [A] }
I_cell = I_peak/Np             { current per cell [A] }
C_rate = I_peak/Q_pack         { pack C-rate [1/h] }
margin = I_cell_max - I_cell   { per-cell headroom [A], must be > 0 }`,
  },
  {
    value: "ev-regen",
    title: "Vehicle Dynamics: Regenerative Braking Energy Recovery",
    description: "How much kinetic energy a regenerative brake can return. The motor-as-generator recovers a fraction (regen efficiency) of the vehicle's ½·m·V² when slowing from a speed, with the rotational-inertia mass factor included. Shows the energy per stop, how many stops fill 1 kWh, and the total recovered over a stop-and-go trip.",
    note: "From 50 km/h a 1600 kg car holds ≈ 162 kJ of kinetic energy; at 65% regen ≈ 105 kJ (0.029 kWh) returns per stop, so ≈ 34 such stops bank 1 kWh, and a 20-stop city run recovers ≈ 2.1 MJ (≈ 0.58 kWh). (Source caveat: the books note real-world regen return is drive-cycle dependent, often 10–30% of pack energy in stop-and-go.)",
    code: `{ Regenerative braking: kinetic energy recovered per stop and per trip }
M = 1600 [kg]
V = 50 [km/h]          { speed before braking }
eta_regen = 0.65       { fraction of kinetic energy returned to the battery }
delta = 1.05           { rotational-inertia mass factor }

E_kin = 0.5*M*delta*V^2        { kinetic energy [J] }
E_regen = eta_regen*E_kin      { recovered per stop [J]; /3.6e6 for kWh }

E_oneKWh = 1 [kWh]
stops_per_kWh = E_oneKWh/E_regen   { stops to bank 1 kWh }

N_stops = 20                   { stops on a city run }
E_recovered = E_regen*N_stops  { total recovered [J] }`,
  },
  {
    value: "ev-drive-cycle",
    title: "Vehicle Dynamics: Combined Drive-Cycle Consumption & Range",
    description: "A two-phase (city + highway) drive-cycle estimate. The flat road-load consumption is computed at each phase speed, the city phase gets a regenerative-braking credit, and the phases are blended by distance fraction into a combined consumption and the resulting range from a usable pack.",
    note: "55% city / 45% highway: city ≈ 183 J/m (after a 25% regen credit), highway ≈ 596 J/m, blended ≈ 369 J/m (≈ 102 Wh/km), giving ≈ 5.86e5 m ≈ 586 km from a 60 kWh pack.",
    code: `{ Combined city/highway drive-cycle consumption and range }
M = 1550 [kg]
g = 9.81 [m/s^2]
Crr = 0.011
rho = 1.2 [kg/m^3]
Cd = 0.29
A_f = 2.2 [m^2]
eta = 0.88
E_pack = 60 [kWh]
regen_credit = 0.25        { city energy returned by regen }

V_city = 40 [km/h]
V_hwy = 110 [km/h]
frac_city = 0.55
frac_hwy = 0.45

F_city = M*g*Crr + 0.5*rho*Cd*A_f*V_city^2
F_hwy  = M*g*Crr + 0.5*rho*Cd*A_f*V_hwy^2
cons_city = F_city/eta*(1 - regen_credit)   { [J/m] }
cons_hwy  = F_hwy/eta
cons_avg  = frac_city*cons_city + frac_hwy*cons_hwy
Range     = E_pack/cons_avg                 { [m]; /1000 for km }`,
  },
  {
    value: "fcev-sizing",
    title: "EV Powertrain: Hydrogen Fuel-Cell Vehicle (FCEV) Sizing & Range",
    description: "Sizes a hydrogen fuel-cell vehicle from its 700-bar tank. Usable electrical energy is the stored hydrogen mass times its lower heating value times the net fuel-cell system efficiency; range follows from the cruise road-load, and the continuous stack power must cover that load. Hydrogen consumption per 100 km falls out for comparison with real cars. (Grounded in the hydrogen-vehicle books in the linked notebook; Toyota Mirai II ≈ 5.6 kg tank.)",
    note: "5.6 kg H2 at 45% net FC efficiency ≈ 3.02e8 J usable → ≈ 5.15e5 m ≈ 515 km. Continuous stack power at 100 km/h ≈ 16.3 kW; hydrogen consumption cons_H2 ≈ 1.09e-5 kg/m ≈ 1.09 kg/100 km — right in the 1.0–1.16 kg/100 km band for passenger FCEVs.",
    code: `{ Hydrogen fuel-cell vehicle: usable energy, range and consumption }
m_H2 = 5.6 [kg]        { usable hydrogen (700 bar tank, Mirai-II class) }
LHV = 120 [MJ/kg]      { hydrogen lower heating value }
eta_fc = 0.45          { net fuel-cell system efficiency }
E_usable = m_H2*LHV*eta_fc      { electrical energy to the drivetrain [J] }

M = 1800 [kg]
g = 9.81 [m/s^2]
Crr = 0.011
rho = 1.2 [kg/m^3]
Cd = 0.29
A_f = 2.4 [m^2]
eta_dt = 0.88
V = 100 [km/h]

F_cr = M*g*Crr + 0.5*rho*Cd*A_f*V^2
cons = F_cr/eta_dt              { road-load energy per distance [J/m] }
Range = E_usable/cons           { [m]; /1000 for km }
P_fc = cons*V                   { continuous stack power at cruise [W] }
cons_H2 = m_H2/Range            { hydrogen use [kg/m]; *1e5 for kg/100 km }`,
  },
  {
    value: "ev-fast-charge",
    title: "EV Powertrain: DC Fast Charging Time, C-rate & Grid Energy",
    description: "DC fast-charge sizing over the usual 10→80% SOC window. From the charge current it finds the constant-current charge time, the charge C-rate, the DC power, the energy added, and the grid energy once the charger's efficiency is included. Battery quantities use conventional units (V, Ah, A, kWh) and are kept unitless. (Grounded in the EV fast-charging book in the linked notebook.)",
    note: "175 Ah / 400 V pack, 10→80% at 350 A: ≈ 21 min on the CC phase, 2.0C, 140 kW DC, 49 kWh added, ≈ 52.7 kWh drawn from the grid at 93% charger efficiency. Real charges add a tapering CV phase past ~80%.",
    code: `{ EV DC fast charge: time, C-rate, power and grid energy (engineering units) }
V_pack = 400           { nominal pack voltage [V] }
Q_pack = 175           { pack capacity [Ah] }
E_pack = 70            { pack energy [kWh] }
SOC_start = 10         { start state of charge [%] }
SOC_end = 80           { end state of charge [%] }
I_charge = 350         { DC charge current [A] }
eta_charger = 0.93     { charger (grid->DC) efficiency }

dSOC = (SOC_end - SOC_start)/100
Ah_added = dSOC*Q_pack             { charge delivered [Ah] }
t_charge_h = Ah_added/I_charge     { CC-phase time [h] }
t_charge_min = t_charge_h*60
C_rate = I_charge/Q_pack           { charge C-rate [1/h] }
P_charge = V_pack*I_charge/1000    { DC charge power [kW] }
E_added = dSOC*E_pack              { energy added to pack [kWh] }
E_grid = E_added/eta_charger       { energy drawn from grid [kWh] }`,
  },
  {
    value: "hev-power-split",
    title: "EV Powertrain: Parallel Hybrid (HEV) Power Split",
    description: "A parallel-hybrid power split at a peak demand point. The total wheel power for hard acceleration on the move is computed from the road load plus the inertial term; the engine is sized to cover about half of the peak, and the electric motor supplies the balance, drawing current from the battery. (Power-split relation and sizing rule from the hybrid-vehicle material in the linked notebook.)",
    note: "At 120 km/h with 1.5 m/s² acceleration the wheels need ≈ 126 kW; sizing the engine at 50% leaves ≈ 63 kW for the motor, which pulls ≈ 228 A from a 300 V battery at 92% motor efficiency.",
    code: `{ Parallel HEV power split: P_load = P_engine + P_motor }
M = 1700 [kg]
g = 9.81 [m/s^2]
Crr = 0.011
rho = 1.2 [kg/m^3]
Cd = 0.30
A_f = 2.3 [m^2]
eta_dt = 0.88
V_peak = 120 [km/h]    { speed at the peak-power point }
a_peak = 1.5 [m/s^2]   { simultaneous acceleration }
delta = 1.05

F_peak = M*g*Crr + 0.5*rho*Cd*A_f*V_peak^2 + M*delta*a_peak
P_load = F_peak*V_peak/eta_dt      { total wheel power demand }
P_engine = 0.5*P_load              { ICE sized for ~half of peak }
P_motor = P_load - P_engine        { motor supplies the rest }

V_batt = 300 [V]
eta_m = 0.92
I_batt = P_motor/(V_batt*eta_m)    { battery current for the motor [A] }`,
  },
  {
    value: "cell-to-pack-density",
    title: "EV Powertrain: Cell-to-Pack Mass & Gravimetric Energy Density",
    description: "Scales single-cell mass and energy up to a full pack, then compares cell- and pack-level specific energy. The pack mass adds structure, busbars, cooling and the BMS via a cell-mass fraction (cell-to-pack mass efficiency), which dilutes the gravimetric energy density from cell to pack level.",
    note: "4700 × 21700 cells (70 g, 15.1 Wh each): cell-level ≈ 7.77e5 J/kg ≈ 216 Wh/kg, but at a 0.70 cell-mass fraction the 470 kg pack delivers ≈ 5.44e5 J/kg ≈ 151 Wh/kg (divide J/kg by 3600 for Wh/kg).",
    code: `{ Cell-to-pack mass and gravimetric energy density }
N_cells = 4700
m_cell = 0.070 [kg]        { 21700 cell mass (~70 g) }
E_cell = 54.4 [kJ]         { cell energy (~15.1 Wh) }
pack_mass_factor = 0.70    { cell mass / pack mass (cell-to-pack efficiency) }

m_cells = N_cells*m_cell
m_pack = m_cells/pack_mass_factor      { pack mass incl. structure/cooling/BMS }
E_pack = N_cells*E_cell
e_cell_grav = E_cell/m_cell            { cell specific energy [J/kg]; /3600 = Wh/kg }
e_pack_grav = E_pack/m_pack            { pack specific energy [J/kg]; /3600 = Wh/kg }`,
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
F[1:2] = [0, -P]
u[1:2] = SolveLinear(Kg[1:2,1:2], F[1:2])
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
    description: "An automotive cooling loop where the fan and pump operating points are found implicitly — each performance curve, entered as a TABLE and called like a function, is intersected with its quadratic flow resistance — and the radiator heat duty follows from a digitized effectiveness table. The coolant is a 50/50 ethylene glycol/water mixture (EG50) whose density and specific heat come straight from the real-fluid backend. The fan curve is affinity-scaled by f_rpm so you can slow the fan or sweep it in a Parametric Table.",
    note: "Solves to Q = 38.2 kW rejected, fan power 262 W and pump power 97 W, at an air-side operating point of 0.90 m³/s (~1910 CFM, 131 Pa) and a coolant flow of 89.8 L/min. The TABLE input/output units ([m^3/s] → [Pa]) let frees derive SI units all the way through (Vair m³/s, dP_air Pa, Q W, T_c_out K) instead of showing '-'. EG50 at 90 °C gives ρ = 1019 kg/m³, cp = 3616 J/kg·K (vs water 965 / 4205). Data sources: cross-flow radiator effectiveness ε≈0.6–0.85 and heat rejection 25–50 kW (ResearchGate 397980466, FSAE study 356606738); SPAL 16-inch fan ~2500 CFM free-air / ~250 Pa max static (streetmusclemag.com); Davies-Craig EWP pump 90–162 L/min (daviescraig.com.au/electric-water-pumps).",
    code: `{ Automotive cooling loop: radiator + electric pump + electric fan.
  Coolant = 50/50 ethylene glycol / water (EG50), real-fluid properties.
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

{ Fan curve: static pressure [Pa] vs air flow [m^3/s].
  The [Pa] on the table output lets frees derive SI units for everything
  computed from the lookup (dP_air, W_fan, ...). }
TABLE fanCurve(Vair [m^3/s]) [Pa]
  0.0    250
  0.3    232
  0.6    195
  0.9    132
  1.18   0
END

{ Pump curve: head [Pa] vs coolant flow [m^3/s] }
TABLE pumpCurve(Vc [m^3/s]) [Pa]
  0.0      55000
  0.0008   48000
  0.0016   34000
  0.0023   0
END

{ Radiator effectiveness (digitized): dimensionless epsilon vs air flow }
TABLE radEff(Vair [m^3/s]) [-]
  0.3   0.45
  0.6   0.55
  0.9   0.62
  1.2   0.67
END

{ Flow resistances: dP = K * V^2, so K carries [Pa/(m^3/s)^2] = [kg/m^7].
  Annotating K grounds the flows Vair, Vc at m^3/s. }
K_air = 160 [kg/m^7]
K_c   = 1.6e10 [kg/m^7]

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
th2_deg = th2*180/pi#`,
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
    value: "inhour-equation",
    title: "Nuclear Engineering: Stable Reactor Period from the Inhour Equation",
    description: "A step reactivity insertion in a reactor with six delayed-neutron groups. The inhour equation relating reactivity to the stable period is transcendental with all six groups contributing; the β and λ data are entered as arrays and summed.",
    note: "Inserting 0.0025 Δk/k (well below the 0.0065 delayed-neutron fraction) gives a stable, positive reactor period of about 10.9 s — a controllable transient. Above β the period would collapse to prompt-critical. Set a guess Tper ≈ 30 s.",
    code: `{ Nuclear: stable reactor period from the 6-group inhour equation (U-235) }
Lambda = 2e-5 [s]            { prompt neutron generation time }
rho = 0.0025                 { inserted reactivity (dk/k) }
beta[1:6] = [0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273]
lam[1:6]  = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01]
{ Stable period Tper (guess ~30 s); contributions of the 6 groups }
FOR i = 1 TO 6
  term[i] = beta[i]/(1 + lam[i]*Tper)
END
rho = Lambda/Tper + sum(term[1:6])
beta_tot = sum(beta[1:6])`,
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
a_c = (K_IC/(sig_max*Y))^2/pi#      { critical crack length }
{ Cycles to failure = integral of da / (C (dsig Y sqrt(pi# a))^m) }
N_f = Integral(1/(C*(dsig*Y*sqrt(pi#*a))^m), a, a_i, a_c)`,
  },
  {
    value: "ammonia-refrigeration",
    title: "HVAC & Refrigeration: Ammonia Refrigeration Cycle COP",
    description: "An ammonia (R-717) chiller with a flooded evaporator operates between suction pressure 38.5 psia (with 20°F superheat) and discharge pressure 229 psia. The COP is computed from states' enthalpies.",
    note: "Results: COP = 3.9, cooling load = 10,250 Btu/min, compressor power = 2,594 Btu/min.",
    code: `{ Problem 1: Ammonia Refrigeration Cycle COP }
P_suction = 38.5 [psia]
superheat = 20 [R]       { a 20 °F superheat (a temperature difference) }
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
    note: "Results: total load = 67.7 tons of refrigeration (the chart solution reads 67.9). The coil enthalpy drop is 9.0 Btu/lb; absolute enthalpies are on CoolProp's datum, which differs from the psychrometric chart by a constant that cancels in the difference.",
    code: `{ Problem 2: Face and Bypass Control Load }
V_dot_supply = 20000 [ft^3/min]
V_dot_oa = 5000 [ft^3/min]
T_room = 80 [F]
rh_room = 0.50
T_oa_db = 90 [F]
T_oa_wb = 74 [F]
T_coil_out_db = 58 [F]
T_coil_out_wb = 56 [F]
P_atm = 14.696 [psia]

v_supply = 13.25 [ft^3/lb] { Specific volume of supply air }
m_dot_supply = V_dot_supply / v_supply

f_oa = V_dot_oa / V_dot_supply
f_return = 1 - f_oa

h_room = Enthalpy(AirH2O, T=T_room, R=rh_room, P=P_atm)
h_oa = Enthalpy(AirH2O, T=T_oa_db, B=T_oa_wb, P=P_atm)
h_mix = f_oa * h_oa + f_return * h_room
h_supply = Enthalpy(AirH2O, T=T_coil_out_db, B=T_coil_out_wb, P=P_atm)

Q_dot_coil = m_dot_supply * (h_mix - h_supply)
Q_dot_coil_tons = Q_dot_coil / (12000 [Btu/hr])   { 1 ton of refrigeration = 12,000 Btu/hr }`,
  },
  {
    value: "solar-heat-gain",
    title: "HVAC & Refrigeration: Solar Heat Gain Through Windows",
    description: "Calculates total heat gain through windows on North, East, and West faces of a building using U-value, Cooling Load Temperature Differences (CLTD), and Solar Heat Gain Factors (SHGF).",
    note: "Results: total heat gain = 21,720 Btu/hr.",
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
    note: "Results: leaving dry-bulb temperature = 79°F.",
    code: `{ Problem 5: Enthalpy Wheel Heat Recovery }
V_dot_oa = 1500 [ft^3/min]
T_oa_db = 95 [F]
T_oa_wb = 78 [F]
T_room_db = 75 [F]
rh_room = 0.50
effectiveness = 0.80

T_tempered_db = T_oa_db - (T_oa_db - T_room_db) * effectiveness
T_tempered_db_F = T_tempered_db / (1 [R]) - 459.67   { the same temperature in °F }`,
  },
  {
    value: "run-around-cycle",
    title: "HVAC & Refrigeration: Run-Around Water Cycle Balance",
    description: "Determines leaving air temperature from a cooling coil coupled to a run-around loop water cycle under steady-state energy balance.",
    note: "Results: heat transfer rate = 75,000 Btu/hr, air temp difference = 13.6°F, leaving air temperature = 61.4°F (or 52°F depending on heating balancing).",
    code: `{ Problem 6: Run-Around Water Cycle }
V_dot_water = 15 [gal/min]
delta_T_water = 10 [R]           { a 10 °F temperature difference }
T_air_in = 75 [F]
V_dot_air = 5000 [ft^3/min]

{ The rules of thumb with their units: 500 = 8.33 lbm/gal x 60 min/hr x 1 Btu/lbm-°F,
  1.1 = 0.0764 lbm/ft^3 x 60 min/hr x 0.24 Btu/lbm-°F }
rho_w = 8.3333 [lbm/gal]
cp_w = 1 [Btu/lbm-R]
rho_a = 0.0764 [lbm/ft^3]
cp_a = 0.24 [Btu/lbm-R]

{ Heat transfer rate }
Q = rho_w * V_dot_water * cp_w * delta_T_water
Q = rho_a * V_dot_air * cp_a * delta_T_air
T_air_out = T_air_in - delta_T_air

Q_Btuh = Q / (1 [Btu/hr])                      { 75,000 Btu/hr }
delta_T_air_F = delta_T_air / (1 [R])          { °F of air temperature drop }
T_air_out_F = T_air_out / (1 [R]) - 459.67`,
  },
  {
    value: "latent-heat-freezing",
    title: "HVAC & Refrigeration: Specific Heat of Freezing",
    description: "Calculates the cooling required to cool 10,000 lbs of frozen chicken from its freezing point (27°F) to storage temperature (-10°F).",
    note: "Results: cooling required = 136,900 Btu.",
    code: `{ Problem 7: Specific & Latent Heat of Freezing }
mass = 10000 [lb]
T_freeze = 27 [F]
T_storage = -10 [F]
Cp_below = 0.37 [Btu/lb-F]

Q_required = mass * Cp_below * (T_freeze - T_storage)`,
  },


  {
    value: "psychrometric-balancing",
    title: "HVAC & Refrigeration: Psychrometric Room Balancing",
    description: "Calculates entering and leaving air conditions for a cooling coil serving a space with both sensible and latent heat gains under outdoor ventilation requirements.",
    note: "Results: Mixed Air Temp = 80.7°F db / 66.2°F wb, Leaving Air Temp = 55.0°F db / 51.1°F wb.",
    code: `{ Problem 3: Psychrometric Room Balancing }
Q_sensible = 90000 [Btu/hr]
Q_latent = 40000 [Btu/hr]
V_dot_supply = 3600 [ft^3/min]
T_supply_db = 55 [F]
T_room_db = 78 [F]
rh_room = 0.45
T_oa_db = 92 [F]
T_oa_wb = 76 [F]
V_dot_oa = 700 [ft^3/min]
P_atm = 14.696 [psia]
rho_std = 0.075 [lbm/ft^3]   { standard air: the 4.5 in Q = 4.5 x cfm x dh is 60 min/hr x 0.075 lbm/ft^3 }

V_dot_return = V_dot_supply - V_dot_oa
f_oa = V_dot_oa / V_dot_supply
f_return = V_dot_return / V_dot_supply

{ Mixed air condition (MAT) }
T_entering_db = f_oa * T_oa_db + f_return * T_room_db
h_room = Enthalpy(AirH2O, T=T_room_db, R=rh_room, P=P_atm)
h_oa   = Enthalpy(AirH2O, T=T_oa_db, B=T_oa_wb, P=P_atm)
h_mix  = f_oa * h_oa + f_return * h_room
T_entering_wb = WetBulb(AirH2O, T=T_entering_db, H=h_mix, P=P_atm)

{ Coil load: room sensible + latent + ventilation load }
Q_total = Q_sensible + Q_latent + rho_std * V_dot_oa * (h_oa - h_room)
h_leaving = h_mix - Q_total / (rho_std * V_dot_supply)
T_leaving_wb = WetBulb(AirH2O, T=T_supply_db, H=h_leaving, P=P_atm)

{ The same temperatures in °F }
T_entering_db_F = T_entering_db / (1 [R]) - 459.67
T_entering_wb_F = T_entering_wb / (1 [R]) - 459.67
T_leaving_wb_F  = T_leaving_wb / (1 [R]) - 459.67`,
  },
  {
    value: "pumping-friction-head",
    title: "HVAC & Refrigeration: Pumping and Friction Head",
    description: "Computes the operating head of a water pump overcoming static elevation and pipe friction (Darcy-Weisbach friction equation) under pressurized inlet conditions.",
    note: "Results: velocity = 8.54 ft/s, friction head = 9.3 ft, total head required = 169.3 ft, inlet head = 46.2 ft, pump head = 123.1 ft.",
    code: `{ Problem 8: Pumping and Friction Head }
{ All quantities are in English units (ft, gpm, fps) but kept unitless
  to avoid placing unit annotations on computed expressions. }
T_water = 90
gpm = 26000
f_factor = 0.01
L_eq = 2425
z_elev = 160
P_inlet = 20
OD = 36
t_wall = 0.375

ID = (OD - 2 * t_wall) / 12
V = (gpm * 0.1337 / 60) / (pi# / 4 * ID^2)
h_friction = f_factor * (L_eq / ID) * (V^2 / 64.4)
h_total = z_elev + h_friction

h_inlet = P_inlet * 2.31
h_pump = h_total - h_inlet`,
  },
  {
    value: "air-supply-wetbulb",
    title: "HVAC & Refrigeration: Air Supply Wet-Bulb Determination",
    description: "Finds the wet-bulb temperature of the supply air to maintain a room at 75°F db/63°F wb under sensible load and Sensible Heat Factor.",
    note: "Results: total heat load = 250,000 Btu/hr, supply wet-bulb temperature = 55.0°F — enthalpies are on CoolProp's datum, which differs from the standard psychrometric chart by a constant that cancels in the load equation's difference.",
    code: `{ Problem 9: Air Supply Wet-Bulb Determination }
T_room_db = 75 [F]
T_room_wb = 63 [F]
T_supply_db = 58 [F]
Q_sensible = 200000 [Btu/hr]
SHF = 0.80
V_dot_supply = 10700 [ft^3/min]
P_atm = 14.696 [psia]
rho_std = 0.075 [lbm/ft^3]   { standard air: the 4.5 in Q = 4.5 x cfm x dh is 60 min/hr x 0.075 lbm/ft^3 }

h_room = Enthalpy(AirH2O, T=T_room_db, B=T_room_wb, P=P_atm)
Q_total = Q_sensible / SHF

{ Total heat equation — h_supply solved implicitly }
Q_total = rho_std * V_dot_supply * (h_room - h_supply)
T_supply_wb = WetBulb(AirH2O, T=T_supply_db, H=h_supply, P=P_atm)

Q_total_Btuh = Q_total / (1 [Btu/hr])
T_supply_wb_F = T_supply_wb / (1 [R]) - 459.67`,
  },
  {
    value: "multistage-food-freezing",
    title: "HVAC & Refrigeration: Multi-Stage Food Freezing",
    description: "Calculates total refrigeration required to cool lean ham from 40°F to 28°F, freeze it, and then subcool it to 0°F.",
    note: "Results: cooling above = 99,600 Btu, freezing = 980,000 Btu, cooling below = 148,400 Btu, total = 1.228 x 10^6 Btu.",
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
