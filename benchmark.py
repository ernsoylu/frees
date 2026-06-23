import urllib.request
import json
import time
import sys

if len(sys.argv) != 2:
    print("Usage: python3 benchmark.py <api_base_url>")
    sys.exit(1)

base_url = sys.argv[1].rstrip('/')
url = f"{base_url}/api/solve"

payload_text = """{ Automotive cooling loop: radiator + electric pump + electric fan.
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
W_pump = head * Vc / eta_pump
"""

payload = {
    'text': payload_text,
    'variableInfo': [],
    'complexMode': False,
    'functionTables': [],
    'overrides': []
}
data = json.dumps(payload).encode('utf-8')

latencies = []
for i in range(100):
    try:
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        start = time.time()
        with urllib.request.urlopen(req) as response:
            body = response.read()
            status = response.status
            if status == 202:
                ticket = json.loads(body)
                job_id = ticket.get('jobId')
                
                url_stream = f"{base_url}/api/jobs/{job_id}/stream"
                req_stream = urllib.request.Request(url_stream, headers={'Accept': 'text/event-stream'})
                with urllib.request.urlopen(req_stream) as stream_response:
                    for line in stream_response:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data:'):
                            job_state = json.loads(line[5:])
                            if job_state['status'] in ('COMPLETED', 'FAILED'):
                                break
        end = time.time()
        latency = int((end - start)*1000)
        latencies.append(latency)
        print(f"Run {i+1}/100: {latency} ms")
    except Exception as e:
        print(f"Run {i+1}/100 failed: {e}")
        latencies.append(-1)
    
    if i < 99:
        time.sleep(1)

valid_latencies = [l for l in latencies if l != -1]
if valid_latencies:
    print(f"\n--- Benchmark Results for {base_url} ---")
    print(f"Total runs: {len(latencies)}")
    print(f"Successful runs: {len(valid_latencies)}")
    print(f"Min latency: {min(valid_latencies)} ms")
    print(f"Max latency: {max(valid_latencies)} ms")
    print(f"Avg latency: {sum(valid_latencies)/len(valid_latencies):.2f} ms")
else:
    print("All runs failed.")
