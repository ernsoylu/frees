"""frees MDF sidecar (Data Analyzer Phase 3, fallback-ladder rung 3).

A stateless asammdf-based parser for the MDF4 features mdf4j 0.2.0 cannot
read — DZ-compressed data blocks (deflate/ZSTD/LZ4), the norm for OEM
recordings (spike matrix in todo.md). The Java tier calls it only after the
in-process parser fails, so uncompressed files never pay the hop.

Contract (todo.md decision 4): internal REST on the private network, ~3
stateless endpoints, no state — the file is re-streamed per request and a
sidecar restart is invisible beyond a retried request. Parse failures are
typed JSON errors (never a bare 500), surfaced verbatim to the user.

Endpoints:
  GET  /health                          → {"status": "UP", "asammdf": <ver>}
  POST /parse-metadata   (file bytes)   → MeasurementMetadata JSON
  POST /extract-channel?group=&channel= (file bytes)
       → binary: int64 LE count n, then n float64 LE times, n float64 LE values
         (JSON for a 1M-sample channel would be ~40 MB of text; binary is 16 MB
         and decodes straight into double[] on the Java side)
"""

import io
import struct

import numpy as np
from asammdf import MDF
from asammdf.blocks.utils import MdfException
from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, Response

app = FastAPI(title="frees-mdf-sidecar")


def _typed_error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


def _open(body: bytes) -> MDF:
    if len(body) < 8 or not body.startswith(b"MDF"):
        raise MdfException("Not an MDF file: missing the MDF ID block.")
    return MDF(io.BytesIO(body))


def _kind(samples_dtype) -> str:
    return "analog" if samples_dtype.kind in ("i", "u", "f") else "string"


@app.get("/health")
def health() -> dict:
    import asammdf

    return {"status": "UP", "asammdf": asammdf.__version__}


@app.post("/parse-metadata")
async def parse_metadata(request: Request):
    body = await request.body()
    try:
        mdf = _open(body)
        groups = []
        for index, group in enumerate(mdf.groups):
            channels = []
            for ch in group.channels:
                # channel_type 2/3 = master / virtual master.
                is_master = ch.channel_type in (2, 3)
                # dtype_fmt reflects the physical (post-conversion) type.
                try:
                    kind = _kind(np.dtype(ch.dtype_fmt))
                except Exception:  # noqa: BLE001 — unknown dtype → unplottable
                    kind = "string"
                channels.append(
                    {
                        "name": ch.name,
                        "unit": (ch.conversion and ch.conversion.unit) or ch.unit or None,
                        "timeMaster": bool(is_master),
                        "kind": kind,
                    }
                )
            groups.append(
                {
                    "index": index,
                    "name": group.channel_group.acq_name or f"group {index}",
                    "records": int(group.channel_group.cycles_nr),
                    "channels": channels,
                }
            )
        if not groups:
            return _typed_error(422, "The MDF4 file contains no channel groups.")
        return {"groups": groups}
    except MdfException as e:
        return _typed_error(422, f"asammdf could not parse the file: {e}")


@app.post("/extract-channel")
async def extract_channel(request: Request, group: int = Query(0), channel: str = Query(...)):
    body = await request.body()
    try:
        mdf = _open(body)
        try:
            signal = mdf.get(channel, group=group)
        except MdfException as e:
            return _typed_error(
                422, f'Channel "{channel}" not found in group {group}: {e}'
            )
        times = np.ascontiguousarray(signal.timestamps, dtype="<f8")
        values = np.ascontiguousarray(signal.samples, dtype="<f8")
        # Invalidation bits → NaN, mirroring the in-process parser.
        if signal.invalidation_bits is not None:
            values = values.copy()
            values[np.asarray(signal.invalidation_bits, dtype=bool)] = np.nan
        payload = struct.pack("<q", len(times)) + times.tobytes() + values.tobytes()
        return Response(content=payload, media_type="application/octet-stream")
    except MdfException as e:
        return _typed_error(422, f"asammdf could not read the channel: {e}")
    except (TypeError, ValueError) as e:
        # Non-numeric (string/bytes) channels cannot widen to float64.
        return _typed_error(422, f'Channel "{channel}" is not numeric: {e}')
