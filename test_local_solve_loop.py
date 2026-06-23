import urllib.request
import json
import time

url = 'http://localhost:8080/api/solve'
payload = {
    'text': '''# Rankine Cycle (Steam)
{ Ideal steam Rankine cycle using CoolProp water properties }

# State 1: Pump Inlet
P_1 = 10 [kPa]
x_1 = 0
h_1 = h(Water, P=P_1, x=x_1)
v_1 = v(Water, P=P_1, x=x_1)
s_1 = s(Water, P=P_1, x=x_1)

# State 2: Boiler Inlet
P_2 = 2000 [kPa]
s_2s = s_1
h_2s = h(Water, P=P_2, s=s_2s)
w_pump_ideal = v_1 * (P_2 - P_1)
h_2 = h_1 + w_pump_ideal
eta_pump = (h_2s - h_1) / (h_2 - h_1)

# State 3: Turbine Inlet
P_3 = P_2
x_3 = 1
h_3 = h(Water, P=P_3, x=x_3)
s_3 = s(Water, P=P_3, x=x_3)

# State 4: Condenser Inlet
P_4 = P_1
s_4s = s_3
h_4s = h(Water, P=P_4, s=s_4s)
x_4s = x(Water, P=P_4, s=s_4s)

eta_turbine = 0.85
h_4 = h_3 - eta_turbine * (h_3 - h_4s)

# Performance
q_in = h_3 - h_2
q_out = h_4 - h_1
w_net = (h_3 - h_4) - (h_2 - h_1)
eta_th = w_net / q_in''',
    'variableInfo': [],
    'complexMode': False,
    'functionTables': [],
    'overrides': []
}
data = json.dumps(payload).encode('utf-8')

for i in range(5):
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    start = time.time()
    with urllib.request.urlopen(req) as response:
        body = response.read()
        status = response.status
        if status == 202:
            ticket = json.loads(body)
            job_id = ticket.get('jobId')
            
            url_stream = f"http://localhost:8080/api/jobs/{job_id}/stream"
            req_stream = urllib.request.Request(url_stream, headers={'Accept': 'text/event-stream'})
            with urllib.request.urlopen(req_stream) as stream_response:
                for line in stream_response:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data:'):
                        job_state = json.loads(line[5:])
                        if job_state['status'] in ('COMPLETED', 'FAILED'):
                            break
    end = time.time()
    print(f"Run {i+1}: {int((end - start)*1000)} ms")
