[Topic: md-overview]
# Multi-Domain Examples

Twenty complete models that couple **solid and fluid thermal networks, refrigerant
cycles, moist air, electrical circuits, mechanics, signal blocks and sensors** in
one solve. Every model is built from the standard component library, runs as
written, and asserts its results; eighteen also carry a verified optimization
(constrained single-objective, plus one multi-objective Pareto front).

| Example | Domains | Optimization |
| --- | --- | --- |
| Battery Pack Cold Plate | electrical, heat, liquid | minimize `W_pump` over `mdot_c` |
| Cabin A/C Loop (R134a + Moist Air) | two-phase, moist air, heat | minimize `W_comp` over `rpm` |
| PEM Fuel Cell with Closed Coolant Loop | electrical, liquid, moist air, heat | maximize `P_el` over `I_st` |
| Thermoelectric (Peltier) Cooler | electrical, solid thermal | minimize `T_plate` over `V_supply` |
| Air-Cooled Finned Cylinder | solid thermal, air convection, radiation | minimize `m_fins` over `L_f` |
| Room Heater with PID Thermostat | electrical, heat, signal, sensor | minimize `t_reach` over `Kp` |
| DC Motor → Gearbox → Hydraulic Pump | electrical, rotational, hydraulic | maximize `P_hyd` over `ratio` |
| Data-Centre Indirect Evaporative Cooler | moist air, electrical, heat | minimize `W_fans` over `m_sec` |
| Heat-Pump Water Heater (closed loop) | two-phase, liquid, moist air, heat | maximize `COP_h` over `mdot_w` |
| Transcritical CO₂: Optimum Gas-Cooler Pressure | two-phase/supercritical, heat | maximize `COP` over `P_gc` |
| Engine Warm-Up with a Wax Thermostat | heat, liquid | — (transient study) |
| DX Dehumidifier with Heat-Pipe Wrap-Around | moist air, refrigeration, electrical | maximize `MRE` over `T_adp` |
| Office Zone Pull-Down with PID Supply Air | moist air, heat, signal, sensor | — (transient study) |
| Direct-Coupled PV Water Pump | signal, electrical, rotational, hydraulic | maximize `Q_lph` over `ratio` |
| EV Drive Unit with Liquid Cooling | electrical, rotational, signal, heat, liquid | minimize `W_cpump` over `mdot_c` |
| Battery Module with PCM Passive Cooling | electrical, heat | minimize `m_module` over `m_pcm` |
| Chiller Plant with Cooling Tower | liquid, moist air, signal, electrical | minimize `W_plant` over `mdot_a` |
| Brake Heating and Thermal Fade | rotational, heat, signal | minimize `m_rotor` over `C_rotor` |
| Pt100 RTD Bridge: Self-Heating vs Resolution | electrical, heat, sensor | minimize `e_total` over `V_ex` |
| Chilled Radiant Ceiling with Dew-Point Guard | liquid, heat, moist air | maximize `Q_cool` over `T_sup` |

## Patterns these examples rely on

- **Cross-domain bridges are ports.** A refrigerant evaporator's `wall` heat port
  joins a moist-air coil's `wall`; a battery's `heat` port joins a coolant cold
  plate. One `connect` makes the two domains one node.
- **Signals drive physics through parameters.** `VoltageSource SUPPLY(E = PID.out.sig)`
  or `MoistAirSource SUP(mdot = PID.out.sig)` reads the controller output straight
  off the signal wire.
- **Closed loops close themselves.** Around a closed, mass-conserving fluid network
  exactly one mass balance is redundant, and frees drops it; pressures and
  enthalpies are still matched at every connection. A pressure datum
  (`LiquidExpansionTank`) or a charge closure (a design subcooling) supplies the
  equation a closed loop needs.
- **Seed one value per node.** A closed refrigerant loop has no source to start
  Newton from: `GUESS` one pressure and enthalpy per node — the guess (and its
  bounds) spreads across every connection and pass-through equality.
- **Bounded heat exchange.** `LiquidWallHX` uses the exact isothermal-wall
  effectiveness ε = 1 − exp(−UA/ṁc_p): the outlet stays between the inlet and
  wall temperatures at any NTU, and a shut branch (ṁ → 0) stays solvable.
- **Optimizing a model.** The independent variable must be free: remove its
  `x = …` line, then run **Tools → Minimize / Maximize**. A constraint is written
  `expression <= value`. Transient models optimize too — `FinalValue`,
  `MaxValue` and `TimeAt` outputs follow every decision value.

[Related: md-battery-coldplate, md-cabin-ac, md-fuel-cell, md-peltier, md-finned-cylinder, md-room-heater-pid, md-motor-pump, md-iec, md-hpwh, md-co2-transcritical, md-engine-warmup, md-dehumidifier, md-zone-pid, md-pv-pump, md-ev-drive, md-battery-pcm, md-cooling-tower, md-brake-fade, md-rtd-bridge, md-radiant-ceiling]

[Related: comp-first-network, comp-domains, optimization, comp-troubleshooting]

[Topic: md-battery-coldplate]
# 1. Battery Pack Cold Plate

**Domains:** electrical · heat · liquid

Domains: electrical (96s pack + load) -> heat (cell-to-plate path) -> liquid (EG50 pump, pipe and cold-plate channel). The pack's ohmic heat R0*I^2 crosses a pack-to-plate thermal resistance into the cold-plate wall; the coolant picks it up with the exact isothermal-wall effectiveness built into LiquidWallHX. The pump head closes the loop pressure drop, so pump power follows from the coolant flow.

```run
// Battery module electro-thermal with a liquid cold plate (steady)
{ Domains: electrical (96s pack + load) -> heat (cell-to-plate path) ->
  liquid (EG50 pump, pipe and cold-plate channel).
  The pack's ohmic heat R0*I^2 crosses a pack-to-plate thermal resistance
  into the cold-plate wall; the coolant picks it up with the exact
  isothermal-wall effectiveness built into LiquidWallHX. The pump head
  closes the loop pressure drop, so pump power follows from the coolant flow. }

mdot_c = 0.15 [kg/s]            { coolant flow - the design variable }
T_cin  = 288.15 [K]             { coolant inlet, 15 C }

{ ---- electrical: 96s pack, 3.7 V / 1.2 mOhm cells, resistive drive load ---- }
BatteryThermal PACK(Voc=96*3.7 [V], R0=96*0.0012 [ohm])
Resistor       LOAD(R=2.2 [ohm])
Ground         GND()
connect(PACK.p, LOAD.a)
connect(PACK.n, LOAD.b, GND.port)

{ ---- heat: lumped cell stack -> thermal pad -> cold-plate wall ---- }
ContactResistance PAD(Rth=0.004 [K/W])
connect(PACK.heat, PAD.a)

{ ---- liquid: pump -> supply pipe -> cold-plate channel -> return ---- }
LiquidSource SRC(fluid$=EG50, mdot=mdot_c, P=150000 [Pa], T=T_cin)
LiquidPump   PMP(fluid$=EG50, eta=0.45)
LiquidPipe   SUP(fluid$=EG50, L=3 [m], D=0.012 [m], rough=1.5e-6 [m])
LiquidWallHX CP(fluid$=EG50, UA=350 [W/K])
LiquidSink   RET()
connect(SRC.out, PMP.in)
connect(PMP.out, SUP.in)
connect(SUP.out, CP.in)
connect(CP.out, RET.in)
connect(CP.wall, PAD.b)
RET.in.P = 150000 [Pa]          { closed loop: the pump returns to its suction }

I_pack  = -PACK.p.I             { discharge current, A }
V_pack  = PACK.p.V - PACK.n.V   { terminal voltage, V }
Q_gen   = PACK.Q                { ohmic heat, W }
T_cell  = PACK.heat.T           { pack temperature, K }
T_plate = CP.wall.T
T_cout  = Temperature(EG50, P=CP.out.P, h=CP.out.h)
dP_loop = PMP.out.P - PMP.in.P
W_pump  = PMP.W
eta_pack = V_pack*I_pack / (PACK.Voc*I_pack)   { electrical efficiency }

{ CHECK I_pack 153.42087076710436 0.00153 }
{ CHECK Q_gen 2711.573405215089 0.0271 }
{ CHECK T_cell 309.82221800160306 0.0031 }
{ CHECK T_cout 293.63269629375293 0.00294 }
{ CHECK W_pump 2.2666879938979037 2.27e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Discharge current | `I_pack` | 153.4 A |
| Ohmic heat | `Q_gen` | 2,711.6 W |
| Pack temperature | `T_cell` | 309.8 K |
| Coolant outlet | `T_cout` | 293.6 K |
| Pump power | `W_pump` | 2.267 W |

## Optimization

Minimise pump power while keeping the pack at or below 40 °C.

| Setting | Value |
| --- | --- |
| Minimize | `W_pump` |
| Independent variable | `mdot_c` in [0.03, 0.4] |
| Constraints | `T_cell <= 313.15` |
| **Optimum** | `mdot_c` = **0.0786**, `W_pump` = **0.3104** |

In the app: delete (or comment out) the `mdot_c = …` line so `mdot_c` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Battery module electro-thermal with a liquid cold plate (steady)\n{ Domains: electrical (96s pack + load) -> heat (cell-to-plate path) ->\n  liquid (EG50 pump, pipe and cold-plate channel).\n  The pack's ohmic heat R0*I^2 crosses a pack-to-plate thermal resistance\n  into the cold-plate wall; the coolant picks it up with the exact\n  isothermal-wall effectiveness built into LiquidWallHX. The pump head\n  closes the loop pressure drop, so pump power follows from the coolant flow. }\n\nT_cin  = 288.15 [K]             { coolant inlet, 15 C }\n\n{ ---- electrical: 96s pack, 3.7 V / 1.2 mOhm cells, resistive drive load ---- }\nBatteryThermal PACK(Voc=96*3.7 [V], R0=96*0.0012 [ohm])\nResistor       LOAD(R=2.2 [ohm])\nGround         GND()\nconnect(PACK.p, LOAD.a)\nconnect(PACK.n, LOAD.b, GND.port)\n\n{ ---- heat: lumped cell stack -> thermal pad -> cold-plate wall ---- }\nContactResistance PAD(Rth=0.004 [K/W])\nconnect(PACK.heat, PAD.a)\n\n{ ---- liquid: pump -> supply pipe -> cold-plate channel -> return ---- }\nLiquidSource SRC(fluid$=EG50, mdot=mdot_c, P=150000 [Pa], T=T_cin)\nLiquidPump   PMP(fluid$=EG50, eta=0.45)\nLiquidPipe   SUP(fluid$=EG50, L=3 [m], D=0.012 [m], rough=1.5e-6 [m])\nLiquidWallHX CP(fluid$=EG50, UA=350 [W/K])\nLiquidSink   RET()\nconnect(SRC.out, PMP.in)\nconnect(PMP.out, SUP.in)\nconnect(SUP.out, CP.in)\nconnect(CP.out, RET.in)\nconnect(CP.wall, PAD.b)\nRET.in.P = 150000 [Pa]          { closed loop: the pump returns to its suction }\n\nI_pack  = -PACK.p.I             { discharge current, A }\nV_pack  = PACK.p.V - PACK.n.V   { terminal voltage, V }\nQ_gen   = PACK.Q                { ohmic heat, W }\nT_cell  = PACK.heat.T           { pack temperature, K }\nT_plate = CP.wall.T\nT_cout  = Temperature(EG50, P=CP.out.P, h=CP.out.h)\ndP_loop = PMP.out.P - PMP.in.P\nW_pump  = PMP.W\neta_pack = V_pack*I_pack / (PACK.Voc*I_pack)   { electrical efficiency }\n",
  "request": {
    "objective": "W_pump",
    "decisions": [
      "mdot_c"
    ],
    "lowers": [
      0.03
    ],
    "uppers": [
      0.4
    ],
    "constraints": [
      "T_cell <= 313.15"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 0.0785593423387036,
      "tolerance": 0.000157
    },
    {
      "path": "objective.value",
      "value": 0.3104359405152336,
      "tolerance": 0.000621
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-cabin-ac]
# 2. Cabin A/C Loop (R134a + Moist Air)

**Domains:** two-phase · moist air · heat

Domains: two-phase refrigerant (closed vapour-compression loop) + moist air (psychrometric wet coil) + heat (the shared coil wall). A fixed-displacement compressor sets the refrigerant flow from the suction density; the condenser head pressure floats against ambient through its UA. A thermostatic expansion valve holds the evaporator superheat: modelled as an ideal isenthalpic throttle whose opening is whatever the set superheat demands (a user-defined component below). The evaporator's refrigerant side and the cabin-air wet coil share one wall node, so the evaporating pressure, the sensible AND latent load and the supply-air state come out of one solve.

```run
// Automotive R134a A/C loop cooling and dehumidifying cabin air
{ Domains: two-phase refrigerant (closed vapour-compression loop) +
  moist air (psychrometric wet coil) + heat (the shared coil wall).

  A fixed-displacement compressor sets the refrigerant flow from the suction
  density; the condenser head pressure floats against ambient through its UA.
  A thermostatic expansion valve holds the evaporator superheat: modelled as
  an ideal isenthalpic throttle whose opening is whatever the set superheat
  demands (a user-defined component below). The evaporator's refrigerant side
  and the cabin-air wet coil share one wall node, so the evaporating pressure,
  the sensible AND latent load and the supply-air state come out of one solve. }

{ ---- a user-defined component: ideal TXV (no flow law of its own) ---- }
function [in, out] = IdealTXV(domain$ = twophase)
port(in)
port(out)
  out.mdot = in.mdot
  out.h    = in.h
end

rpm   = 2000                     { compressor speed - the design variable }
T_amb = 308.15 [K]               { 35 C ambient at the condenser }

{ ---- refrigerant loop ---- }
TwoPhaseCompressor     CMP(fluid$=R134a, model$=volumetric, eta=0.65, eta_v=0.85, disp=1.2e-4 [m^3], rpm=rpm)
TwoPhaseCondenserFloat COND(fluid$=R134a, UA=650 [W/K], T_amb=T_amb)
IdealTXV               TXV()
TwoPhaseEvaporatorUA   EVAP(fluid$=R134a, UA=900 [W/K], dP=5000 [Pa], SH=5 [K])
connect(CMP.out, COND.in)
connect(COND.out, TXV.in)
connect(TXV.out, EVAP.in)
connect(EVAP.out, CMP.in)
EVAP.frac = 1                    { evaporator fully wetted (steady point) }

{ ---- cabin air: 27 C, W = 0.0135 (60 % RH) drawn over the coil ---- }
MoistAirSource CABIN(P=101325 [Pa], T=300.15 [K], W=0.0135, mdot=0.25 [kg/s])
MoistAirWallHX COIL(eps=0.8)
MoistAirSink   VENT()
connect(CABIN.out, COIL.in)
connect(COIL.out, VENT.in)
connect(COIL.wall, EVAP.wall)    { the cross-domain bridge }

{ A closed loop has no source to start Newton from: seed one value per node
  (each guess spreads across every connect and pass-through equality). }
GUESS CMP.in.P   = 3.0e5 [1.2e5, 8e5]
GUESS CMP.out.P  = 1.3e6 [7e5, 3e6]
GUESS CMP.in.h   = 4.0e5
GUESS CMP.out.h  = 4.4e5
GUESS COND.out.h = 2.6e5
GUESS EVAP.wall.T = 282
GUESS COIL.T_out  = 285

P_evap    = CMP.in.P
P_cond    = CMP.out.P
T_evap    = EVAP.Tevap
mdot_ref  = CMP.in.mdot
Q_cool    = EVAP.Q                        { refrigeration capacity, W }
Q_lat     = COIL.Q_lat                    { latent (dehumidification) part, W }
SHR       = 1 - Q_lat / Q_cool            { sensible heat ratio }
W_comp    = CMP.W
COP       = Q_cool / W_comp
T_supply  = COIL.T_out
RH_supply = RelHum(AirH2O, h=VENT.h, P=VENT.P, W=VENT.W)
m_cond    = 0.25 * (0.0135 - VENT.W) * 3600   { condensate drained, kg/h }

{ CHECK P_evap 302615.09579131793 3.03 }
{ CHECK P_cond 1277877.7105402707 12.8 }
{ CHECK Q_cool 6614.643325158678 0.0661 }
{ CHECK Q_lat 2819.637596910635 0.0282 }
{ CHECK COP 2.8257981637968475 2.83e-05 }
{ CHECK T_supply 285.5255421537056 0.00286 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Evaporating pressure | `P_evap` | 3.026e+05 Pa |
| Condensing pressure | `P_cond` | 1.278e+06 Pa |
| Cooling capacity | `Q_cool` | 6,614.6 W |
| Latent load | `Q_lat` | 2,819.6 W |
| COP | `COP` | 2.826  |
| Supply-air temperature | `T_supply` | 285.5 K |

## Optimization

Minimise compressor power while still delivering 5.5 kW of cooling.

| Setting | Value |
| --- | --- |
| Minimize | `W_comp` |
| Independent variable | `rpm` in [800, 4000] |
| Constraints | `Q_cool >= 5500` |
| **Optimum** | `rpm` = **1,412.7**, `W_comp` = **1,606.5** |

In the app: delete (or comment out) the `rpm = …` line so `rpm` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Automotive R134a A/C loop cooling and dehumidifying cabin air\n{ Domains: two-phase refrigerant (closed vapour-compression loop) +\n  moist air (psychrometric wet coil) + heat (the shared coil wall).\n\n  A fixed-displacement compressor sets the refrigerant flow from the suction\n  density; the condenser head pressure floats against ambient through its UA.\n  A thermostatic expansion valve holds the evaporator superheat: modelled as\n  an ideal isenthalpic throttle whose opening is whatever the set superheat\n  demands (a user-defined component below). The evaporator's refrigerant side\n  and the cabin-air wet coil share one wall node, so the evaporating pressure,\n  the sensible AND latent load and the supply-air state come out of one solve. }\n\n{ ---- a user-defined component: ideal TXV (no flow law of its own) ---- }\nfunction [in, out] = IdealTXV(domain$ = twophase)\nport(in)\nport(out)\n  out.mdot = in.mdot\n  out.h    = in.h\nend\n\nT_amb = 308.15 [K]               { 35 C ambient at the condenser }\n\n{ ---- refrigerant loop ---- }\nTwoPhaseCompressor     CMP(fluid$=R134a, model$=volumetric, eta=0.65, eta_v=0.85, disp=1.2e-4 [m^3], rpm=rpm)\nTwoPhaseCondenserFloat COND(fluid$=R134a, UA=650 [W/K], T_amb=T_amb)\nIdealTXV               TXV()\nTwoPhaseEvaporatorUA   EVAP(fluid$=R134a, UA=900 [W/K], dP=5000 [Pa], SH=5 [K])\nconnect(CMP.out, COND.in)\nconnect(COND.out, TXV.in)\nconnect(TXV.out, EVAP.in)\nconnect(EVAP.out, CMP.in)\nEVAP.frac = 1                    { evaporator fully wetted (steady point) }\n\n{ ---- cabin air: 27 C, W = 0.0135 (60 % RH) drawn over the coil ---- }\nMoistAirSource CABIN(P=101325 [Pa], T=300.15 [K], W=0.0135, mdot=0.25 [kg/s])\nMoistAirWallHX COIL(eps=0.8)\nMoistAirSink   VENT()\nconnect(CABIN.out, COIL.in)\nconnect(COIL.out, VENT.in)\nconnect(COIL.wall, EVAP.wall)    { the cross-domain bridge }\n\n{ A closed loop has no source to start Newton from: seed one value per node\n  (each guess spreads across every connect and pass-through equality). }\nGUESS CMP.in.P   = 3.0e5 [1.2e5, 8e5]\nGUESS CMP.out.P  = 1.3e6 [7e5, 3e6]\nGUESS CMP.in.h   = 4.0e5\nGUESS CMP.out.h  = 4.4e5\nGUESS COND.out.h = 2.6e5\nGUESS EVAP.wall.T = 282\nGUESS COIL.T_out  = 285\n\nP_evap    = CMP.in.P\nP_cond    = CMP.out.P\nT_evap    = EVAP.Tevap\nmdot_ref  = CMP.in.mdot\nQ_cool    = EVAP.Q                        { refrigeration capacity, W }\nQ_lat     = COIL.Q_lat                    { latent (dehumidification) part, W }\nSHR       = 1 - Q_lat / Q_cool            { sensible heat ratio }\nW_comp    = CMP.W\nCOP       = Q_cool / W_comp\nT_supply  = COIL.T_out\nRH_supply = RelHum(AirH2O, h=VENT.h, P=VENT.P, W=VENT.W)\nm_cond    = 0.25 * (0.0135 - VENT.W) * 3600   { condensate drained, kg/h }\n",
  "request": {
    "objective": "W_comp",
    "decisions": [
      "rpm"
    ],
    "lowers": [
      800
    ],
    "uppers": [
      4000
    ],
    "constraints": [
      "Q_cool >= 5500"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 1412.716083526611,
      "tolerance": 2.83
    },
    {
      "path": "objective.value",
      "value": 1606.4652182878935,
      "tolerance": 3.21
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-fuel-cell]
# 3. PEM Fuel Cell with Closed Coolant Loop

**Domains:** electrical · liquid · moist air · heat

Domains: electrical (stack polarization curve under a current load) + liquid (closed EG50 loop: head-curve pump, stack cooling channels, radiator tubes, balancing orifice, expansion tank) + heat (the two exchanger walls) + moist air (radiator air side). FuelCellStackCooled computes the cell voltage from activation (Tafel), ohmic and concentration losses and dumps the waste heat I*ncells*(E_th - V_cell) into its coolant channels. The coolant loop is CLOSED: the pump operating point is where its head curve meets the loop resistance, the expansion tank fixes the pressure datum, and the coolant temperatures float until the radiator rejects exactly the stack heat.

```run
// PEM fuel-cell stack with a closed coolant loop and an air-cooled radiator
{ Domains: electrical (stack polarization curve under a current load) +
  liquid (closed EG50 loop: head-curve pump, stack cooling channels,
  radiator tubes, balancing orifice, expansion tank) + heat (the two
  exchanger walls) + moist air (radiator air side).

  FuelCellStackCooled computes the cell voltage from activation (Tafel),
  ohmic and concentration losses and dumps the waste heat
  I*ncells*(E_th - V_cell) into its coolant channels. The coolant loop is
  CLOSED: the pump operating point is where its head curve meets the loop
  resistance, the expansion tank fixes the pressure datum, and the coolant
  temperatures float until the radiator rejects exactly the stack heat. }

I_st = 300 [A]                     { stack current - the design variable }

TABLE pumphead(Q [m^3/s]) [m]      { pump head curve: volume flow -> head }
  0        25
  0.0008   23
  0.0016   18
  0.0024   10
  0.0030   2
END

{ ---- electrical: 300 cells x 300 cm2 under an electronic load ---- }
FuelCellStackCooled STACK(ncells=300, area=0.03 [m^2], i0=1 [A/m^2], ilim=20000 [A/m^2], Rohm=1e-5 [ohm-m^2], E0=1.2 [V], alpha=0.7, Eth=1.25 [V], T=353 [K], fluid$=EG50, UA=9000 [W/K])
CurrentSource       LOAD(I=I_st)
Ground              GND()
connect(STACK.p, LOAD.n)
connect(STACK.n, LOAD.p, GND.port)

{ ---- closed coolant loop ---- }
LiquidPumpMap       PUMP(rho=1060 [kg/m^3], eta=0.55, map$=pumphead)
LiquidWallHX        RADL(fluid$=EG50, UA=5000 [W/K])    { radiator tubes }
LiquidOrifice       BAL(CdA=8e-5 [m^2], rho=1060 [kg/m^3])                   { loop resistance }
LiquidExpansionTank ET(P=150000 [Pa])
connect(PUMP.out, STACK.cool_in)
connect(STACK.cool_out, RADL.in)
connect(RADL.out, BAL.in)
connect(BAL.out, PUMP.in, ET.port)

{ ---- radiator air side: 2.5 kg/s of 35 C air ---- }
MoistAirSource AIR(P=101325 [Pa], T=308.15 [K], W=0.010, mdot=2.5 [kg/s])
MoistAirWallHX RADA(eps=0.65)
MoistAirSink   EXH()
connect(AIR.out, RADA.in)
connect(RADA.out, EXH.in)
connect(RADL.wall, RADA.wall)

GUESS PUMP.in.h    = 1.9e5
GUESS PUMP.in.mdot = 1.5
GUESS RADL.wall.T  = 342
GUESS RADA.T_out   = 330

V_stack = STACK.p.V - STACK.n.V
V_cell  = V_stack / 300
P_el    = V_stack * I_st                     { electrical output, W }
Q_stack = STACK.FC.Q                          { waste heat into coolant, W }
eta_LHV = V_cell / 1.25                       { stack efficiency on LHV }
mdot_c  = PUMP.in.mdot
T_c_in  = Temperature(EG50, P=STACK.cool_in.P, h=STACK.cool_in.h)
T_c_out = Temperature(EG50, P=STACK.cool_out.P, h=STACK.cool_out.h)
W_pump  = PUMP.W
T_air_out = RADA.T_out

{ CHECK V_cell 0.6892345831970559 6.89e-06 }
{ CHECK P_el 62031.11248773503 0.62 }
{ CHECK Q_stack 50468.88751226497 0.505 }
{ CHECK mdot_c 1.614471904589662 1.61e-05 }
{ CHECK T_c_out 353.97340968069415 0.00354 }
{ CHECK T_air_out 328.03354056626966 0.00328 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Cell voltage | `V_cell` | 0.6892 V |
| Electrical output | `P_el` | 62,031.1 W |
| Waste heat | `Q_stack` | 50,468.9 W |
| Coolant flow | `mdot_c` | 1.614 kg/s |
| Coolant leaving the stack | `T_c_out` | 354.0 K |
| Radiator air out | `T_air_out` | 328.0 K |

## Optimization

Maximise electrical output with the coolant leaving the stack at or below 85 °C.

| Setting | Value |
| --- | --- |
| Maximize | `P_el` |
| Independent variable | `I_st` in [200, 380] |
| Constraints | `T_c_out <= 358.15` |
| **Optimum** | `I_st` = **321.4**, `P_el` = **65,366.1** |

In the app: delete (or comment out) the `I_st = …` line so `I_st` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// PEM fuel-cell stack with a closed coolant loop and an air-cooled radiator\n{ Domains: electrical (stack polarization curve under a current load) +\n  liquid (closed EG50 loop: head-curve pump, stack cooling channels,\n  radiator tubes, balancing orifice, expansion tank) + heat (the two\n  exchanger walls) + moist air (radiator air side).\n\n  FuelCellStackCooled computes the cell voltage from activation (Tafel),\n  ohmic and concentration losses and dumps the waste heat\n  I*ncells*(E_th - V_cell) into its coolant channels. The coolant loop is\n  CLOSED: the pump operating point is where its head curve meets the loop\n  resistance, the expansion tank fixes the pressure datum, and the coolant\n  temperatures float until the radiator rejects exactly the stack heat. }\n\n\nTABLE pumphead(Q [m^3/s]) [m]      { pump head curve: volume flow -> head }\n  0        25\n  0.0008   23\n  0.0016   18\n  0.0024   10\n  0.0030   2\nEND\n\n{ ---- electrical: 300 cells x 300 cm2 under an electronic load ---- }\nFuelCellStackCooled STACK(ncells=300, area=0.03 [m^2], i0=1 [A/m^2], ilim=20000 [A/m^2], Rohm=1e-5 [ohm-m^2], E0=1.2 [V], alpha=0.7, Eth=1.25 [V], T=353 [K], fluid$=EG50, UA=9000 [W/K])\nCurrentSource       LOAD(I=I_st)\nGround              GND()\nconnect(STACK.p, LOAD.n)\nconnect(STACK.n, LOAD.p, GND.port)\n\n{ ---- closed coolant loop ---- }\nLiquidPumpMap       PUMP(rho=1060 [kg/m^3], eta=0.55, map$=pumphead)\nLiquidWallHX        RADL(fluid$=EG50, UA=5000 [W/K])    { radiator tubes }\nLiquidOrifice       BAL(CdA=8e-5 [m^2], rho=1060 [kg/m^3])                   { loop resistance }\nLiquidExpansionTank ET(P=150000 [Pa])\nconnect(PUMP.out, STACK.cool_in)\nconnect(STACK.cool_out, RADL.in)\nconnect(RADL.out, BAL.in)\nconnect(BAL.out, PUMP.in, ET.port)\n\n{ ---- radiator air side: 2.5 kg/s of 35 C air ---- }\nMoistAirSource AIR(P=101325 [Pa], T=308.15 [K], W=0.010, mdot=2.5 [kg/s])\nMoistAirWallHX RADA(eps=0.65)\nMoistAirSink   EXH()\nconnect(AIR.out, RADA.in)\nconnect(RADA.out, EXH.in)\nconnect(RADL.wall, RADA.wall)\n\nGUESS PUMP.in.h    = 1.9e5\nGUESS PUMP.in.mdot = 1.5\nGUESS RADL.wall.T  = 342\nGUESS RADA.T_out   = 330\n\nV_stack = STACK.p.V - STACK.n.V\nV_cell  = V_stack / 300\nP_el    = V_stack * I_st                     { electrical output, W }\nQ_stack = STACK.FC.Q                          { waste heat into coolant, W }\neta_LHV = V_cell / 1.25                       { stack efficiency on LHV }\nmdot_c  = PUMP.in.mdot\nT_c_in  = Temperature(EG50, P=STACK.cool_in.P, h=STACK.cool_in.h)\nT_c_out = Temperature(EG50, P=STACK.cool_out.P, h=STACK.cool_out.h)\nW_pump  = PUMP.W\nT_air_out = RADA.T_out\n",
  "request": {
    "objective": "P_el",
    "maximize": true,
    "decisions": [
      "I_st"
    ],
    "lowers": [
      200
    ],
    "uppers": [
      380
    ],
    "constraints": [
      "T_c_out <= 358.15"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 321.36824756860733,
      "tolerance": 0.643
    },
    {
      "path": "objective.value",
      "value": 65366.12737258201,
      "tolerance": 131.0
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-peltier]
# 4. Thermoelectric (Peltier) Cooler

**Domains:** electrical · solid thermal

Domains: electrical (DC supply driving the module) + solid thermal network (cold plate, thermal interface, module, finned heat sink, ambient). PeltierTEC couples the two exactly: Seebeck back-EMF and ohmic drop on the electrical side; Peltier pumping, half-Joule heating and back-conduction on the thermal side, so Q_hot - Q_cold = V*I holds identically. Module data: 127 couples, Seebeck 0.053 V/K, R = 1.9 Ohm, K = 0.55 W/K.

```run
// Thermoelectric (Peltier) cooler for an electronics cold plate
{ Domains: electrical (DC supply driving the module) + solid thermal network
  (cold plate, thermal interface, module, finned heat sink, ambient).
  PeltierTEC couples the two exactly: Seebeck back-EMF and ohmic drop on the
  electrical side; Peltier pumping, half-Joule heating and back-conduction on
  the thermal side, so Q_hot - Q_cold = V*I holds identically.
  Module data: 127 couples, Seebeck 0.053 V/K, R = 1.9 Ohm, K = 0.55 W/K. }

V_supply = 6 [V]                  { supply voltage - the design variable }
Q_load   = 18 [W]                 { heat the electronics dump into the cold plate }
T_amb    = 298.15 [K]

VoltageSource PSU(E=V_supply)
Ground        GND()
PeltierTEC    TEC(Sab=0.053 [V/K], Rel=1.9 [ohm], Kth=0.55 [W/K])
connect(PSU.p, TEC.p)
connect(PSU.n, TEC.n, GND.port)

HeatSource        CHIP(Q=Q_load)
ContactResistance TIM_C(Rth=0.08 [K/W])     { cold plate -> module (grease) }
ContactResistance TIM_H(Rth=0.05 [K/W])     { module -> heat-sink base }
Convection        SINK(htc=45 [W/m^2-K], area=0.09 [m^2])   { finned sink: hA = 4.05 W/K }
ThermalSource     AMB(T=T_amb)
connect(CHIP.port, TIM_C.a)
connect(TIM_C.b, TEC.cold)
connect(TEC.hot, TIM_H.a)
connect(TIM_H.b, SINK.a)
connect(SINK.b, AMB.port)

I_tec   = TEC.I
P_el    = V_supply * I_tec            { electrical input, W }
T_plate = CHIP.port.T                 { electronics cold-plate temperature }
T_cold  = TEC.cold.T
T_hot   = TEC.hot.T
COP     = Q_load / P_el
Q_rej   = TEC.Qh                      { heat rejected to the sink, W }

{ CHECK I_tec 2.47803136594324 2.48e-05 }
{ CHECK P_el 14.868188195659439 0.000149 }
{ CHECK T_plate 284.97655096721684 0.00285 }
{ CHECK T_hot 307.90901143340255 0.00308 }
{ CHECK COP 1.2106384290491325 1.21e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Module current | `I_tec` | 2.478 A |
| Electrical input | `P_el` | 14.868 W |
| Cold-plate temperature | `T_plate` | 285.0 K |
| Hot-side temperature | `T_hot` | 307.9 K |
| COP | `COP` | 1.211  |

## Optimization

Find the supply voltage that gives the coldest plate — then trace the full temperature-versus-power Pareto front.

| Setting | Value |
| --- | --- |
| Minimize | `T_plate` |
| Independent variable | `V_supply` in [0.5, 14] |
| Constraints | none |
| **Optimum** | `V_supply` = **13.052**, `T_plate` = **269.7** |

In the app: delete (or comment out) the `V_supply = …` line so `V_supply` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Thermoelectric (Peltier) cooler for an electronics cold plate\n{ Domains: electrical (DC supply driving the module) + solid thermal network\n  (cold plate, thermal interface, module, finned heat sink, ambient).\n  PeltierTEC couples the two exactly: Seebeck back-EMF and ohmic drop on the\n  electrical side; Peltier pumping, half-Joule heating and back-conduction on\n  the thermal side, so Q_hot - Q_cold = V*I holds identically.\n  Module data: 127 couples, Seebeck 0.053 V/K, R = 1.9 Ohm, K = 0.55 W/K. }\n\nQ_load   = 18 [W]                 { heat the electronics dump into the cold plate }\nT_amb    = 298.15 [K]\n\nVoltageSource PSU(E=V_supply)\nGround        GND()\nPeltierTEC    TEC(Sab=0.053 [V/K], Rel=1.9 [ohm], Kth=0.55 [W/K])\nconnect(PSU.p, TEC.p)\nconnect(PSU.n, TEC.n, GND.port)\n\nHeatSource        CHIP(Q=Q_load)\nContactResistance TIM_C(Rth=0.08 [K/W])     { cold plate -> module (grease) }\nContactResistance TIM_H(Rth=0.05 [K/W])     { module -> heat-sink base }\nConvection        SINK(htc=45 [W/m^2-K], area=0.09 [m^2])   { finned sink: hA = 4.05 W/K }\nThermalSource     AMB(T=T_amb)\nconnect(CHIP.port, TIM_C.a)\nconnect(TIM_C.b, TEC.cold)\nconnect(TEC.hot, TIM_H.a)\nconnect(TIM_H.b, SINK.a)\nconnect(SINK.b, AMB.port)\n\nI_tec   = TEC.I\nP_el    = V_supply * I_tec            { electrical input, W }\nT_plate = CHIP.port.T                 { electronics cold-plate temperature }\nT_cold  = TEC.cold.T\nT_hot   = TEC.hot.T\nCOP     = Q_load / P_el\nQ_rej   = TEC.Qh                      { heat rejected to the sink, W }\n",
  "request": {
    "objective": "T_plate",
    "decisions": [
      "V_supply"
    ],
    "lowers": [
      0.5
    ],
    "uppers": [
      14
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 13.051927185357163,
      "tolerance": 0.0261
    },
    {
      "path": "objective.value",
      "value": 269.67958831602266,
      "tolerance": 0.539
    }
  ]
}
```

**Pareto front.** Colder costs power: tracing both objectives with NSGA-II (**Tools → Minimize / Maximize → Multi-objective**) gives the trade-off curve between plate temperature and electrical input.

```json
{
  "operation": "optimize_multi",
  "text": "// Thermoelectric (Peltier) cooler for an electronics cold plate\n{ Domains: electrical (DC supply driving the module) + solid thermal network\n  (cold plate, thermal interface, module, finned heat sink, ambient).\n  PeltierTEC couples the two exactly: Seebeck back-EMF and ohmic drop on the\n  electrical side; Peltier pumping, half-Joule heating and back-conduction on\n  the thermal side, so Q_hot - Q_cold = V*I holds identically.\n  Module data: 127 couples, Seebeck 0.053 V/K, R = 1.9 Ohm, K = 0.55 W/K. }\n\nQ_load   = 18 [W]                 { heat the electronics dump into the cold plate }\nT_amb    = 298.15 [K]\n\nVoltageSource PSU(E=V_supply)\nGround        GND()\nPeltierTEC    TEC(Sab=0.053 [V/K], Rel=1.9 [ohm], Kth=0.55 [W/K])\nconnect(PSU.p, TEC.p)\nconnect(PSU.n, TEC.n, GND.port)\n\nHeatSource        CHIP(Q=Q_load)\nContactResistance TIM_C(Rth=0.08 [K/W])     { cold plate -> module (grease) }\nContactResistance TIM_H(Rth=0.05 [K/W])     { module -> heat-sink base }\nConvection        SINK(htc=45 [W/m^2-K], area=0.09 [m^2])   { finned sink: hA = 4.05 W/K }\nThermalSource     AMB(T=T_amb)\nconnect(CHIP.port, TIM_C.a)\nconnect(TIM_C.b, TEC.cold)\nconnect(TEC.hot, TIM_H.a)\nconnect(TIM_H.b, SINK.a)\nconnect(SINK.b, AMB.port)\n\nI_tec   = TEC.I\nP_el    = V_supply * I_tec            { electrical input, W }\nT_plate = CHIP.port.T                 { electronics cold-plate temperature }\nT_cold  = TEC.cold.T\nT_hot   = TEC.hot.T\nCOP     = Q_load / P_el\nQ_rej   = TEC.Qh                      { heat rejected to the sink, W }\n",
  "request": {
    "objectives": [
      "T_plate",
      "P_el"
    ],
    "maximize": [
      false,
      false
    ],
    "decisions": [
      "V_supply"
    ],
    "lowers": [
      1
    ],
    "uppers": [
      13
    ],
    "populationSize": 40,
    "generations": 40
  },
  "checks": [
    {
      "path": "front.length",
      "value": 38,
      "tolerance": 3
    },
    {
      "path": "evaluations",
      "value": 1640,
      "tolerance": 0
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-finned-cylinder]
# 5. Air-Cooled Finned Cylinder

**Domains:** solid thermal · air convection · radiation

Domains: solid thermal network (combustion heat -> aluminium barrel wall -> finned outer surface) + air-side convection (Zukauskas cross-flow film coefficient from the htc_extair correlation, fin efficiency from the fin parameter mL) + surface radiation to the surroundings. The finned surface is one Convection element whose area is the base area plus the efficiency-weighted fin area; the fin efficiency depends on the air-side coefficient, so geometry, air flow and temperatures solve together.

```run
// Air-cooled engine cylinder: finned barrel sized from a cross-flow correlation
{ Domains: solid thermal network (combustion heat -> aluminium barrel wall ->
  finned outer surface) + air-side convection (Zukauskas cross-flow film
  coefficient from the htc_extair correlation, fin efficiency from the
  fin parameter mL) + surface radiation to the surroundings.

  The finned surface is one Convection element whose area is the base area
  plus the efficiency-weighted fin area; the fin efficiency depends on the
  air-side coefficient, so geometry, air flow and temperatures solve together. }

L_f    = 0.030 [m]            { fin length - the design variable }
N_fin  = 12                   { fins along the barrel }
t_fin  = 0.0025 [m]           { fin thickness }
k_al   = 160 [W/m-K]          { cast aluminium }
rho_al = 2700 [kg/m^3]
D_out  = 0.090 [m]            { barrel outer diameter }
H_cyl  = 0.110 [m]            { barrel height }
Q_comb = 3500 [W]             { heat entering the liner from combustion }
T_air  = 308.15 [K]

{ air side: 0.35 kg/s of ram air across the barrel }
h_air  = htc_extair('Air', 101325, T_air, 0.35, D_out + 2*L_f, 0.03)
mL     = L_f * sqrt(2 * h_air / (k_al * t_fin))
eta_f  = fin_efficiency(mL)
A_base = pi# * D_out * (H_cyl - N_fin * t_fin)
A_fins = N_fin * 2 * pi# / 4 * ((D_out + 2*L_f)^2 - D_out^2)
A_eff  = A_base + eta_f * A_fins
A_rad  = pi# * (D_out + 2*L_f) * H_cyl          { envelope that radiates }
m_fins = rho_al * N_fin * t_fin * pi# / 4 * ((D_out + 2*L_f)^2 - D_out^2)

HeatSource    COMB(Q=Q_comb)
Conduction    WALL(k=k_al, area=pi# * (D_out - 0.006) * H_cyl, L=0.006 [m])
Convection    FINS(htc=h_air, area=A_eff)
Radiation     RAD(emis=0.85, area=A_rad)
ThermalSource AMB(T=T_air)
connect(COMB.port, WALL.a)
connect(WALL.b, FINS.a, RAD.a)
connect(FINS.b, RAD.b, AMB.port)

T_liner = COMB.port.T            { inner liner temperature }
T_fin_root = WALL.b.T
Q_conv  = FINS.Q
Q_rad   = RAD.Q

{ CHECK h_air 57.61729099824316 0.000576 }
{ CHECK eta_f 0.9216861655221865 9.22e-06 }
{ CHECK T_liner 525.1079115172535 0.00525 }
{ CHECK Q_rad 160.97244817289024 0.00161 }
{ CHECK m_fins 0.9160884177867836 9.16e-06 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Air-side film coefficient | `h_air` | 57.617 W/m^2-K |
| Fin efficiency | `eta_f` | 0.9217  |
| Liner temperature | `T_liner` | 525.1 K |
| Radiated heat | `Q_rad` | 161.0 W |
| Fin mass | `m_fins` | 0.9161 kg |

## Optimization

Minimise fin mass with the liner at or below 200 °C.

| Setting | Value |
| --- | --- |
| Minimize | `m_fins` |
| Independent variable | `L_f` in [0.005, 0.06] |
| Constraints | `T_liner <= 473.15` |
| **Optimum** | `L_f` = **0.0423**, `m_fins` = **1.425** |

In the app: delete (or comment out) the `L_f = …` line so `L_f` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Air-cooled engine cylinder: finned barrel sized from a cross-flow correlation\n{ Domains: solid thermal network (combustion heat -> aluminium barrel wall ->\n  finned outer surface) + air-side convection (Zukauskas cross-flow film\n  coefficient from the htc_extair correlation, fin efficiency from the\n  fin parameter mL) + surface radiation to the surroundings.\n\n  The finned surface is one Convection element whose area is the base area\n  plus the efficiency-weighted fin area; the fin efficiency depends on the\n  air-side coefficient, so geometry, air flow and temperatures solve together. }\n\nN_fin  = 12                   { fins along the barrel }\nt_fin  = 0.0025 [m]           { fin thickness }\nk_al   = 160 [W/m-K]          { cast aluminium }\nrho_al = 2700 [kg/m^3]\nD_out  = 0.090 [m]            { barrel outer diameter }\nH_cyl  = 0.110 [m]            { barrel height }\nQ_comb = 3500 [W]             { heat entering the liner from combustion }\nT_air  = 308.15 [K]\n\n{ air side: 0.35 kg/s of ram air across the barrel }\nh_air  = htc_extair('Air', 101325, T_air, 0.35, D_out + 2*L_f, 0.03)\nmL     = L_f * sqrt(2 * h_air / (k_al * t_fin))\neta_f  = fin_efficiency(mL)\nA_base = pi# * D_out * (H_cyl - N_fin * t_fin)\nA_fins = N_fin * 2 * pi# / 4 * ((D_out + 2*L_f)^2 - D_out^2)\nA_eff  = A_base + eta_f * A_fins\nA_rad  = pi# * (D_out + 2*L_f) * H_cyl          { envelope that radiates }\nm_fins = rho_al * N_fin * t_fin * pi# / 4 * ((D_out + 2*L_f)^2 - D_out^2)\n\nHeatSource    COMB(Q=Q_comb)\nConduction    WALL(k=k_al, area=pi# * (D_out - 0.006) * H_cyl, L=0.006 [m])\nConvection    FINS(htc=h_air, area=A_eff)\nRadiation     RAD(emis=0.85, area=A_rad)\nThermalSource AMB(T=T_air)\nconnect(COMB.port, WALL.a)\nconnect(WALL.b, FINS.a, RAD.a)\nconnect(FINS.b, RAD.b, AMB.port)\n\nT_liner = COMB.port.T            { inner liner temperature }\nT_fin_root = WALL.b.T\nQ_conv  = FINS.Q\nQ_rad   = RAD.Q\n",
  "request": {
    "objective": "m_fins",
    "decisions": [
      "L_f"
    ],
    "lowers": [
      0.005
    ],
    "uppers": [
      0.06
    ],
    "constraints": [
      "T_liner <= 473.15"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 0.04232183328596875,
      "tolerance": 8.46e-05
    },
    {
      "path": "objective.value",
      "value": 1.425052528152747,
      "tolerance": 0.00285
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-room-heater-pid]
# 6. Room Heater with PID Thermostat

**Domains:** electrical · heat · signal · sensor

Domains: electrical (mains-fed resistive heater, voltage commanded by the controller) -> heat (room air + furniture thermal mass, envelope losses to winter ambient) -> sensor (thermistor with first-order lag) -> signal (PID with output clamping and anti-windup). The PID output is the heater voltage: the VoltageSource reads it straight from the signal wire, VoltageSource SUPPLY(E = PID.out.sig).

```run
// Electric room heater under PID thermostat control with sensor lag
{ Domains: electrical (mains-fed resistive heater, voltage commanded by the
  controller) -> heat (room air + furniture thermal mass, envelope losses to
  winter ambient) -> sensor (thermistor with first-order lag) -> signal (PID
  with output clamping and anti-windup).
  The PID output is the heater voltage: the VoltageSource reads it straight
  from the signal wire, VoltageSource SUPPLY(E = PID.out.sig). }

Kp = 40                            { proportional gain, V/K - the tuning variable }

SigConstant     SET(k=294.15)                       { 21 C setpoint }
SigThermalProbe PROBE()
SigFirstOrder   SENSOR(tau=90, y0=278.15)            { thermistor lag, 90 s }
SigPID          PID(model$=clamped, Kp=Kp, Ki=0.08, Kd=0, tau=1, i0=0, d0=0, umin=0, umax=230, Taw=60)
connect(SET.out, PID.sp)
connect(PROBE.out, SENSOR.in)
connect(SENSOR.out, PID.pv)

VoltageSource   SUPPLY(E = PID.out.sig)
HeatingResistor HEATER(R=17.63 [ohm])                     { 3 kW at 230 V }
Ground          GND()
connect(SUPPLY.p, HEATER.p)
connect(SUPPLY.n, HEATER.n, GND.port)

ThermalMass ROOM(C=4.0e5 [J/K], T0=278.15 [K])                { air + furnishings, starts at 5 C }
Convection  ENVELOPE(htc=1 [W/m^2-K], area=55 [m^2])                { UA = 55 W/K }
ThermalSource OUTSIDE(T=268.15 [K])                     { -5 C }
connect(HEATER.heat, ROOM.port, PROBE.port, ENVELOPE.a)
connect(ENVELOPE.b, OUTSIDE.port)

DYNAMIC warmup(method = ode23s, time = 0 .. 10800, points = 1081)
END

T_final  = FinalValue('room.port.t')
T_peak   = MaxValue('room.port.t')
overshoot = T_peak - 294.15
t_reach  = TimeAt('room.port.t', 293.15)            { first time within 1 K }
P_avg    = ODEAvg('heater.q')                        { mean heater power, W }
E_kWh    = P_avg * 10800 / 3.6e6

{ CHECK T_final 294.15396601300506 0.0294 }
{ CHECK overshoot 1.8149237409300554 0.000181 }
{ CHECK t_reach 2985.1805879016406 0.299 }
{ CHECK P_avg 1908.6191845114386 0.191 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Room temperature at 3 h | `T_final` | 294.2 K |
| Overshoot | `overshoot` | 1.815 K |
| Time to within 1 K | `t_reach` | 2,985.2 s |
| Mean heater power | `P_avg` | 1,908.6 W |

## Optimization

Tune Kp for the fastest warm-up with at most 0.3 K overshoot.

| Setting | Value |
| --- | --- |
| Minimize | `t_reach` |
| Independent variable | `Kp` in [40, 120] |
| Constraints | `overshoot <= 0.3` |
| **Optimum** | `Kp` = **80.469**, `t_reach` = **2,985.2** |

In the app: delete (or comment out) the `Kp = …` line so `Kp` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Electric room heater under PID thermostat control with sensor lag\n{ Domains: electrical (mains-fed resistive heater, voltage commanded by the\n  controller) -> heat (room air + furniture thermal mass, envelope losses to\n  winter ambient) -> sensor (thermistor with first-order lag) -> signal (PID\n  with output clamping and anti-windup).\n  The PID output is the heater voltage: the VoltageSource reads it straight\n  from the signal wire, VoltageSource SUPPLY(E = PID.out.sig). }\n\n\nSigConstant     SET(k=294.15)                       { 21 C setpoint }\nSigThermalProbe PROBE()\nSigFirstOrder   SENSOR(tau=90, y0=278.15)            { thermistor lag, 90 s }\nSigPID          PID(model$=clamped, Kp=Kp, Ki=0.08, Kd=0, tau=1, i0=0, d0=0, umin=0, umax=230, Taw=60)\nconnect(SET.out, PID.sp)\nconnect(PROBE.out, SENSOR.in)\nconnect(SENSOR.out, PID.pv)\n\nVoltageSource   SUPPLY(E = PID.out.sig)\nHeatingResistor HEATER(R=17.63 [ohm])                     { 3 kW at 230 V }\nGround          GND()\nconnect(SUPPLY.p, HEATER.p)\nconnect(SUPPLY.n, HEATER.n, GND.port)\n\nThermalMass ROOM(C=4.0e5 [J/K], T0=278.15 [K])                { air + furnishings, starts at 5 C }\nConvection  ENVELOPE(htc=1 [W/m^2-K], area=55 [m^2])                { UA = 55 W/K }\nThermalSource OUTSIDE(T=268.15 [K])                     { -5 C }\nconnect(HEATER.heat, ROOM.port, PROBE.port, ENVELOPE.a)\nconnect(ENVELOPE.b, OUTSIDE.port)\n\nDYNAMIC warmup(method = ode23s, time = 0 .. 10800, points = 1081)\nEND\n\nT_final  = FinalValue('room.port.t')\nT_peak   = MaxValue('room.port.t')\novershoot = T_peak - 294.15\nt_reach  = TimeAt('room.port.t', 293.15)            { first time within 1 K }\nP_avg    = ODEAvg('heater.q')                        { mean heater power, W }\nE_kWh    = P_avg * 10800 / 3.6e6\n",
  "request": {
    "objective": "t_reach",
    "decisions": [
      "Kp"
    ],
    "lowers": [
      40
    ],
    "uppers": [
      120
    ],
    "constraints": [
      "overshoot <= 0.3"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 80.46875,
      "tolerance": 0.161
    },
    {
      "path": "objective.value",
      "value": 2985.181837015358,
      "tolerance": 5.97
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-motor-pump]
# 7. DC Motor → Gearbox → Hydraulic Pump

**Domains:** electrical · rotational · hydraulic

Domains: electrical (24 V battery with internal resistance, permanent- magnet DC motor) + rotational mechanics (gear reduction, torque balance at each shaft) + oil hydraulics (fixed-displacement pump, load orifice, tank). At steady state the shaft speed is where the motor torque, reflected through the gear, balances the pump torque that the orifice pressure demands. Hydraulic power P = Q*dP rises with speed while the motor's torque falls with back-EMF, so the gear ratio has a best "impedance match" - the one that extracts the most hydraulic power.

```run
// Battery-powered DC motor driving a hydraulic pump through a gearbox
{ Domains: electrical (24 V battery with internal resistance, permanent-
  magnet DC motor) + rotational mechanics (gear reduction, torque balance at
  each shaft) + oil hydraulics (fixed-displacement pump, load orifice, tank).

  At steady state the shaft speed is where the motor torque, reflected
  through the gear, balances the pump torque that the orifice pressure
  demands. Hydraulic power P = Q*dP rises with speed while the motor's
  torque falls with back-EMF, so the gear ratio has a best "impedance
  match" - the one that extracts the most hydraulic power. }

ratio = 2.0                         { motor : pump speed ratio - the design variable }

Battery       BAT(Voc=24 [V], R0=0.02 [ohm])
DCMotor       MOT(Kt=0.06 [N-m/A], Ke=0.06 [N-m/A], R=0.08 [ohm])
Ground        GND()
connect(BAT.p, MOT.p)
connect(BAT.n, MOT.n, GND.port)

Gear          GB(ratio=ratio)
connect(MOT.shaft, GB.in)

HydraulicSupply  SUC(P=1.0e5 [Pa])
HydraulicPump    PMP(disp=1.0e-5 [m^3], rho=870 [kg/m^3], eta_v=0.92, eta_m=0.88)
HydraulicOrifice LOAD(CdA=1.5e-6 [m^2], rho=870 [kg/m^3])
HydraulicTank    TNK(P=1.0e5 [Pa])
connect(GB.out, PMP.shaft)
connect(SUC.out, PMP.in)
connect(PMP.out, LOAD.in)
connect(LOAD.out, TNK.port)

I_mot   = MOT.p.I                          { motor current, A }
V_mot   = MOT.p.V - MOT.n.V
P_el    = V_mot * I_mot                    { electrical input to the motor, W }
w_mot   = MOT.shaft.w * 60 / (2*pi#)       { motor speed, rpm }
w_pump  = GB.out.w * 60 / (2*pi#)          { pump speed, rpm }
Q_lpm   = PMP.out.mdot / 870 * 60000       { delivered flow, L/min }
dP_bar  = (PMP.out.P - PMP.in.P) / 1e5
P_hyd   = PMP.out.mdot / 870 * (PMP.out.P - PMP.in.P)   { hydraulic power, W }
eta_sys = P_hyd / P_el

{ CHECK I_mot 93.3278909822299 0.000933 }
{ CHECK w_mot 2334.359116389147 0.0233 }
{ CHECK dP_bar 61.92346336383029 0.000619 }
{ CHECK Q_lpm 10.738051935390068 0.000107 }
{ CHECK P_hyd 1108.2289427000565 0.0111 }
{ CHECK eta_sys 0.5364991965243422 5.36e-06 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Motor current | `I_mot` | 93.328 A |
| Motor speed | `w_mot` | 2,334.4 rpm |
| Pump pressure rise | `dP_bar` | 61.923 bar |
| Delivered flow | `Q_lpm` | 10.738 L/min |
| Hydraulic power | `P_hyd` | 1,108.2 W |
| System efficiency | `eta_sys` | 0.5365  |

## Optimization

Choose the gear ratio that extracts the most hydraulic power from the 24 V supply.

| Setting | Value |
| --- | --- |
| Maximize | `P_hyd` |
| Independent variable | `ratio` in [0.3, 8] |
| Constraints | none |
| **Optimum** | `ratio` = **1.609**, `P_hyd` = **1,165.8** |

In the app: delete (or comment out) the `ratio = …` line so `ratio` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Battery-powered DC motor driving a hydraulic pump through a gearbox\n{ Domains: electrical (24 V battery with internal resistance, permanent-\n  magnet DC motor) + rotational mechanics (gear reduction, torque balance at\n  each shaft) + oil hydraulics (fixed-displacement pump, load orifice, tank).\n\n  At steady state the shaft speed is where the motor torque, reflected\n  through the gear, balances the pump torque that the orifice pressure\n  demands. Hydraulic power P = Q*dP rises with speed while the motor's\n  torque falls with back-EMF, so the gear ratio has a best \"impedance\n  match\" - the one that extracts the most hydraulic power. }\n\n\nBattery       BAT(Voc=24 [V], R0=0.02 [ohm])\nDCMotor       MOT(Kt=0.06 [N-m/A], Ke=0.06 [N-m/A], R=0.08 [ohm])\nGround        GND()\nconnect(BAT.p, MOT.p)\nconnect(BAT.n, MOT.n, GND.port)\n\nGear          GB(ratio=ratio)\nconnect(MOT.shaft, GB.in)\n\nHydraulicSupply  SUC(P=1.0e5 [Pa])\nHydraulicPump    PMP(disp=1.0e-5 [m^3], rho=870 [kg/m^3], eta_v=0.92, eta_m=0.88)\nHydraulicOrifice LOAD(CdA=1.5e-6 [m^2], rho=870 [kg/m^3])\nHydraulicTank    TNK(P=1.0e5 [Pa])\nconnect(GB.out, PMP.shaft)\nconnect(SUC.out, PMP.in)\nconnect(PMP.out, LOAD.in)\nconnect(LOAD.out, TNK.port)\n\nI_mot   = MOT.p.I                          { motor current, A }\nV_mot   = MOT.p.V - MOT.n.V\nP_el    = V_mot * I_mot                    { electrical input to the motor, W }\nw_mot   = MOT.shaft.w * 60 / (2*pi#)       { motor speed, rpm }\nw_pump  = GB.out.w * 60 / (2*pi#)          { pump speed, rpm }\nQ_lpm   = PMP.out.mdot / 870 * 60000       { delivered flow, L/min }\ndP_bar  = (PMP.out.P - PMP.in.P) / 1e5\nP_hyd   = PMP.out.mdot / 870 * (PMP.out.P - PMP.in.P)   { hydraulic power, W }\neta_sys = P_hyd / P_el\n",
  "request": {
    "objective": "P_hyd",
    "maximize": true,
    "decisions": [
      "ratio"
    ],
    "lowers": [
      0.3
    ],
    "uppers": [
      8
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 1.6089005640230742,
      "tolerance": 0.00322
    },
    {
      "path": "objective.value",
      "value": 1165.824,
      "tolerance": 2.33
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-iec]
# 8. Data-Centre Indirect Evaporative Cooler

**Domains:** moist air · electrical · heat

Domains: moist air (two streams: hot outdoor primary air cooled sensibly, return/scavenger secondary air humidified on the wet side) + electrical (fan motors) + heat (the plate wall between the streams). The primary stream is cooled toward the secondary stream's WET-BULB temperature with a wet-bulb depression efficiency that grows with the secondary-to-primary flow ratio (a fitted IEC correlation, written straight into the component parameter). More secondary air cools better but costs fan power and evaporates more water.

```run
// Data-centre indirect evaporative cooler (IEC) with fan power accounting
{ Domains: moist air (two streams: hot outdoor primary air cooled sensibly,
  return/scavenger secondary air humidified on the wet side) + electrical
  (fan motors) + heat (the plate wall between the streams).

  The primary stream is cooled toward the secondary stream's WET-BULB
  temperature with a wet-bulb depression efficiency that grows with the
  secondary-to-primary flow ratio (a fitted IEC correlation, written
  straight into the component parameter). More secondary air cools better
  but costs fan power and evaporates more water. }

m_sec  = 1.6 [kg/s]                 { secondary (scavenger) air - the design variable }
m_pri  = 2.4 [kg/s]                 { primary supply air to the white space }
r_flow = m_sec / m_pri
wbde   = 0.82 * (1 - exp(-1.9 * r_flow))   { wet-bulb depression efficiency }

{ primary: 35 C / W = 0.010 outdoor air drawn through the dry channels }
MoistAirSource OA(P=101325 [Pa], T=308.15 [K], W=0.010, mdot=m_pri)
MoistAirFan    FAN_P(dP=450 [Pa], eta=0.62)
{ secondary: 27 C / W = 0.0105 hot-aisle return air through the wet channels }
MoistAirSource RA(P=101325 [Pa], T=300.15 [K], W=0.0105, mdot=m_sec)
MoistAirFan    FAN_S(dP=380 [Pa], eta=0.62)
IndirectEvaporativeCooler IEC(wbde=wbde, eff_sec=0.9)
MoistAirSink   SUPPLY()
MoistAirSink   EXHAUST()
connect(OA.out, FAN_P.in)
connect(FAN_P.out, IEC.pri_in)
connect(IEC.pri_out, SUPPLY.in)
connect(RA.out, FAN_S.in)
connect(FAN_S.out, IEC.sec_in)
connect(IEC.sec_out, EXHAUST.in)

T_supply = Temperature(AirH2O, h=SUPPLY.h, P=SUPPLY.P, W=SUPPLY.W)
T_wb_sec = IEC.T_wb_sec
Q_cool   = IEC.Q                                  { sensible cooling delivered, W }
W_fans   = FAN_P.W_el + FAN_S.W_el                { fan electrical power, W }
m_water  = m_sec * (EXHAUST.W - RA.out.W) * 3600  { water evaporated, kg/h }
COP_iec  = Q_cool / W_fans

{ CHECK T_supply 299.10433949337386 0.00299 }
{ CHECK Q_cool 23806.918819453596 0.238 }
{ CHECK W_fans 2392.2588202812412 0.0239 }
{ CHECK m_water 17.631301107997455 0.000176 }
{ CHECK COP_iec 9.951648466136612 9.95e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Supply-air temperature | `T_supply` | 299.1 K |
| Sensible cooling | `Q_cool` | 23,806.9 W |
| Fan power | `W_fans` | 2,392.3 W |
| Water evaporated | `m_water` | 17.631 kg/h |
| Cooling COP | `COP_iec` | 9.952  |

## Optimization

Minimise fan power with supply air at or below 25.5 °C.

| Setting | Value |
| --- | --- |
| Minimize | `W_fans` |
| Independent variable | `m_sec` in [0.3, 4] |
| Constraints | `T_supply <= 298.65` |
| **Optimum** | `m_sec` = **1.761**, `W_fans` = **2,477.6** |

In the app: delete (or comment out) the `m_sec = …` line so `m_sec` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Data-centre indirect evaporative cooler (IEC) with fan power accounting\n{ Domains: moist air (two streams: hot outdoor primary air cooled sensibly,\n  return/scavenger secondary air humidified on the wet side) + electrical\n  (fan motors) + heat (the plate wall between the streams).\n\n  The primary stream is cooled toward the secondary stream's WET-BULB\n  temperature with a wet-bulb depression efficiency that grows with the\n  secondary-to-primary flow ratio (a fitted IEC correlation, written\n  straight into the component parameter). More secondary air cools better\n  but costs fan power and evaporates more water. }\n\nm_pri  = 2.4 [kg/s]                 { primary supply air to the white space }\nr_flow = m_sec / m_pri\nwbde   = 0.82 * (1 - exp(-1.9 * r_flow))   { wet-bulb depression efficiency }\n\n{ primary: 35 C / W = 0.010 outdoor air drawn through the dry channels }\nMoistAirSource OA(P=101325 [Pa], T=308.15 [K], W=0.010, mdot=m_pri)\nMoistAirFan    FAN_P(dP=450 [Pa], eta=0.62)\n{ secondary: 27 C / W = 0.0105 hot-aisle return air through the wet channels }\nMoistAirSource RA(P=101325 [Pa], T=300.15 [K], W=0.0105, mdot=m_sec)\nMoistAirFan    FAN_S(dP=380 [Pa], eta=0.62)\nIndirectEvaporativeCooler IEC(wbde=wbde, eff_sec=0.9)\nMoistAirSink   SUPPLY()\nMoistAirSink   EXHAUST()\nconnect(OA.out, FAN_P.in)\nconnect(FAN_P.out, IEC.pri_in)\nconnect(IEC.pri_out, SUPPLY.in)\nconnect(RA.out, FAN_S.in)\nconnect(FAN_S.out, IEC.sec_in)\nconnect(IEC.sec_out, EXHAUST.in)\n\nT_supply = Temperature(AirH2O, h=SUPPLY.h, P=SUPPLY.P, W=SUPPLY.W)\nT_wb_sec = IEC.T_wb_sec\nQ_cool   = IEC.Q                                  { sensible cooling delivered, W }\nW_fans   = FAN_P.W_el + FAN_S.W_el                { fan electrical power, W }\nm_water  = m_sec * (EXHAUST.W - RA.out.W) * 3600  { water evaporated, kg/h }\nCOP_iec  = Q_cool / W_fans\n",
  "request": {
    "objective": "W_fans",
    "decisions": [
      "m_sec"
    ],
    "lowers": [
      0.3
    ],
    "uppers": [
      4
    ],
    "constraints": [
      "T_supply <= 298.65"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 1.761058928674902,
      "tolerance": 0.00352
    },
    {
      "path": "objective.value",
      "value": 2477.580969095239,
      "tolerance": 4.96
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-hpwh]
# 9. Heat-Pump Water Heater (closed loop)

**Domains:** two-phase · liquid · moist air · heat

Domains: two-phase refrigerant (closed loop: compressor, moving-boundary condenser, thermostatic expansion, superheat-controlled evaporator) + liquid (city water heated in the condenser's water channel) + moist air (outdoor air cooled on the evaporator coil) + heat (the two shared walls). The condensing pressure floats until the water side absorbs the condenser duty; the evaporating pressure floats until the coil air supplies the evaporator duty at the compressor's volumetric flow. The water flow sets the delivery temperature - and the COP pays for every kelvin of it.

```run
// Air-source heat-pump water heater (closed R134a loop)
{ Domains: two-phase refrigerant (closed loop: compressor, moving-boundary
  condenser, thermostatic expansion, superheat-controlled evaporator) +
  liquid (city water heated in the condenser's water channel) + moist air
  (outdoor air cooled on the evaporator coil) + heat (the two shared walls).

  The condensing pressure floats until the water side absorbs the condenser
  duty; the evaporating pressure floats until the coil air supplies the
  evaporator duty at the compressor's volumetric flow. The water flow sets
  the delivery temperature - and the COP pays for every kelvin of it. }

function [in, out] = IdealTXV(domain$ = twophase)
port(in)
port(out)
  out.mdot = in.mdot
  out.h    = in.h
end

mdot_w = 0.025 [kg/s]               { water flow - the design variable }

{ ---- refrigerant loop ---- }
TwoPhaseCompressor      CMP(fluid$=R134a, model$=volumetric, eta=0.68, eta_v=0.88, disp=2.4e-5 [m^3], rpm=2900)
MovingBoundaryCondenser COND(fluid$=R134a, U_cond=1800 [W/m^2-K], U_sc=500 [W/m^2-K], D=0.009 [m], L=14 [m], eps_zone=0.05 [m])
IdealTXV                TXV()
TwoPhaseEvaporatorUA    EVAP(fluid$=R134a, UA=320 [W/K], dP=3000 [Pa], SH=5 [K])
connect(CMP.out, COND.in)
connect(COND.out, TXV.in)
connect(TXV.out, EVAP.in)
connect(EVAP.out, CMP.in)
EVAP.frac = 1
COND.SC   = 4            { charge closure: the refrigerant inventory sets the
                           high side; a design subcooling stands in for it }

{ ---- water side of the condenser ---- }
LiquidSource  CITY(fluid$=Water, mdot=mdot_w, P=300000 [Pa], T=288.15 [K])
LiquidWallHX  WCH(fluid$=Water, UA=180 [W/K])
LiquidSink    TAP()
connect(CITY.out, WCH.in)
connect(WCH.out, TAP.in)
connect(COND.wall, WCH.wall)

{ ---- outdoor air over the evaporator coil: 12 C, 70 % RH ---- }
MoistAirSource OUTA(P=101325 [Pa], T=285.15 [K], W=HumRat(AirH2O, T=285.15, P=101325, R=0.7), mdot=0.35 [kg/s])
MoistAirWallHX COIL(eps=0.7)
MoistAirSink   EXH()
connect(OUTA.out, COIL.in)
connect(COIL.out, EXH.in)
connect(COIL.wall, EVAP.wall)

GUESS CMP.in.P    = 3.0e5
GUESS CMP.out.P   = 1.35e6
GUESS CMP.in.h    = 4.0e5
GUESS CMP.out.h   = 4.45e5
GUESS COND.out.h  = 2.6e5
GUESS COND.wall.T = 321
GUESS EVAP.wall.T = 280
GUESS COIL.T_out  = 281
GUESS CMP.in.mdot = 0.015
GUESS COND.T_out  = 321

T_hot    = Temperature(Water, P=TAP.P, h=TAP.h)     { delivered water }
Q_heat   = COND.Q                                    { heating duty, W }
W_comp   = CMP.W
COP_h    = Q_heat / W_comp
P_cond   = CMP.out.P
T_cond   = COND.Tsat
P_evap   = CMP.in.P

{ CHECK P_cond 1274424.8019865463 12.7 }
{ CHECK P_evap 275282.55639227864 2.75 }
{ CHECK Q_heat 2529.830577083907 0.0253 }
{ CHECK T_hot 312.3526362946179 0.00312 }
{ CHECK COP_h 3.8747809709646104 3.87e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Condensing pressure | `P_cond` | 1.274e+06 Pa |
| Evaporating pressure | `P_evap` | 2.753e+05 Pa |
| Heating duty | `Q_heat` | 2,529.8 W |
| Delivered water | `T_hot` | 312.4 K |
| Heating COP | `COP_h` | 3.875  |

## Optimization

Maximise heating COP while delivering water at 45 °C or hotter.

| Setting | Value |
| --- | --- |
| Maximize | `COP_h` |
| Independent variable | `mdot_w` in [0.017, 0.024] |
| Constraints | `T_hot >= 318.15` |
| **Optimum** | `mdot_w` = **0.0201**, `COP_h` = **3.575** |

In the app: delete (or comment out) the `mdot_w = …` line so `mdot_w` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Air-source heat-pump water heater (closed R134a loop)\n{ Domains: two-phase refrigerant (closed loop: compressor, moving-boundary\n  condenser, thermostatic expansion, superheat-controlled evaporator) +\n  liquid (city water heated in the condenser's water channel) + moist air\n  (outdoor air cooled on the evaporator coil) + heat (the two shared walls).\n\n  The condensing pressure floats until the water side absorbs the condenser\n  duty; the evaporating pressure floats until the coil air supplies the\n  evaporator duty at the compressor's volumetric flow. The water flow sets\n  the delivery temperature - and the COP pays for every kelvin of it. }\n\nfunction [in, out] = IdealTXV(domain$ = twophase)\nport(in)\nport(out)\n  out.mdot = in.mdot\n  out.h    = in.h\nend\n\n\n{ ---- refrigerant loop ---- }\nTwoPhaseCompressor      CMP(fluid$=R134a, model$=volumetric, eta=0.68, eta_v=0.88, disp=2.4e-5 [m^3], rpm=2900)\nMovingBoundaryCondenser COND(fluid$=R134a, U_cond=1800 [W/m^2-K], U_sc=500 [W/m^2-K], D=0.009 [m], L=14 [m], eps_zone=0.05 [m])\nIdealTXV                TXV()\nTwoPhaseEvaporatorUA    EVAP(fluid$=R134a, UA=320 [W/K], dP=3000 [Pa], SH=5 [K])\nconnect(CMP.out, COND.in)\nconnect(COND.out, TXV.in)\nconnect(TXV.out, EVAP.in)\nconnect(EVAP.out, CMP.in)\nEVAP.frac = 1\nCOND.SC   = 4            { charge closure: the refrigerant inventory sets the\n                           high side; a design subcooling stands in for it }\n\n{ ---- water side of the condenser ---- }\nLiquidSource  CITY(fluid$=Water, mdot=mdot_w, P=300000 [Pa], T=288.15 [K])\nLiquidWallHX  WCH(fluid$=Water, UA=180 [W/K])\nLiquidSink    TAP()\nconnect(CITY.out, WCH.in)\nconnect(WCH.out, TAP.in)\nconnect(COND.wall, WCH.wall)\n\n{ ---- outdoor air over the evaporator coil: 12 C, 70 % RH ---- }\nMoistAirSource OUTA(P=101325 [Pa], T=285.15 [K], W=HumRat(AirH2O, T=285.15, P=101325, R=0.7), mdot=0.35 [kg/s])\nMoistAirWallHX COIL(eps=0.7)\nMoistAirSink   EXH()\nconnect(OUTA.out, COIL.in)\nconnect(COIL.out, EXH.in)\nconnect(COIL.wall, EVAP.wall)\n\nGUESS CMP.in.P    = 3.0e5\nGUESS CMP.out.P   = 1.35e6\nGUESS CMP.in.h    = 4.0e5\nGUESS CMP.out.h   = 4.45e5\nGUESS COND.out.h  = 2.6e5\nGUESS COND.wall.T = 321\nGUESS EVAP.wall.T = 280\nGUESS COIL.T_out  = 281\nGUESS CMP.in.mdot = 0.015\nGUESS COND.T_out  = 321\n\nT_hot    = Temperature(Water, P=TAP.P, h=TAP.h)     { delivered water }\nQ_heat   = COND.Q                                    { heating duty, W }\nW_comp   = CMP.W\nCOP_h    = Q_heat / W_comp\nP_cond   = CMP.out.P\nT_cond   = COND.Tsat\nP_evap   = CMP.in.P\n",
  "request": {
    "objective": "COP_h",
    "maximize": true,
    "decisions": [
      "mdot_w"
    ],
    "lowers": [
      0.017
    ],
    "uppers": [
      0.024
    ],
    "constraints": [
      "T_hot >= 318.15"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 0.02009531850507483,
      "tolerance": 4.02e-05
    },
    {
      "path": "objective.value",
      "value": 3.5747259416647834,
      "tolerance": 0.00715
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-co2-transcritical]
# 10. Transcritical CO₂: Optimum Gas-Cooler Pressure

**Domains:** two-phase/supercritical · heat

Domains: two-phase/supercritical refrigerant + heat (gas-cooler wall to the ambient heat sink). Above the critical point (73.8 bar) the gas-cooler pressure is no longer tied to a saturation temperature, so it is a free design variable: raising it costs compressor work but lowers the gas-cooler exit enthalpy and raises the refrigerating effect. The COP therefore has a maximum - the classic optimum high-side pressure of a transcritical cycle.

```run
// Transcritical CO2 (R744) cycle: optimum gas-cooler pressure
{ Domains: two-phase/supercritical refrigerant + heat (gas-cooler wall to the
  ambient heat sink).
  Above the critical point (73.8 bar) the gas-cooler pressure is no longer tied
  to a saturation temperature, so it is a free design variable: raising it
  costs compressor work but lowers the gas-cooler exit enthalpy and raises the
  refrigerating effect. The COP therefore has a maximum - the classic optimum
  high-side pressure of a transcritical cycle. }

function [in, out] = Throttle2P(domain$ = twophase)
port(in)
port(out)
  out.mdot = in.mdot
  out.h    = in.h
end

P_gc   = 9.5e6 [Pa]           { gas-cooler pressure - the design variable }
P_ev   = 3.5e6 [Pa]           { evaporating pressure, ~0 C }
mdot   = 0.05 [kg/s]

TwoPhaseSource SUC(fluid$=R744, mdot=mdot, P=P_ev, x=1)
TwoPhaseCompressor CMP(fluid$=R744, eta=0.70)
GasCooler      GC(fluid$=R744, UA=300 [W/K], dP=0 [Pa])
ThermalSource  AMB(T=308.15 [K])                 { 35 C heat sink }
Throttle2P     EXV()
TwoPhaseSink   EVAP_IN()
connect(SUC.out, CMP.in)
connect(CMP.out, GC.in)
connect(GC.wall, AMB.port)
connect(GC.out, EXV.in)
connect(EXV.out, EVAP_IN.in)
CMP.out.P = P_gc
EXV.out.P = P_ev

h_suc   = Enthalpy(R744, P=P_ev, x=1)
W_comp  = CMP.W
T_dis   = Temperature(R744, P=P_gc, h=CMP.out.h)
T_gc_out = Temperature(R744, P=P_gc, h=GC.out.h)
Q_gc    = GC.Q                                    { heat rejected, W }
Q_evap  = mdot * (h_suc - EXV.out.h)              { refrigerating effect, W }
COP     = Q_evap / W_comp
x_in    = Quality(R744, P=P_ev, h=EXV.out.h)       { evaporator inlet quality }

{ CHECK T_dis 359.9027669351547 0.0036 }
{ CHECK T_gc_out 309.1802682094085 0.00309 }
{ CHECK Q_evap 6621.178146810105 0.0662 }
{ CHECK W_comp 2845.803717182932 0.0285 }
{ CHECK COP 2.3266461094387867 2.33e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Discharge temperature | `T_dis` | 359.9 K |
| Gas-cooler exit | `T_gc_out` | 309.2 K |
| Refrigerating effect | `Q_evap` | 6,621.2 W |
| Compressor power | `W_comp` | 2,845.8 W |
| COP | `COP` | 2.327  |

## Optimization

Find the high-side pressure that maximises COP — the textbook transcritical optimum.

| Setting | Value |
| --- | --- |
| Maximize | `COP` |
| Independent variable | `P_gc` in [7.6e+06, 1.2e+07] |
| Constraints | none |
| **Optimum** | `P_gc` = **8.796e+06**, `COP` = **2.383** |

In the app: delete (or comment out) the `P_gc = …` line so `P_gc` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Transcritical CO2 (R744) cycle: optimum gas-cooler pressure\n{ Domains: two-phase/supercritical refrigerant + heat (gas-cooler wall to the\n  ambient heat sink).\n  Above the critical point (73.8 bar) the gas-cooler pressure is no longer tied\n  to a saturation temperature, so it is a free design variable: raising it\n  costs compressor work but lowers the gas-cooler exit enthalpy and raises the\n  refrigerating effect. The COP therefore has a maximum - the classic optimum\n  high-side pressure of a transcritical cycle. }\n\nfunction [in, out] = Throttle2P(domain$ = twophase)\nport(in)\nport(out)\n  out.mdot = in.mdot\n  out.h    = in.h\nend\n\nP_ev   = 3.5e6 [Pa]           { evaporating pressure, ~0 C }\nmdot   = 0.05 [kg/s]\n\nTwoPhaseSource SUC(fluid$=R744, mdot=mdot, P=P_ev, x=1)\nTwoPhaseCompressor CMP(fluid$=R744, eta=0.70)\nGasCooler      GC(fluid$=R744, UA=300 [W/K], dP=0 [Pa])\nThermalSource  AMB(T=308.15 [K])                 { 35 C heat sink }\nThrottle2P     EXV()\nTwoPhaseSink   EVAP_IN()\nconnect(SUC.out, CMP.in)\nconnect(CMP.out, GC.in)\nconnect(GC.wall, AMB.port)\nconnect(GC.out, EXV.in)\nconnect(EXV.out, EVAP_IN.in)\nCMP.out.P = P_gc\nEXV.out.P = P_ev\n\nh_suc   = Enthalpy(R744, P=P_ev, x=1)\nW_comp  = CMP.W\nT_dis   = Temperature(R744, P=P_gc, h=CMP.out.h)\nT_gc_out = Temperature(R744, P=P_gc, h=GC.out.h)\nQ_gc    = GC.Q                                    { heat rejected, W }\nQ_evap  = mdot * (h_suc - EXV.out.h)              { refrigerating effect, W }\nCOP     = Q_evap / W_comp\nx_in    = Quality(R744, P=P_ev, h=EXV.out.h)       { evaporator inlet quality }\n",
  "request": {
    "objective": "COP",
    "maximize": true,
    "decisions": [
      "P_gc"
    ],
    "lowers": [
      7600000.0
    ],
    "uppers": [
      12000000.0
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 8796115.365217507,
      "tolerance": 17600.0
    },
    {
      "path": "objective.value",
      "value": 2.382572866356858,
      "tolerance": 0.00477
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-engine-warmup]
# 11. Engine Warm-Up with a Wax Thermostat

**Domains:** heat · liquid

Domains: heat (engine block thermal mass with combustion waste heat) + liquid (closed EG50 coolant loop: pump curve, engine water jacket, a thermostat-controlled radiator branch in parallel with a bypass, mixer, coolant thermal inventory, expansion tank) + heat (radiator wall to ambient air). At cold start the wax thermostat is shut, so the coolant recirculates through the bypass and the engine warms quickly. Around its opening temperature the element opens smoothly, the radiator branch takes flow, and the loop settles. The thermostat opening temperature is the tuning knob.

```run
// Engine cold-start warm-up with a wax thermostat (transient)
{ Domains: heat (engine block thermal mass with combustion waste heat) +
  liquid (closed EG50 coolant loop: pump curve, engine water jacket, a
  thermostat-controlled radiator branch in parallel with a bypass, mixer,
  coolant thermal inventory, expansion tank) + heat (radiator wall to
  ambient air).

  At cold start the wax thermostat is shut, so the coolant recirculates
  through the bypass and the engine warms quickly. Around its opening
  temperature the element opens smoothly, the radiator branch takes flow,
  and the loop settles. The thermostat opening temperature is the tuning
  knob. }

T_open = 361.15 [K]                   { thermostat opening temperature, 88 C }

TABLE wpump(Q [m^3/s]) [m]
  0        14
  0.0010   13
  0.0020   10
  0.0030   5
  0.0035   2
END

MassGen       ENGINE(C=5.5e4 [J/K], Qgen=22000 [W], T0=268.15 [K])       { -5 C cold start }
LiquidPumpMap PUMP(rho=1065 [kg/m^3], eta=0.5, map$=wpump)
LiquidWallHX  JACKET(fluid$=EG50, UA=1500 [W/K])
LiquidThermostat THERMO(fluid$=EG50, CdA=1.2e-4 [m^2], rho=1065 [kg/m^3], Topen=T_open, Tband=3 [K])
LiquidWallHX  RAD(fluid$=EG50, UA=1100 [W/K])
ThermalSource AIR(T=268.15 [K])
LiquidOrifice BYPASS(CdA=1.5e-5 [m^2], rho=1065 [kg/m^3])
LiquidMixer   MIX()
LiquidTank    COOLANT(fluid$=EG50, m=6 [kg], UA=0 [W/K], T0=268.15 [K])
LiquidExpansionTank ET(P=140000 [Pa])
connect(PUMP.out, JACKET.in)
connect(JACKET.wall, ENGINE.port)
connect(JACKET.out, THERMO.in, BYPASS.in)
connect(THERMO.out, RAD.in)
connect(RAD.wall, AIR.port)
connect(RAD.out, MIX.in1)
connect(BYPASS.out, MIX.in2)
connect(MIX.out, COOLANT.in)
connect(COOLANT.wall, AIR.port)
connect(COOLANT.out, PUMP.in, ET.port)

DYNAMIC warmup(method = ode23s, time = 0 .. 900, points = 451)
END

T_eng_end  = FinalValue('engine.port.t')
time_open  = TimeAt('engine.port.t', T_open)               { s until the stat cracks }
T_eng_max  = MaxValue('engine.port.t')
m_rad_end  = FinalValue('thermo.in.mdot')                   { radiator branch flow }
m_byp_end  = FinalValue('bypass.in.mdot')

{ CHECK time_open 318.55747345788905 0.0319 }
{ CHECK T_eng_end 363.53769969883905 0.0364 }
{ CHECK m_rad_end 0.07081510271743054 7.08e-06 }
{ CHECK m_byp_end 0.26174717071013204 2.62e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Time to thermostat opening | `time_open` | 318.6 s |
| Engine temperature at 15 min | `T_eng_end` | 363.5 K |
| Radiator-branch flow | `m_rad_end` | 0.0708 kg/s |
| Bypass flow | `m_byp_end` | 0.2617 kg/s |

[Related: md-overview, comp-domains, optimization]

[Topic: md-dehumidifier]
# 12. DX Dehumidifier with Heat-Pipe Wrap-Around

**Domains:** moist air · refrigeration · electrical

Domains: moist air (precool -> wet coil at its apparatus dew point -> reheat -> fan) + refrigeration (the coil duty is lifted by a compressor whose COP follows a second-law fraction of the Carnot COP between the apparatus dew point and the condensing temperature) + electrical (fan and compressor power). The heat pipe moves sensible heat from the warm entering air to the over-cooled leaving air: the coil sees pre-cooled air, so a larger share of its duty goes into condensing moisture, and the supply is reheated for free. Moisture removal efficiency MRE [kg water per kWh] measures it.

```run
// DX dehumidifier with a wrap-around heat pipe (pre-cool / reheat)
{ Domains: moist air (precool -> wet coil at its apparatus dew point ->
  reheat -> fan) + refrigeration (the coil duty is lifted by a compressor
  whose COP follows a second-law fraction of the Carnot COP between the
  apparatus dew point and the condensing temperature) + electrical (fan and
  compressor power).

  The heat pipe moves sensible heat from the warm entering air to the
  over-cooled leaving air: the coil sees pre-cooled air, so a larger share of
  its duty goes into condensing moisture, and the supply is reheated for
  free. Moisture removal efficiency MRE [kg water per kWh] measures it. }

T_adp   = 283.15 [K]            { coil apparatus dew point - the design variable }
eff_hp  = 0.45                   { heat-pipe effectiveness }
T_cond  = 318.15 [K]             { condensing temperature }
eta_II  = 0.45                   { compressor second-law (Carnot) fraction }

{ 28 C / 70 % RH humid room air, 0.6 kg/s }
W_in = HumRat(AirH2O, T=301.15, P=101325, R=0.70)
MoistAirSource       ROOM(P=101325 [Pa], T=301.15 [K], W=W_in, mdot=0.6 [kg/s])
HeatPipeWrapAround   HP(eff=eff_hp)
ApparatusDewPointCoil COIL(T_adp=T_adp, BF=0.12)
MoistAirFan          FAN(dP=250 [Pa], eta=0.55)
MoistAirSink         SUP()
connect(ROOM.out, HP.pre_in)
connect(HP.pre_out, COIL.in)
connect(COIL.out, HP.re_in)
connect(HP.re_out, FAN.in)
connect(FAN.out, SUP.in)

Q_coil   = COIL.Q                                   { coil (refrigerant) duty, W }
m_water  = COIL.mdot_w * 3600                       { condensate, kg/h }
COP_dx   = eta_II * T_adp / (T_cond - T_adp)        { compressor COP model }
W_comp   = Q_coil / COP_dx
W_total  = W_comp + FAN.W_el
MRE      = m_water / (W_total / 1000)               { kg/kWh }
T_supply = Temperature(AirH2O, h=SUP.h, P=SUP.P, W=SUP.W)
RH_supply = RelHum(AirH2O, h=SUP.h, P=SUP.P, W=SUP.W)
Q_hp     = HP.Q                                     { heat moved by the heat pipe, W }

{ CHECK m_water 17.300964964480894 0.000173 }
{ CHECK Q_coil 17607.725469774072 0.176 }
{ CHECK Q_hp 4687.5388636064645 0.0469 }
{ CHECK W_total 5065.353997054651 0.0507 }
{ CHECK MRE 3.415549036561093 3.42e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Condensate | `m_water` | 17.301 kg/h |
| Coil duty | `Q_coil` | 17,607.7 W |
| Heat-pipe transfer | `Q_hp` | 4,687.5 W |
| Electrical power | `W_total` | 5,065.4 W |
| Moisture removal efficiency | `MRE` | 3.416 kg/kWh |

## Optimization

Choose the coil apparatus dew point that maximises moisture removal per kWh.

| Setting | Value |
| --- | --- |
| Maximize | `MRE` |
| Independent variable | `T_adp` in [278, 294] |
| Constraints | none |
| **Optimum** | `T_adp` = **289.5**, `MRE` = **3.867** |

In the app: delete (or comment out) the `T_adp = …` line so `T_adp` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// DX dehumidifier with a wrap-around heat pipe (pre-cool / reheat)\n{ Domains: moist air (precool -> wet coil at its apparatus dew point ->\n  reheat -> fan) + refrigeration (the coil duty is lifted by a compressor\n  whose COP follows a second-law fraction of the Carnot COP between the\n  apparatus dew point and the condensing temperature) + electrical (fan and\n  compressor power).\n\n  The heat pipe moves sensible heat from the warm entering air to the\n  over-cooled leaving air: the coil sees pre-cooled air, so a larger share of\n  its duty goes into condensing moisture, and the supply is reheated for\n  free. Moisture removal efficiency MRE [kg water per kWh] measures it. }\n\neff_hp  = 0.45                   { heat-pipe effectiveness }\nT_cond  = 318.15 [K]             { condensing temperature }\neta_II  = 0.45                   { compressor second-law (Carnot) fraction }\n\n{ 28 C / 70 % RH humid room air, 0.6 kg/s }\nW_in = HumRat(AirH2O, T=301.15, P=101325, R=0.70)\nMoistAirSource       ROOM(P=101325 [Pa], T=301.15 [K], W=W_in, mdot=0.6 [kg/s])\nHeatPipeWrapAround   HP(eff=eff_hp)\nApparatusDewPointCoil COIL(T_adp=T_adp, BF=0.12)\nMoistAirFan          FAN(dP=250 [Pa], eta=0.55)\nMoistAirSink         SUP()\nconnect(ROOM.out, HP.pre_in)\nconnect(HP.pre_out, COIL.in)\nconnect(COIL.out, HP.re_in)\nconnect(HP.re_out, FAN.in)\nconnect(FAN.out, SUP.in)\n\nQ_coil   = COIL.Q                                   { coil (refrigerant) duty, W }\nm_water  = COIL.mdot_w * 3600                       { condensate, kg/h }\nCOP_dx   = eta_II * T_adp / (T_cond - T_adp)        { compressor COP model }\nW_comp   = Q_coil / COP_dx\nW_total  = W_comp + FAN.W_el\nMRE      = m_water / (W_total / 1000)               { kg/kWh }\nT_supply = Temperature(AirH2O, h=SUP.h, P=SUP.P, W=SUP.W)\nRH_supply = RelHum(AirH2O, h=SUP.h, P=SUP.P, W=SUP.W)\nQ_hp     = HP.Q                                     { heat moved by the heat pipe, W }\n",
  "request": {
    "objective": "MRE",
    "maximize": true,
    "decisions": [
      "T_adp"
    ],
    "lowers": [
      278
    ],
    "uppers": [
      294
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 289.5393376779174,
      "tolerance": 0.579
    },
    {
      "path": "objective.value",
      "value": 3.8670116333678,
      "tolerance": 0.00773
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-zone-pid]
# 13. Office Zone Pull-Down with PID Supply Air

**Domains:** moist air · heat · signal · sensor

Domains: moist air (zone air temperature AND humidity states, conditioned supply air) + heat (envelope gain from outdoors) + signal (PID on a sensed zone temperature, output clamped to the damper's flow range) + sensor (thermistor lag). The PID output is the supply-air mass flow itself: the source reads it straight off the signal wire, MoistAirSource SUP(mdot = PID.out.sig). An integral-of-absolute-error (IAE) signal chain - difference, absolute value, integrator - scores the tuning while the zone is pulled down.

```run
// Office zone pull-down with PID-modulated supply air (transient)
{ Domains: moist air (zone air temperature AND humidity states, conditioned
  supply air) + heat (envelope gain from outdoors) + signal (PID on a
  sensed zone temperature, output clamped to the damper's flow range) +
  sensor (thermistor lag).

  The PID output is the supply-air mass flow itself: the source reads it
  straight off the signal wire, MoistAirSource SUP(mdot = PID.out.sig).
  An integral-of-absolute-error (IAE) signal chain - difference, absolute
  value, integrator - scores the tuning while the zone is pulled down. }

Kp = 0.25                          { proportional gain, (kg/s)/K - the tuning variable }

SigConstant     SET(k=297.15)                        { 24 C setpoint }
SigThermalProbe PROBE()
SigFirstOrder   SENSOR(tau=30, y0=303.15)
SigPID          PID(model$=clamped, Kp=Kp, Ki=0.002, Kd=0, tau=1, i0=0, d0=0, umin=0.08, umax=0.9, Taw=120)
{ cooling is reverse-acting: measurement on sp, setpoint on pv }
connect(PROBE.out, SENSOR.in)
connect(SENSOR.out, PID.sp)
connect(SET.out, PID.pv)

{ IAE = integral of |T_sensed - T_set| }
SigDiff        ERR()
SigAbs         ABSE()
SigIntegrator  IAE(y0=0)
connect(SENSOR.out, ERR.in1)
connect(SET.out, ERR.in2)
connect(ERR.out, ABSE.in)
connect(ABSE.out, IAE.in)

MoistAirSource SUP(P=101325 [Pa], T=286.15 [K], W=0.0085, mdot = PID.out.sig)   { 13 C supply }
CabinZone      ZONE(Vz=180 [m^3], T0=303.15 [K], W0=0.0125, n_occ=10, q_sens=75 [W], mw_occ=1.6e-5 [kg/s], Q_aux=1800 [W])
MoistAirSink   RET()
Convection     ENVELOPE(htc=1 [W/m^2-K], area=70 [m^2])                { UA = 70 W/K }
ThermalSource  OUTDOOR(T=307.15 [K])
connect(SUP.out, ZONE.in)
connect(ZONE.out, RET.in)
connect(ZONE.wall, PROBE.port, ENVELOPE.a)
connect(ENVELOPE.b, OUTDOOR.port)

DYNAMIC pulldown(method = ode23s, time = 0 .. 3600, points = 361)
END

T_end   = FinalValue('zone.tz')
W_end   = FinalValue('zone.wz')
IAE_end = FinalValue('iae.y')                       { K.s }
m_peak  = MaxValue('pid.out.sig')
m_end   = FinalValue('pid.out.sig')
RH_end  = RelHum(AirH2O, T=T_end, P=101325, W=W_end)

{ CHECK T_end 297.1524047947913 0.0297 }
{ CHECK RH_end 0.4935630681076691 4.94e-05 }
{ CHECK m_end 0.24856605988323302 2.49e-05 }
{ CHECK IAE_end 901.0448213680361 0.0901 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Zone temperature at 1 h | `T_end` | 297.2 K |
| Zone RH at 1 h | `RH_end` | 0.4936  |
| Supply flow at 1 h | `m_end` | 0.2486 kg/s |
| Integral absolute error | `IAE_end` | 901.0 K-s |

[Related: md-overview, comp-domains, optimization]

[Topic: md-pv-pump]
# 14. Direct-Coupled PV Water Pump

**Domains:** signal · electrical · rotational · hydraulic

Domains: signal (solar irradiance) + electrical (single-diode PV array, permanent-magnet DC motor) + rotational mechanics (gear) + hydraulics (positive-displacement pump lifting water through a delivery orifice). With no maximum-power-point tracker the operating point is wherever the PV I-V curve crosses the motor's load line - set by the pump's pressure torque reflected through the gear. The gear ratio decides how close that crossing sits to the array's maximum-power knee.

```run
// Direct-coupled photovoltaic water pump (no MPPT)
{ Domains: signal (solar irradiance) + electrical (single-diode PV array,
  permanent-magnet DC motor) + rotational mechanics (gear) + hydraulics
  (positive-displacement pump lifting water through a delivery orifice).

  With no maximum-power-point tracker the operating point is wherever the
  PV I-V curve crosses the motor's load line - set by the pump's pressure
  torque reflected through the gear. The gear ratio decides how close that
  crossing sits to the array's maximum-power knee. }

ratio = 3.0                        { motor : pump speed ratio - the design variable }

SigConstant   SUN(k=850 [W/m^2])                            { irradiance, W/m2 }
PVSingleDiode PV(Isc_ref=8.6 [A], Gref=1000 [W/m^2], I0d=4e-8 [A], n_d=1.3, Vt=0.0257*36 [V], Rs=0.35 [ohm], Rsh=300 [ohm])
DCMotor       MOT(Kt=0.11 [N-m/A], Ke=0.11 [N-m/A], R=0.6 [ohm])
Ground        GND()
connect(SUN.out, PV.G)
connect(PV.p, MOT.p)
connect(PV.n, MOT.n, GND.port)

Gear             GB(ratio=ratio)
HydraulicSupply  WELL(P=1.0e5 [Pa])
HydraulicPump    PMP(disp=1.2e-5 [m^3], rho=998 [kg/m^3], eta_v=0.9, eta_m=0.85)
HydraulicOrifice HEAD(CdA=4.0e-6 [m^2], rho=998 [kg/m^3])                { delivery line + lift }
HydraulicTank    TANK(P=1.0e5 [Pa])
connect(MOT.shaft, GB.in)
connect(GB.out, PMP.shaft)
connect(WELL.out, PMP.in)
connect(PMP.out, HEAD.in)
connect(HEAD.out, TANK.port)

GUESS PV.p.V = 25

V_pv    = PV.p.V - PV.n.V
I_pv    = -PV.p.I
P_pv    = V_pv * I_pv                                    { array output, W }
Q_lph   = PMP.out.mdot / 998 * 3.6e6                     { water delivered, L/h }
H_m     = (PMP.out.P - PMP.in.P) / (998 * 9.80665)       { pump head, m }
P_hyd   = PMP.out.mdot / 998 * (PMP.out.P - PMP.in.P)
eta_sys = P_hyd / (850 * 1.6)                             { sun-to-water, 1.6 m2 array }

{ CHECK V_pv 21.577223713789238 0.000216 }
{ CHECK I_pv 2.3439935099605957 2.34e-05 }
{ CHECK P_pv 50.576872348089836 0.000506 }
{ CHECK Q_lph 378.2301680335551 0.00378 }
{ CHECK H_m 35.17520813803803 0.000352 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Array voltage | `V_pv` | 21.577 V |
| Array current | `I_pv` | 2.344 A |
| Array power | `P_pv` | 50.577 W |
| Water delivered | `Q_lph` | 378.2 L/h |
| Pump head | `H_m` | 35.175 m |

## Optimization

Choose the gear ratio that pumps the most water at 850 W/m² without an MPPT.

| Setting | Value |
| --- | --- |
| Maximize | `Q_lph` |
| Independent variable | `ratio` in [0.5, 10] |
| Constraints | none |
| **Optimum** | `ratio` = **1.717**, `Q_lph` = **470.4** |

In the app: delete (or comment out) the `ratio = …` line so `ratio` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Direct-coupled photovoltaic water pump (no MPPT)\n{ Domains: signal (solar irradiance) + electrical (single-diode PV array,\n  permanent-magnet DC motor) + rotational mechanics (gear) + hydraulics\n  (positive-displacement pump lifting water through a delivery orifice).\n\n  With no maximum-power-point tracker the operating point is wherever the\n  PV I-V curve crosses the motor's load line - set by the pump's pressure\n  torque reflected through the gear. The gear ratio decides how close that\n  crossing sits to the array's maximum-power knee. }\n\n\nSigConstant   SUN(k=850 [W/m^2])                            { irradiance, W/m2 }\nPVSingleDiode PV(Isc_ref=8.6 [A], Gref=1000 [W/m^2], I0d=4e-8 [A], n_d=1.3, Vt=0.0257*36 [V], Rs=0.35 [ohm], Rsh=300 [ohm])\nDCMotor       MOT(Kt=0.11 [N-m/A], Ke=0.11 [N-m/A], R=0.6 [ohm])\nGround        GND()\nconnect(SUN.out, PV.G)\nconnect(PV.p, MOT.p)\nconnect(PV.n, MOT.n, GND.port)\n\nGear             GB(ratio=ratio)\nHydraulicSupply  WELL(P=1.0e5 [Pa])\nHydraulicPump    PMP(disp=1.2e-5 [m^3], rho=998 [kg/m^3], eta_v=0.9, eta_m=0.85)\nHydraulicOrifice HEAD(CdA=4.0e-6 [m^2], rho=998 [kg/m^3])                { delivery line + lift }\nHydraulicTank    TANK(P=1.0e5 [Pa])\nconnect(MOT.shaft, GB.in)\nconnect(GB.out, PMP.shaft)\nconnect(WELL.out, PMP.in)\nconnect(PMP.out, HEAD.in)\nconnect(HEAD.out, TANK.port)\n\nGUESS PV.p.V = 25\n\nV_pv    = PV.p.V - PV.n.V\nI_pv    = -PV.p.I\nP_pv    = V_pv * I_pv                                    { array output, W }\nQ_lph   = PMP.out.mdot / 998 * 3.6e6                     { water delivered, L/h }\nH_m     = (PMP.out.P - PMP.in.P) / (998 * 9.80665)       { pump head, m }\nP_hyd   = PMP.out.mdot / 998 * (PMP.out.P - PMP.in.P)\neta_sys = P_hyd / (850 * 1.6)                             { sun-to-water, 1.6 m2 array }\n",
  "request": {
    "objective": "Q_lph",
    "maximize": true,
    "decisions": [
      "ratio"
    ],
    "lowers": [
      0.5
    ],
    "uppers": [
      10
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 1.7171497875001005,
      "tolerance": 0.00343
    },
    {
      "path": "objective.value",
      "value": 470.35248009078737,
      "tolerance": 0.941
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-ev-drive]
# 15. EV Drive Unit with Liquid Cooling

**Domains:** electrical · rotational · signal · heat · liquid

Domains: electrical (battery pack with internal resistance, inverter with conduction + switching losses, DC bus) + rotational mechanics (motor torque at a set road speed) + signal (driver torque command) + heat (the inverter and motor loss ports) + liquid (one EG50 cooling line running the inverter cold plate, then the motor jacket). MotorMap draws the electrical power that delivers the commanded shaft power at the map efficiency; the inverter drops voltage in its switches; both losses land in the coolant. The coolant flow is minimised subject to an inverter base-plate limit.

```run
// EV drive unit: battery -> inverter -> traction motor, liquid-cooled
{ Domains: electrical (battery pack with internal resistance, inverter with
  conduction + switching losses, DC bus) + rotational mechanics (motor
  torque at a set road speed) + signal (driver torque command) + heat (the
  inverter and motor loss ports) + liquid (one EG50 cooling line running the
  inverter cold plate, then the motor jacket).

  MotorMap draws the electrical power that delivers the commanded shaft
  power at the map efficiency; the inverter drops voltage in its switches;
  both losses land in the coolant. The coolant flow is minimised subject to
  an inverter base-plate limit. }

mdot_c = 0.12 [kg/s]                   { coolant flow - the design variable }

TABLE effmap(w [rad/s] : tau = 20, 120, 240) [-]    { motor efficiency map }
  100    0.86   0.90   0.88
  400    0.92   0.95   0.93
  800    0.90   0.94   0.92
END

SigConstant   TQ(k=180 [N-m])                              { torque command, N.m }
SpeedSource   ROAD(w=520 [rad/s])                            { ~ 130 km/h }
MechGround    MG()
BatteryThermal PACK(Voc=400 [V], R0=0.06 [ohm])
ThermalSource  CABIN(T=303.15 [K])
InverterLoss  INV(V0=1.1 [V], r=0.0035 [ohm], Esw=0.018 [J], fsw=10000 [Hz], Iref=400 [A], Vref=400 [V], Vnom=400 [V], epsI=1 [A])
MotorMap      MOT(eff$=effmap, epsP=1 [W])
Ground        GND()
connect(PACK.p, INV.in_p)
connect(INV.out_p, MOT.p)
connect(PACK.n, MOT.n, GND.port)
connect(PACK.heat, CABIN.port)
connect(TQ.out, MOT.u)
connect(ROAD.a, MOT.shaft)
connect(ROAD.b, MG.port)

LiquidSource  CSRC(fluid$=EG50, mdot=mdot_c, P=180000 [Pa], T=323.15 [K])   { 50 C inlet }
LiquidWallHX  INVCP(fluid$=EG50, UA=260 [W/K])      { inverter cold plate }
LiquidWallHX  JACKET(fluid$=EG50, UA=420 [W/K])     { stator water jacket }
LiquidSink    CSNK()
connect(CSRC.out, INVCP.in)
connect(INVCP.out, JACKET.in)
connect(JACKET.out, CSNK.in)
connect(INV.heat, INVCP.wall)
connect(MOT.heat, JACKET.wall)

P_shaft  = 180 * 520                                 { mechanical output, W }
P_batt   = PACK.W                                    { delivered by the pack, W }
I_bus    = -PACK.p.I
Q_inv    = INV.Q
Q_mot    = MOT.Q
eta_drive = P_shaft / P_batt
T_inv    = INVCP.wall.T                              { inverter base plate }
T_stator = JACKET.wall.T
T_c_out  = Temperature(EG50, P=CSNK.P, h=CSNK.h)
W_cpump  = mdot_c / 1060 * 60000 / 0.5            { coolant pump power at a 60 kPa loop drop, W }

{ CHECK P_batt 100538.31765515526 1.01 }
{ CHECK I_bus 261.6119130992018 0.00262 }
{ CHECK Q_inv 645.0412410677478 0.00645 }
{ CHECK Q_mot 6293.276414087508 0.0629 }
{ CHECK eta_drive 0.9309883254765255 9.31e-06 }
{ CHECK T_stator 348.5031242422835 0.00349 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Battery power | `P_batt` | 1.005e+05 W |
| Bus current | `I_bus` | 261.6 A |
| Inverter loss | `Q_inv` | 645.0 W |
| Motor loss | `Q_mot` | 6,293.3 W |
| Drive efficiency | `eta_drive` | 0.9310  |
| Stator jacket temperature | `T_stator` | 348.5 K |

## Optimization

Minimise coolant pumping power with the stator jacket at or below 80 °C.

| Setting | Value |
| --- | --- |
| Minimize | `W_cpump` |
| Independent variable | `mdot_c` in [0.02, 0.4] |
| Constraints | `T_stator <= 353.15` |
| **Optimum** | `mdot_c` = **0.0865**, `W_cpump` = **9.789** |

In the app: delete (or comment out) the `mdot_c = …` line so `mdot_c` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// EV drive unit: battery -> inverter -> traction motor, liquid-cooled\n{ Domains: electrical (battery pack with internal resistance, inverter with\n  conduction + switching losses, DC bus) + rotational mechanics (motor\n  torque at a set road speed) + signal (driver torque command) + heat (the\n  inverter and motor loss ports) + liquid (one EG50 cooling line running the\n  inverter cold plate, then the motor jacket).\n\n  MotorMap draws the electrical power that delivers the commanded shaft\n  power at the map efficiency; the inverter drops voltage in its switches;\n  both losses land in the coolant. The coolant flow is minimised subject to\n  an inverter base-plate limit. }\n\n\nTABLE effmap(w [rad/s] : tau = 20, 120, 240) [-]    { motor efficiency map }\n  100    0.86   0.90   0.88\n  400    0.92   0.95   0.93\n  800    0.90   0.94   0.92\nEND\n\nSigConstant   TQ(k=180 [N-m])                              { torque command, N.m }\nSpeedSource   ROAD(w=520 [rad/s])                            { ~ 130 km/h }\nMechGround    MG()\nBatteryThermal PACK(Voc=400 [V], R0=0.06 [ohm])\nThermalSource  CABIN(T=303.15 [K])\nInverterLoss  INV(V0=1.1 [V], r=0.0035 [ohm], Esw=0.018 [J], fsw=10000 [Hz], Iref=400 [A], Vref=400 [V], Vnom=400 [V], epsI=1 [A])\nMotorMap      MOT(eff$=effmap, epsP=1 [W])\nGround        GND()\nconnect(PACK.p, INV.in_p)\nconnect(INV.out_p, MOT.p)\nconnect(PACK.n, MOT.n, GND.port)\nconnect(PACK.heat, CABIN.port)\nconnect(TQ.out, MOT.u)\nconnect(ROAD.a, MOT.shaft)\nconnect(ROAD.b, MG.port)\n\nLiquidSource  CSRC(fluid$=EG50, mdot=mdot_c, P=180000 [Pa], T=323.15 [K])   { 50 C inlet }\nLiquidWallHX  INVCP(fluid$=EG50, UA=260 [W/K])      { inverter cold plate }\nLiquidWallHX  JACKET(fluid$=EG50, UA=420 [W/K])     { stator water jacket }\nLiquidSink    CSNK()\nconnect(CSRC.out, INVCP.in)\nconnect(INVCP.out, JACKET.in)\nconnect(JACKET.out, CSNK.in)\nconnect(INV.heat, INVCP.wall)\nconnect(MOT.heat, JACKET.wall)\n\nP_shaft  = 180 * 520                                 { mechanical output, W }\nP_batt   = PACK.W                                    { delivered by the pack, W }\nI_bus    = -PACK.p.I\nQ_inv    = INV.Q\nQ_mot    = MOT.Q\neta_drive = P_shaft / P_batt\nT_inv    = INVCP.wall.T                              { inverter base plate }\nT_stator = JACKET.wall.T\nT_c_out  = Temperature(EG50, P=CSNK.P, h=CSNK.h)\nW_cpump  = mdot_c / 1060 * 60000 / 0.5            { coolant pump power at a 60 kPa loop drop, W }\n",
  "request": {
    "objective": "W_cpump",
    "decisions": [
      "mdot_c"
    ],
    "lowers": [
      0.02
    ],
    "uppers": [
      0.4
    ],
    "constraints": [
      "T_stator <= 353.15"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 0.08646535018120638,
      "tolerance": 0.000173
    },
    {
      "path": "objective.value",
      "value": 9.788530209193176,
      "tolerance": 0.0196
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-battery-pcm]
# 16. Battery Module with PCM Passive Cooling

**Domains:** electrical · heat

Domains: electrical (transient cell model: open-circuit voltage, ohmic heat, state of charge) + heat (battery lump -> conductive pad -> PCM latent store -> natural convection to the cabin). A 2C discharge pushes the cells' ohmic heat into a paraffin PCM block that melts over a narrow band around 40 C, clipping the temperature rise; the heat that the PCM cannot absorb leaks to the ambient by convection. The design question is the smallest PCM mass that keeps the cells below 45 C.

```run
// Battery module with phase-change-material (PCM) passive cooling
{ Domains: electrical (transient cell model: open-circuit voltage, ohmic
  heat, state of charge) + heat (battery lump -> conductive pad -> PCM
  latent store -> natural convection to the cabin).

  A 2C discharge pushes the cells' ohmic heat into a paraffin PCM block that
  melts over a narrow band around 40 C, clipping the temperature rise; the
  heat that the PCM cannot absorb leaks to the ambient by convection. The
  design question is the smallest PCM mass that keeps the cells below 45 C. }

m_pcm = 2.5 [kg]                  { PCM mass - the design variable }

BatteryTransient CELLS(Voc=48 [V], R0=0.045 [ohm], Q0=50, C_th=9000 [J/K], SOC0=1.0, T0=298.15 [K])
Resistor         LOAD(R=0.42 [ohm])                       { ~100 A, 2C at 50 Ah }
Ground           GND()
connect(CELLS.p, LOAD.a)
connect(CELLS.n, LOAD.b, GND.port)

ContactResistance PAD(Rth=0.005 [K/W])
PCMMass           PCM(m=m_pcm, cp=2100 [J/kg-K], L=200000 [J/kg], Tm=313.15 [K], dTm=1.5 [K], T0=298.15 [K])
Convection        SKIN(htc=6 [W/m^2-K], area=0.35 [m^2])
ThermalSource     CABIN(T=298.15 [K])
connect(CELLS.heat, PAD.a)
connect(PAD.b, PCM.port, SKIN.a)
connect(SKIN.b, CABIN.port)

DYNAMIC discharge(method = ode23s, time = 0 .. 1500, points = 301)
END

T_max    = MaxValue('cells.t')                       { peak cell temperature, K }
T_pcm_end = FinalValue('pcm.port.t')
SOC_end  = FinalValue('cells.soc')
Q_avg    = ODEAvg('cells.qgen')                      { mean ohmic heat, W }
m_module = 14 + 1.15 * m_pcm                         { module mass incl. PCM housing, kg }

{ CHECK T_max 316.5429038944803 0.0317 }
{ CHECK SOC_end 0.13978494623656135 1.4e-05 }
{ CHECK Q_avg 479.5005202913607 0.048 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Peak cell temperature | `T_max` | 316.5 K |
| State of charge at the end | `SOC_end` | 0.1398  |
| Mean ohmic heat | `Q_avg` | 479.5 W |

## Optimization

Find the lightest module that keeps the cells at or below 45 °C during a 2C discharge.

| Setting | Value |
| --- | --- |
| Minimize | `m_module` |
| Independent variable | `m_pcm` in [1.5, 3] |
| Constraints | `T_max <= 318.15` |
| **Optimum** | `m_pcm` = **2.084**, `m_module` = **16.397** |

In the app: delete (or comment out) the `m_pcm = …` line so `m_pcm` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Battery module with phase-change-material (PCM) passive cooling\n{ Domains: electrical (transient cell model: open-circuit voltage, ohmic\n  heat, state of charge) + heat (battery lump -> conductive pad -> PCM\n  latent store -> natural convection to the cabin).\n\n  A 2C discharge pushes the cells' ohmic heat into a paraffin PCM block that\n  melts over a narrow band around 40 C, clipping the temperature rise; the\n  heat that the PCM cannot absorb leaks to the ambient by convection. The\n  design question is the smallest PCM mass that keeps the cells below 45 C. }\n\n\nBatteryTransient CELLS(Voc=48 [V], R0=0.045 [ohm], Q0=50, C_th=9000 [J/K], SOC0=1.0, T0=298.15 [K])\nResistor         LOAD(R=0.42 [ohm])                       { ~100 A, 2C at 50 Ah }\nGround           GND()\nconnect(CELLS.p, LOAD.a)\nconnect(CELLS.n, LOAD.b, GND.port)\n\nContactResistance PAD(Rth=0.005 [K/W])\nPCMMass           PCM(m=m_pcm, cp=2100 [J/kg-K], L=200000 [J/kg], Tm=313.15 [K], dTm=1.5 [K], T0=298.15 [K])\nConvection        SKIN(htc=6 [W/m^2-K], area=0.35 [m^2])\nThermalSource     CABIN(T=298.15 [K])\nconnect(CELLS.heat, PAD.a)\nconnect(PAD.b, PCM.port, SKIN.a)\nconnect(SKIN.b, CABIN.port)\n\nDYNAMIC discharge(method = ode23s, time = 0 .. 1500, points = 301)\nEND\n\nT_max    = MaxValue('cells.t')                       { peak cell temperature, K }\nT_pcm_end = FinalValue('pcm.port.t')\nSOC_end  = FinalValue('cells.soc')\nQ_avg    = ODEAvg('cells.qgen')                      { mean ohmic heat, W }\nm_module = 14 + 1.15 * m_pcm                         { module mass incl. PCM housing, kg }\n",
  "request": {
    "objective": "m_module",
    "decisions": [
      "m_pcm"
    ],
    "lowers": [
      1.5
    ],
    "uppers": [
      3
    ],
    "constraints": [
      "T_max <= 318.15"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 2.083931103348732,
      "tolerance": 0.00417
    },
    {
      "path": "objective.value",
      "value": 16.39652076885104,
      "tolerance": 0.0328
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-cooling-tower]
# 17. Chiller Plant with Cooling Tower

**Domains:** liquid · moist air · signal · electrical

Domains: liquid (closed condenser-water loop: pump curve, chiller condenser as a heat load, tower fill, expansion tank) + moist air (the tower rejects heat on the enthalpy potential between saturated air at the water temperature and ambient air at its wet bulb) + signal (wet-bulb feed) + electrical (fan and compressor power). More tower air lowers the condenser-water temperature, which raises the chiller COP - but fan power grows with the cube of the air flow. The air flow that minimises total plant power is the classic tower optimisation.

```run
// Chiller condenser-water loop with a cooling tower: fan vs compressor energy
{ Domains: liquid (closed condenser-water loop: pump curve, chiller condenser
  as a heat load, tower fill, expansion tank) + moist air (the tower rejects
  heat on the enthalpy potential between saturated air at the water
  temperature and ambient air at its wet bulb) + signal (wet-bulb feed) +
  electrical (fan and compressor power).

  More tower air lowers the condenser-water temperature, which raises the
  chiller COP - but fan power grows with the cube of the air flow. The air
  flow that minimises total plant power is the classic tower optimisation. }

mdot_a  = 12 [kg/s]                 { tower air flow - the design variable }
Q_evap  = 300000 [W]                { chilled-water load, 300 kW }
T_chw   = 280.15 [K]                { chilled-water supply, 7 C }
eta_II  = 0.55                      { chiller second-law efficiency }

T_wb    = WetBulb(AirH2O, T=306.15, P=101325, R=0.40)    { 33 C / 40 % RH day }
COP     = eta_II * (T_chw - 3) / (T_cw_hot + 2 - (T_chw - 3))
W_chill = Q_evap / COP
Q_rej   = Q_evap + W_chill
W_fan   = 9000 [W] * (mdot_a / 15 [kg/s])^3     { 9 kW at the rated 15 kg/s }

TABLE cwpump(Q [m^3/s]) [m]
  0       32
  0.010   30
  0.020   25
  0.030   16
  0.040   4
END

SigConstant         WB(k=T_wb)
LiquidPumpMap       PUMP(rho=996 [kg/m^3], eta=0.7, map$=cwpump)
LiquidColdPlate     COND(Q=Q_rej)                     { chiller condenser }
CoolingTower        TOWER(fluid$=Water, eps_t=0.55, mdot_a=mdot_a, Patm=101325 [Pa])
LiquidOrifice       PIPING(CdA=1.4e-3 [m^2], rho=996 [kg/m^3])
LiquidExpansionTank ET(P=180000 [Pa])
connect(PUMP.out, COND.in)
connect(COND.out, TOWER.in)
connect(TOWER.out, PIPING.in)
connect(PIPING.out, PUMP.in, ET.port)
connect(WB.out, TOWER.wb)

GUESS PUMP.in.h = 1.3e5
GUESS T_cw_hot  = 307
GUESS COND.out.h = 1.42e5
T_cw_hot  = Temperature(Water, P=TOWER.in.P, h=TOWER.in.h)    { condenser leaving }
T_cw_cold = Temperature(Water, P=PUMP.in.P, h=PUMP.in.h)      { tower leaving }
approach  = T_cw_cold - T_wb
mdot_cw   = PUMP.in.mdot
W_pump    = PUMP.W
W_plant   = W_chill + W_fan + W_pump

{ CHECK T_cw_hot 307.0039601101842 0.00307 }
{ CHECK T_cw_cold 303.7397016864686 0.00304 }
{ CHECK approach 8.211223310614514 8.21e-05 }
{ CHECK COP 4.7853547713638305 4.79e-05 }
{ CHECK W_plant 74353.16365641219 0.744 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Condenser water leaving | `T_cw_hot` | 307.0 K |
| Tower water leaving | `T_cw_cold` | 303.7 K |
| Tower approach | `approach` | 8.211 K |
| Chiller COP | `COP` | 4.785  |
| Plant power | `W_plant` | 74,353.2 W |

## Optimization

Choose the tower air flow that minimises total plant power (chiller + fan + pump).

| Setting | Value |
| --- | --- |
| Minimize | `W_plant` |
| Independent variable | `mdot_a` in [4, 20] |
| Constraints | none |
| **Optimum** | `mdot_a` = **12.999**, `W_plant` = **74,159.9** |

In the app: delete (or comment out) the `mdot_a = …` line so `mdot_a` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Chiller condenser-water loop with a cooling tower: fan vs compressor energy\n{ Domains: liquid (closed condenser-water loop: pump curve, chiller condenser\n  as a heat load, tower fill, expansion tank) + moist air (the tower rejects\n  heat on the enthalpy potential between saturated air at the water\n  temperature and ambient air at its wet bulb) + signal (wet-bulb feed) +\n  electrical (fan and compressor power).\n\n  More tower air lowers the condenser-water temperature, which raises the\n  chiller COP - but fan power grows with the cube of the air flow. The air\n  flow that minimises total plant power is the classic tower optimisation. }\n\nQ_evap  = 300000 [W]                { chilled-water load, 300 kW }\nT_chw   = 280.15 [K]                { chilled-water supply, 7 C }\neta_II  = 0.55                      { chiller second-law efficiency }\n\nT_wb    = WetBulb(AirH2O, T=306.15, P=101325, R=0.40)    { 33 C / 40 % RH day }\nCOP     = eta_II * (T_chw - 3) / (T_cw_hot + 2 - (T_chw - 3))\nW_chill = Q_evap / COP\nQ_rej   = Q_evap + W_chill\nW_fan   = 9000 [W] * (mdot_a / 15 [kg/s])^3     { 9 kW at the rated 15 kg/s }\n\nTABLE cwpump(Q [m^3/s]) [m]\n  0       32\n  0.010   30\n  0.020   25\n  0.030   16\n  0.040   4\nEND\n\nSigConstant         WB(k=T_wb)\nLiquidPumpMap       PUMP(rho=996 [kg/m^3], eta=0.7, map$=cwpump)\nLiquidColdPlate     COND(Q=Q_rej)                     { chiller condenser }\nCoolingTower        TOWER(fluid$=Water, eps_t=0.55, mdot_a=mdot_a, Patm=101325 [Pa])\nLiquidOrifice       PIPING(CdA=1.4e-3 [m^2], rho=996 [kg/m^3])\nLiquidExpansionTank ET(P=180000 [Pa])\nconnect(PUMP.out, COND.in)\nconnect(COND.out, TOWER.in)\nconnect(TOWER.out, PIPING.in)\nconnect(PIPING.out, PUMP.in, ET.port)\nconnect(WB.out, TOWER.wb)\n\nGUESS PUMP.in.h = 1.3e5\nGUESS T_cw_hot  = 307\nGUESS COND.out.h = 1.42e5\nT_cw_hot  = Temperature(Water, P=TOWER.in.P, h=TOWER.in.h)    { condenser leaving }\nT_cw_cold = Temperature(Water, P=PUMP.in.P, h=PUMP.in.h)      { tower leaving }\napproach  = T_cw_cold - T_wb\nmdot_cw   = PUMP.in.mdot\nW_pump    = PUMP.W\nW_plant   = W_chill + W_fan + W_pump\n",
  "request": {
    "objective": "W_plant",
    "decisions": [
      "mdot_a"
    ],
    "lowers": [
      4
    ],
    "uppers": [
      20
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 12.99877711740364,
      "tolerance": 0.026
    },
    {
      "path": "objective.value",
      "value": 74159.89669015231,
      "tolerance": 148.0
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-brake-fade]
# 18. Brake Heating and Thermal Fade

**Domains:** rotational · heat · signal

Domains: rotational mechanics (vehicle mass reflected to the wheel as an inertia, aerodynamic/rolling road load) + heat (brake rotor thermal mass with convective cooling, friction power as its heat input) + signal (the driver's brake-pedal command). WheelBrakeThermal makes the friction torque fall once the rotor passes its fade temperature, so the stop lengthens as the rotor heats - a two-way mechanical/thermal coupling. Rotor heat capacity C is the design lever.

```run
// Repeated hard stop: brake heating and thermal fade
{ Domains: rotational mechanics (vehicle mass reflected to the wheel as an
  inertia, aerodynamic/rolling road load) + heat (brake rotor thermal mass
  with convective cooling, friction power as its heat input) + signal (the
  driver's brake-pedal command).

  WheelBrakeThermal makes the friction torque fall once the rotor passes its
  fade temperature, so the stop lengthens as the rotor heats - a two-way
  mechanical/thermal coupling. Rotor heat capacity C is the design lever. }

C_rotor = 5500 [J/K]                { rotor thermal mass (~11 kg cast iron) }

{ 1500 kg car on 0.31 m wheels, all four brakes lumped: J = m*r^2 }
Inertia     CAR(J=1500*0.31^2, w0=100/3.6/0.31 [rad/s])       { from 100 km/h }
RoadLoad    ROAD(Crr=14 [N-m], Caero=0.0042 [kg-m^2])                  { N.m at the wheel }
MechGround  GND()
WheelBrakeThermal BRK(Tmax=2600 [N-m], eps=0.5 [rad/s], C=C_rotor, hA=35 [W/K], T_amb=303.15 [K], T_fade=673.15 [K], k_fade=0.45, eps_f=40 [K], T0=573.15 [K])
SigStep     PEDAL(t0=0.5, before=0, after=0.9, eps=0.1)
connect(CAR.port, ROAD.shaft, BRK.a)
connect(BRK.b, GND.port)
connect(PEDAL.out, BRK.u)

DYNAMIC stop(method = ode23s, time = 0 .. 8, points = 401)
END

v_end    = FinalValue('car.port.w') * 0.31 * 3.6   { km/h after 8 s }
T_peak   = MaxValue('brk.tr')                      { peak rotor temperature, K }
t_stop   = TimeAt('car.port.w', 0.5)               { time to ~0.6 km/h }
E_brake  = 0.5 * 1500 * (100/3.6)^2               { kinetic energy, J }
m_rotor  = C_rotor / 500                            { rotor mass at c = 500 J/kg-K, kg }

{ CHECK t_stop 6.470681388528072 0.000647 }
{ CHECK T_peak 663.5002591448338 0.0664 }
{ CHECK v_end -0.003935373936748883 1e-06 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Stopping time | `t_stop` | 6.471 s |
| Peak rotor temperature | `T_peak` | 663.5 K |
| Speed after 8 s | `v_end` | -0.0039 km/h |

## Optimization

Find the lightest rotor that stays at or below 700 K in a hot stop from 100 km/h.

| Setting | Value |
| --- | --- |
| Minimize | `m_rotor` |
| Independent variable | `C_rotor` in [3000, 6000] |
| Constraints | `T_peak <= 700` |
| **Optimum** | `C_rotor` = **3,781.5**, `m_rotor` = **7.563** |

In the app: delete (or comment out) the `C_rotor = …` line so `C_rotor` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Repeated hard stop: brake heating and thermal fade\n{ Domains: rotational mechanics (vehicle mass reflected to the wheel as an\n  inertia, aerodynamic/rolling road load) + heat (brake rotor thermal mass\n  with convective cooling, friction power as its heat input) + signal (the\n  driver's brake-pedal command).\n\n  WheelBrakeThermal makes the friction torque fall once the rotor passes its\n  fade temperature, so the stop lengthens as the rotor heats - a two-way\n  mechanical/thermal coupling. Rotor heat capacity C is the design lever. }\n\n\n{ 1500 kg car on 0.31 m wheels, all four brakes lumped: J = m*r^2 }\nInertia     CAR(J=1500*0.31^2, w0=100/3.6/0.31 [rad/s])       { from 100 km/h }\nRoadLoad    ROAD(Crr=14 [N-m], Caero=0.0042 [kg-m^2])                  { N.m at the wheel }\nMechGround  GND()\nWheelBrakeThermal BRK(Tmax=2600 [N-m], eps=0.5 [rad/s], C=C_rotor, hA=35 [W/K], T_amb=303.15 [K], T_fade=673.15 [K], k_fade=0.45, eps_f=40 [K], T0=573.15 [K])\nSigStep     PEDAL(t0=0.5, before=0, after=0.9, eps=0.1)\nconnect(CAR.port, ROAD.shaft, BRK.a)\nconnect(BRK.b, GND.port)\nconnect(PEDAL.out, BRK.u)\n\nDYNAMIC stop(method = ode23s, time = 0 .. 8, points = 401)\nEND\n\nv_end    = FinalValue('car.port.w') * 0.31 * 3.6   { km/h after 8 s }\nT_peak   = MaxValue('brk.tr')                      { peak rotor temperature, K }\nt_stop   = TimeAt('car.port.w', 0.5)               { time to ~0.6 km/h }\nE_brake  = 0.5 * 1500 * (100/3.6)^2               { kinetic energy, J }\nm_rotor  = C_rotor / 500                            { rotor mass at c = 500 J/kg-K, kg }\n",
  "request": {
    "objective": "m_rotor",
    "decisions": [
      "C_rotor"
    ],
    "lowers": [
      3000
    ],
    "uppers": [
      6000
    ],
    "constraints": [
      "T_peak <= 700"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 3781.497776031494,
      "tolerance": 7.56
    },
    {
      "path": "objective.value",
      "value": 7.562995552062988,
      "tolerance": 0.0151
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-rtd-bridge]
# 19. Pt100 RTD Bridge: Self-Heating vs Resolution

**Domains:** electrical · heat · sensor

Domains: electrical (bridge excitation, three precision resistors, the RTD as a temperature-dependent resistor) + heat (the RTD's own I^2 R heat through its film to the measured fluid) + sensor signal chain (bridge output amplified and quantized by an ADC). The RTD reads its OWN temperature, which self-heating lifts above the fluid's: raising the excitation raises that error with V^2. Lowering it shrinks the bridge signal until one ADC count spans a large temperature step. The best excitation balances the two error sources.

```run
// Pt100 RTD in a Wheatstone bridge: self-heating versus resolution
{ Domains: electrical (bridge excitation, three precision resistors, the RTD
  as a temperature-dependent resistor) + heat (the RTD's own I^2 R heat
  through its film to the measured fluid) + sensor signal chain (bridge
  output amplified and quantized by an ADC).

  The RTD reads its OWN temperature, which self-heating lifts above the
  fluid's: raising the excitation raises that error with V^2. Lowering it
  shrinks the bridge signal until one ADC count spans a large temperature
  step. The best excitation balances the two error sources. }

V_ex    = 2.0 [V]               { bridge excitation - the design variable }
T_fluid = 353.15 [K]            { true process temperature, 80 C }
G_amp   = 50                    { instrumentation-amplifier gain }
LSB     = 10 [V] / 2^12             { 12-bit ADC on a 10 V span, V per count }

VoltageSource     EXC(E=V_ex)
Ground            GND()
Resistor          R1(R=100 [ohm])
Resistor          R2(R=100 [ohm])
Resistor          R3(R=130.9 [ohm])       { bridge balanced near the mid-range }
HarnessResistance RTD(R20=107.79 [ohm], alphaT=0.00385 [1/K])   { Pt100 referred to 20 C }
connect(EXC.p, R1.a, R3.a)
connect(R1.b, R2.a)
connect(R3.b, RTD.a)
connect(R2.b, RTD.b, EXC.n, GND.port)

{ thermal: RTD film -> process fluid (dissipation constant 2.5 mW/K) }
ContactResistance FILM(Rth=400 [K/W])
ThermalSource     FLUID(T=T_fluid)
connect(RTD.heat, FILM.a)
connect(FILM.b, FLUID.port)

{ signal chain: bridge differential voltage -> amplifier -> ADC counts }
V_bridge = R1.b.V - R3.b.V
V_out    = G_amp * V_bridge

{ the indicator assumes a cold (non-self-heated) RTD and inverts the bridge }
R_meas   = 130.9 [ohm] * (V_ex/2 - V_bridge) / (V_ex/2 + V_bridge)
T_ind    = 293.15 [K] + (R_meas / 107.79 [ohm] - 1) / 0.00385 [1/K]
e_self   = T_ind - T_fluid                         { self-heating error, K }
S_T      = G_amp * V_ex * 0.00385 [1/K] * 107.79 [ohm] * 130.9 [ohm] / (130.9 [ohm] + 136.7 [ohm])^2  { V/K near balance }
e_adc    = LSB / S_T                               { one ADC count in kelvin }
e_total  = sqrt(e_self^2 + e_adc^2)
P_rtd    = RTD.Q                                   { power dissipated in the RTD, W }

{ CHECK P_rtd 0.007638401395378326 1e-06 }
{ CHECK V_bridge -0.01154371452251568 1e-06 }
{ CHECK e_self 3.055360558151392 3.06e-05 }
{ CHECK e_adc 0.03218351109986701 1e-06 }
{ CHECK e_total 3.055530055275827 3.06e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Power in the RTD | `P_rtd` | 0.0076 W |
| Bridge output | `V_bridge` | -0.0115 V |
| Self-heating error | `e_self` | 3.055 K |
| One ADC count | `e_adc` | 0.0322 K |
| Combined error | `e_total` | 3.056 K |

## Optimization

Choose the bridge excitation that minimises the combined measurement error.

| Setting | Value |
| --- | --- |
| Minimize | `e_total` |
| Independent variable | `V_ex` in [0.1, 5] |
| Constraints | none |
| **Optimum** | `V_ex` = **0.3906**, `e_total` = **0.2018** |

In the app: delete (or comment out) the `V_ex = …` line so `V_ex` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Pt100 RTD in a Wheatstone bridge: self-heating versus resolution\n{ Domains: electrical (bridge excitation, three precision resistors, the RTD\n  as a temperature-dependent resistor) + heat (the RTD's own I^2 R heat\n  through its film to the measured fluid) + sensor signal chain (bridge\n  output amplified and quantized by an ADC).\n\n  The RTD reads its OWN temperature, which self-heating lifts above the\n  fluid's: raising the excitation raises that error with V^2. Lowering it\n  shrinks the bridge signal until one ADC count spans a large temperature\n  step. The best excitation balances the two error sources. }\n\nT_fluid = 353.15 [K]            { true process temperature, 80 C }\nG_amp   = 50                    { instrumentation-amplifier gain }\nLSB     = 10 [V] / 2^12             { 12-bit ADC on a 10 V span, V per count }\n\nVoltageSource     EXC(E=V_ex)\nGround            GND()\nResistor          R1(R=100 [ohm])\nResistor          R2(R=100 [ohm])\nResistor          R3(R=130.9 [ohm])       { bridge balanced near the mid-range }\nHarnessResistance RTD(R20=107.79 [ohm], alphaT=0.00385 [1/K])   { Pt100 referred to 20 C }\nconnect(EXC.p, R1.a, R3.a)\nconnect(R1.b, R2.a)\nconnect(R3.b, RTD.a)\nconnect(R2.b, RTD.b, EXC.n, GND.port)\n\n{ thermal: RTD film -> process fluid (dissipation constant 2.5 mW/K) }\nContactResistance FILM(Rth=400 [K/W])\nThermalSource     FLUID(T=T_fluid)\nconnect(RTD.heat, FILM.a)\nconnect(FILM.b, FLUID.port)\n\n{ signal chain: bridge differential voltage -> amplifier -> ADC counts }\nV_bridge = R1.b.V - R3.b.V\nV_out    = G_amp * V_bridge\n\n{ the indicator assumes a cold (non-self-heated) RTD and inverts the bridge }\nR_meas   = 130.9 [ohm] * (V_ex/2 - V_bridge) / (V_ex/2 + V_bridge)\nT_ind    = 293.15 [K] + (R_meas / 107.79 [ohm] - 1) / 0.00385 [1/K]\ne_self   = T_ind - T_fluid                         { self-heating error, K }\nS_T      = G_amp * V_ex * 0.00385 [1/K] * 107.79 [ohm] * 130.9 [ohm] / (130.9 [ohm] + 136.7 [ohm])^2  { V/K near balance }\ne_adc    = LSB / S_T                               { one ADC count in kelvin }\ne_total  = sqrt(e_self^2 + e_adc^2)\nP_rtd    = RTD.Q                                   { power dissipated in the RTD, W }\n",
  "request": {
    "objective": "e_total",
    "decisions": [
      "V_ex"
    ],
    "lowers": [
      0.1
    ],
    "uppers": [
      5
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 0.3905739363894377,
      "tolerance": 0.000781
    },
    {
      "path": "objective.value",
      "value": 0.20183942021468632,
      "tolerance": 0.000404
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]

[Topic: md-radiant-ceiling]
# 20. Chilled Radiant Ceiling with Dew-Point Guard

**Domains:** liquid · heat · moist air

Domains: liquid (chilled-water circuit through the panel tubes) + heat (tube wall -> panel surface -> room by combined radiation/convection) + moist air (the room's dew point decides how cold the panel may run). RadiantPanel uses the EN 14240-style characteristic q = C*dT^n between the room and the panel surface and reports the margin between the surface and the room dew point. Colder water cools more, but the panel must stay above the dew point or it drips: the supply temperature is optimised against that constraint.

```run
// Chilled radiant ceiling with a condensation (dew-point) guard
{ Domains: liquid (chilled-water circuit through the panel tubes) + heat
  (tube wall -> panel surface -> room by combined radiation/convection) +
  moist air (the room's dew point decides how cold the panel may run).

  RadiantPanel uses the EN 14240-style characteristic q = C*dT^n between the
  room and the panel surface and reports the margin between the surface and
  the room dew point. Colder water cools more, but the panel must stay above
  the dew point or it drips: the supply temperature is optimised against
  that constraint. }

T_sup  = 289.15 [K]                 { chilled-water supply - the design variable }
W_room = 0.0105                     { room humidity ratio (~26 C, 50 % RH) }

LiquidSource  CHW(fluid$=Water, mdot=0.18 [kg/s], P=200000 [Pa], T=T_sup)
LiquidWallHX  TUBES(fluid$=Water, UA=420 [W/K])
LiquidSink    RET()
RadiantPanel  PANEL(A=24 [m^2], C=8.9 [W/m^2-K], n=1.08, eps_dT=0.05 [K], W_room=W_room, P_room=101325 [Pa])
ThermalSource ROOM(T=299.15 [K])
connect(CHW.out, TUBES.in)
connect(TUBES.out, RET.in)
connect(TUBES.wall, PANEL.wall)
connect(PANEL.zone, ROOM.port)

Q_cool  = PANEL.Q                                  { room cooling, W }
T_surf  = PANEL.wall.T
T_dew   = PANEL.T_dp_room
margin  = PANEL.margin_dp                          { must stay >= 2 K }
T_ret   = Temperature(Water, P=RET.P, h=RET.h)
q_flux  = Q_cool / 24                               { W/m2 }

{ CHECK Q_cool 1392.711207994382 0.0139 }
{ CHECK q_flux 58.02963366643258 0.00058 }
{ CHECK T_surf 293.47529837670254 0.00293 }
{ CHECK T_dew 287.87118670638273 0.00288 }
{ CHECK margin 5.60411167031981 5.6e-05 }
```

### Key results

| Quantity | Variable | Value |
| --- | --- | --- |
| Room cooling | `Q_cool` | 1,392.7 W |
| Panel flux | `q_flux` | 58.030 W/m^2 |
| Panel surface | `T_surf` | 293.5 K |
| Room dew point | `T_dew` | 287.9 K |
| Dew-point margin | `margin` | 5.604 K |

## Optimization

Maximise cooling while keeping the panel 2 K above the room dew point.

| Setting | Value |
| --- | --- |
| Maximize | `Q_cool` |
| Independent variable | `T_sup` in [280, 295] |
| Constraints | `margin >= 2` |
| **Optimum** | `T_sup` = **282.5**, `Q_cool` = **2,368.6** |

In the app: delete (or comment out) the `T_sup = …` line so `T_sup` is free, then use **Tools → Minimize / Maximize** with the settings above. The request below is the same run, executed and asserted by the documentation gate:

```json
{
  "operation": "optimize",
  "text": "// Chilled radiant ceiling with a condensation (dew-point) guard\n{ Domains: liquid (chilled-water circuit through the panel tubes) + heat\n  (tube wall -> panel surface -> room by combined radiation/convection) +\n  moist air (the room's dew point decides how cold the panel may run).\n\n  RadiantPanel uses the EN 14240-style characteristic q = C*dT^n between the\n  room and the panel surface and reports the margin between the surface and\n  the room dew point. Colder water cools more, but the panel must stay above\n  the dew point or it drips: the supply temperature is optimised against\n  that constraint. }\n\nW_room = 0.0105                     { room humidity ratio (~26 C, 50 % RH) }\n\nLiquidSource  CHW(fluid$=Water, mdot=0.18 [kg/s], P=200000 [Pa], T=T_sup)\nLiquidWallHX  TUBES(fluid$=Water, UA=420 [W/K])\nLiquidSink    RET()\nRadiantPanel  PANEL(A=24 [m^2], C=8.9 [W/m^2-K], n=1.08, eps_dT=0.05 [K], W_room=W_room, P_room=101325 [Pa])\nThermalSource ROOM(T=299.15 [K])\nconnect(CHW.out, TUBES.in)\nconnect(TUBES.out, RET.in)\nconnect(TUBES.wall, PANEL.wall)\nconnect(PANEL.zone, ROOM.port)\n\nQ_cool  = PANEL.Q                                  { room cooling, W }\nT_surf  = PANEL.wall.T\nT_dew   = PANEL.T_dp_room\nmargin  = PANEL.margin_dp                          { must stay >= 2 K }\nT_ret   = Temperature(Water, P=RET.P, h=RET.h)\nq_flux  = Q_cool / 24                               { W/m2 }\n",
  "request": {
    "objective": "Q_cool",
    "maximize": true,
    "decisions": [
      "T_sup"
    ],
    "lowers": [
      280
    ],
    "uppers": [
      295
    ],
    "constraints": [
      "margin >= 2"
    ]
  },
  "checks": [
    {
      "path": "decisions.0.value",
      "value": 282.51894487510435,
      "tolerance": 0.565
    },
    {
      "path": "objective.value",
      "value": 2368.610137430862,
      "tolerance": 4.74
    }
  ]
}
```

[Related: md-overview, comp-domains, optimization]
