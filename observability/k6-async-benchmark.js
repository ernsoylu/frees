# Performance Benchmark: frEES Asynchronous Compute Architecture
#
# Run against the docker-compose stack (api-node + 3 compute-nodes + rabbitmq
# + redis + otel-collector + jaeger):
#
#   docker compose up -d --build
#   k6 run observability/k6-async-benchmark.js
#
# Exercises the asynchronous submit→poll path (POST /api/solve → 202 → poll
# GET /api/jobs/{id} until COMPLETED) under ramping load, to benchmark the
# async architecture and verify that the 3 compute replicas share the work
# (fair dispatch via prefetch=1). Tune RAMP/STAGE constants as needed.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const API_BASE = __ENV.API_BASE || 'http://localhost:8080';

// Custom metrics
const jobLatency = new Trend('job_latency_ms', true);     // submit→COMPLETED
const pollCount = new Counter('poll_count');
const jobsCompleted = new Counter('jobs_completed');
const jobsFailed = new Counter('jobs_failed');

// A small solve that exercises the solver without CoolProp: x + y = 3, y = 1.
const SOLVE_BODY = JSON.stringify({ text: 'x + y = 3\ny = 1' });

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warm up to 10 concurrent users
    { duration: '1m',  target: 30 },   // sustained load
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    // 95% of jobs should complete (submit→poll) under 2s at this load.
    'job_latency_ms': ['p(95) < 2000'],
    'http_req_failed': ['rate < 0.01'],
  },
};

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 15000;

/** Submit a solve job and poll until terminal, returning the final state. */
function submitAndPoll() {
  const submit = http.post(`${API_BASE}/api/solve`, SOLVE_BODY, {
    headers: { 'Content-Type': 'application/json' },
  });

  const accepted = check(submit, {
    'submit returns 202': (r) => r.status === 202,
  });
  if (!accepted) {
    jobsFailed.add(1);
    return;
  }

  const jobId = submit.json('jobId');
  if (!jobId) {
    jobsFailed.add(1);
    return;
  }

  const start = Date.now();
  const deadline = start + POLL_TIMEOUT_MS;
  let state = null;

  while (Date.now() < deadline) {
    sleep(POLL_INTERVAL_MS / 1000);
    pollCount.add(1);
    const poll = http.get(`${API_BASE}/api/jobs/${jobId}`);
    if (poll.status !== 200) {
      continue;
    }
    state = poll.json();
    if (state.status === 'COMPLETED' || state.status === 'FAILED') {
      break;
    }
  }

  const latency = Date.now() - start;
  jobLatency.add(latency);

  if (!state || state.status === 'FAILED' || (Date.now() >= deadline)) {
    jobsFailed.add(1);
  } else {
    jobsCompleted.add(1);
    check(state, {
      'job completed': (s) => s.status === 'COMPLETED',
      'solve succeeded': (s) => s.result && s.result.success === true,
    });
  }
}

export default function () {
  submitAndPoll();
}
