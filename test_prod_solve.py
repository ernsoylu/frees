import urllib.request
import json
import time

url_solve = 'https://frees-api-production.up.railway.app/api/solve'
payload = {
    'text': '''# Rankine Cycle (Steam)
{ Ideal steam Rankine cycle using CoolProp water properties. }
P_boiler = 8000 [kPa]
P_cond = 10 [kPa]

{ State 1: saturated liquid leaving the condenser }
h1 = Enthalpy(Water, P=P_cond, x=0)
v1 = Volume(Water, P=P_cond, x=0)

{ Pump (state 1 -> 2) }
w_pump = v1 * (P_boiler - P_cond)
h2 = h1 + w_pump

{ State 3: boiler exit (superheated) }
h3 = Enthalpy(Water, P=P_boiler, T=480 [C])
s3 = Entropy(Water, P=P_boiler, T=480 [C])

{ State 4: turbine exit (isentropic, s4 = s3) }
h4 = Enthalpy(Water, P=P_cond, s=s3)

{ Performance }
q_in = h3 - h2
w_turb = h3 - h4
eta_th = (w_turb - w_pump) / q_in
''',
    'stopCriteria': None,
    'variableInfo': [],
    'findAllSolutions': False,
    'displayUnitSystem': 'SI',
    'fillMissing': True
}

req = urllib.request.Request(url_solve, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})

start_time = time.time()
job_id = None
with urllib.request.urlopen(req) as response:
    res_data = json.loads(response.read().decode('utf-8'))
    job_id = res_data.get('jobId')
    print('Job submitted:', job_id)

if job_id:
    while True:
        req_poll = urllib.request.Request(f'https://frees-api-production.up.railway.app/api/jobs/{job_id}', method='GET')
        with urllib.request.urlopen(req_poll) as response:
            poll_data = json.loads(response.read().decode('utf-8'))
            if poll_data.get('status') == 'COMPLETED':
                end_time = time.time()
                print('Job completed!')
                print('Total time taken: {:.2f} ms'.format((end_time - start_time) * 1000))
                break
            elif poll_data.get('status') == 'FAILED':
                print('Job failed!')
                break
        time.sleep(0.1)

