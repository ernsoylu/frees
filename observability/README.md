# Observability & Performance

## Distributed Tracing (OpenTelemetry → Jaeger)

The asynchronous compute architecture instruments a single distributed trace
that spans the full request lifecycle:

```
HTTP /api/solve (api-node)
  └─ RabbitMQ publish (api-node, TraceContextInjector writes traceparent header)
      └─ compute-task consumer span (compute-node, extracts traceparent)
          ├─ solver execution
          └─ Redis job-state write (auto-instrumented)
```

The `opentelemetry-spring-boot-starter` auto-instruments HTTP and Redis.
RabbitMQ context propagation is wired by hand (`config/TraceContextInjector`
on the producer, extraction in `compute/ComputeTaskListener` on the consumer)
because the starter does not ship a Spring-AMQP instrumentation module.

### Running the tracing stack

```bash
docker compose up -d --build rabbitmq redis otel-collector jaeger api-node compute-node
# Submit a solve, then inspect the trace:
open http://localhost:16686   # Jaeger UI — search service "api-node" / "compute-node"
```

The `api-node` and `compute-node` containers export OTLP/gRPC traces to the
`otel-collector`, which forwards them to `jaeger`. Both nodes set
`OTEL_SERVICE_NAME` so the two halves of each trace are attributed to the
correct service.

## Performance Benchmark (k6)

`k6-async-benchmark.js` exercises the asynchronous submit→poll path
(`POST /api/solve` → 202 → poll `GET /api/jobs/{id}`) under ramping load,
measuring submit→COMPLETED latency and verifying the 3 compute replicas share
the work.

```bash
docker compose up -d --build
k6 run observability/k6-async-benchmark.js
```

Custom metrics: `job_latency_ms` (submit→terminal, p(95) threshold < 2s),
`poll_count`, `jobs_completed`, `jobs_failed`. Override the target with
`API_BASE=http://host:port k6 run ...`.

## End-to-end bring-up

```bash
docker compose up --build
```

Brings up: `redis`, `rabbitmq`, `otel-collector`, `jaeger`, `api-node`
(profile `api`), `compute-node` (profile `compute`, `replicas: 3`, headless
via `SPRING_MAIN_WEB_APPLICATION_TYPE=none`), and `frontend`.

- API: <http://localhost:8080/api>
- Frontend: <http://localhost:5173>
- RabbitMQ management: <http://localhost:15672> (guest/guest)
- Jaeger UI: <http://localhost:16686>

To exercise the asynchronous path from the frontend, build it with
`VITE_ASYNC_API=1`; otherwise it uses the synchronous default-profile path.
