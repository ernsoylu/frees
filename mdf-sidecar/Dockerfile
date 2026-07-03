# frees MDF sidecar: asammdf (the reference MDF4 implementation) behind ~3
# stateless REST endpoints (todo.md decision 4). Covers the DZ-compressed
# .mf4 files the in-process mdf4j parser cannot read.
FROM python:3.12-slim

WORKDIR /app

# asammdf pulls numpy/pandas wheels — pinned loosely to the tested majors.
RUN pip install --no-cache-dir "asammdf>=8.8,<9" "fastapi>=0.115,<1" \
    "uvicorn>=0.30,<1" "python-multipart>=0.0.9"

COPY app.py .

EXPOSE 8090
# Single worker: requests are I/O + numpy bound and the service is a
# low-traffic fallback rung; scale via replicas if ever needed.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
