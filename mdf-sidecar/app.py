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

# Largest upload accepted, mirroring the Java tier's own cap. Enforced here too
# because the body is read fully into memory before asammdf sees it, and this
# service runs a single uvicorn worker: one oversized request is enough to take
# it out for everyone.
MAX_BODY_BYTES = 210 * 1024 * 1024

# Largest channel this service will materialise, as a sample count. The upload
# cap does NOT bound this: the DZ blocks that are the whole reason this sidecar
# exists are DEFLATE/ZSTD/LZ4 compressed, so a file well inside the size limit
# can expand to many gigabytes of samples. Each sample becomes two float64s
# (time + value) in the response, so 50M samples is ~800 MB — already generous
# for a recording, and refused before anything is allocated rather than after
# the process has been OOM-killed.
MAX_CHANNEL_SAMPLES = 50_000_000


def _typed_error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


async def _read_capped(request: Request) -> bytes:
    """Read the body, aborting as soon as it exceeds the cap.

    Streamed rather than ``await request.body()`` so an oversized upload is
    dropped while it arrives instead of being buffered in full first — a
    declared Content-Length is only a hint, and the point is to never hold the
    oversized payload at all.
    """
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > MAX_BODY_BYTES:
            raise _TooLarge()
        chunks.append(chunk)
    return b"".join(chunks)


class _TooLarge(Exception):
    """Upload exceeded MAX_BODY_BYTES."""


def _open(body: bytes) -> MDF:
    if len(body) < 8 or not body.startswith(b"MDF"):
        raise MdfException("Not an MDF file: missing the MDF ID block.")
    return MDF(io.BytesIO(body))


def _too_large_response() -> JSONResponse:
    return _typed_error(413, f"Upload exceeds the {MAX_BODY_BYTES}-byte limit.")


def _kind(samples_dtype) -> str:
    return "analog" if samples_dtype.kind in ("i", "u", "f") else "string"


@app.get("/health")
def health() -> dict:
    import asammdf

    return {"status": "UP", "asammdf": asammdf.__version__}


@app.post("/parse-metadata")
async def parse_metadata(request: Request):
    try:
        body = await _read_capped(request)
    except _TooLarge:
        return _too_large_response()
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
    try:
        body = await _read_capped(request)
    except _TooLarge:
        return _too_large_response()
    try:
        mdf = _open(body)
        # Refuse before materialising: cycles_nr comes from the channel group's
        # header, so an over-large channel is rejected without ever decompressing
        # its data blocks. Checking after mdf.get() would be too late — that call
        # is what allocates the arrays this guard exists to prevent.
        try:
            declared = int(mdf.groups[group].channel_group.cycles_nr)
        except (IndexError, AttributeError, TypeError, ValueError):
            declared = 0
        if declared > MAX_CHANNEL_SAMPLES:
            return _typed_error(
                422,
                f'Channel "{channel}" declares {declared} samples, over the '
                f"{MAX_CHANNEL_SAMPLES} limit. Export a shorter time range.",
            )
        try:
            signal = mdf.get(channel, group=group)
        except MdfException as e:
            return _typed_error(
                422, f'Channel "{channel}" not found in group {group}: {e}'
            )
        if len(signal.timestamps) > MAX_CHANNEL_SAMPLES:
            return _typed_error(
                422,
                f'Channel "{channel}" has {len(signal.timestamps)} samples, over '
                f"the {MAX_CHANNEL_SAMPLES} limit. Export a shorter time range.",
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
