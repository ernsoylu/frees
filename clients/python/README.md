# frees-client

Minimal Python client for the [frees](https://github.com/ernsoylu/frees) REST
API — enough to script solves from notebooks, CI pipelines, or parameter
studies without the web UI.

```bash
pip install ./clients/python          # from a repo checkout
```

```python
from frees_client import FreesClient, SolveFailed

frees = FreesClient("http://localhost:8080")

result = frees.solve("x^2 + y^3 = 77\nx / y = 1.23456")
print(frees.variables(result))        # {'x': 4.694..., 'y': 3.802...}

try:
    frees.solve("x + y = 10\nx + y = 12\nz = 5")
except SolveFailed as e:
    print(e)                          # names the stalled block
    print(e.envelope["failedBlockIndex"], len(e.envelope["residuals"]))
```

Notes:

- Works against both deployment modes: the async `api` profile (202 + job
  polling) and the synchronous default profile — `solve()` handles either.
- A failed solve raises `SolveFailed` whose `.envelope` carries the same
  diagnostics the web UI renders: `error`, `errorLine`, `failedBlockIndex`,
  `blocks`, and per-equation `residuals` at the point of failure.
- The backend rate-limits per client IP (120 requests/min by default);
  long-running sweeps should pace themselves accordingly.
- The machine-readable contract lives at `GET /api/openapi` (OpenAPI 3).
