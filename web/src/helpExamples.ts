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
