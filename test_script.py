import sys
import json
from frees.solver.frontend_api import check

text = """m = 1500 [kg]
Crr = 0.012
g = 9.81 [m/s^2]
rho_air = 1.2 [kg/m^3]
Cd = 0.30
Af = 2.2 [m^2]

v = t * 1 [m/s]
F_roll = Crr * m * g
F_aero = 0.5 * rho_air * Cd * Af * v^2
P = (F_roll + F_aero) * v

E_total = IntegralValue('P', 't')
P_avg = TableAvg('P')

PARAMETRIC drive (t, v, P)
  t = 0:2:30
END"""

res = check(text, [], False, [])
print(json.dumps(res['parametricTables'], indent=2))
