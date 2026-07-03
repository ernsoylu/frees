#!/usr/bin/env python3
"""MDF4 spike/test fixture generator (todo.md Phase 3 spike pre-work).

Generates the gated fixture set with Python asammdf — the reference MDF4
implementation (using it here also proves the asammdf-sidecar rung's
toolchain). Fixtures are generated at test time, never committed as binaries,
EXCEPT (a) small_uncompressed.mf4 which is committed next to this script so
:core:test always has a real .mf4 to parse.

Usage:
    python -m venv venv && venv/bin/pip install asammdf
    venv/bin/python generate_mdf_fixtures.py <outdir> [--large]

Fixture set (spike gates in todo.md Phase 3):
  a_small_uncompressed.mf4  v4.10, no compression, 3 ch x 1000 samples,
                            speed spike at t=5.00s (value 99.5) for the
                            envelope-preservation test
  b_zstd.mf4                v4.30, ZSTD DZ blocks
  c_lz4.mf4                 v4.30, LZ4 DZ blocks
  d_vlsd.mf4                string channel (VLSD storage)
  e_multigroup.mf4          two channel groups w/ different rasters, linear
                            + value-to-text conversions (deflate DZ)
  f_large.mf4               ~100 MB (only with --large; Gate 3 scale test)
"""

import sys

import numpy as np
from asammdf import MDF, Signal


def base_signals(n: int, rate_hz: float) -> list[Signal]:
    t = np.arange(n, dtype=np.float64) / rate_hz
    speed = 20 + 10 * np.sin(2 * t)
    valve = ((t >= 5.0) & (t < 5.0 + 50 / rate_hz)).astype(np.uint8)
    return [
        Signal(samples=speed, timestamps=t, name="speed", unit="m/s"),
        Signal(samples=150 + 40 * np.cos(0.7 * t), timestamps=t, name="torque", unit="Nm"),
        Signal(samples=valve, timestamps=t, name="valve_open", unit="-"),
    ]


def with_spike(signals: list[Signal]) -> list[Signal]:
    # Single-sample spike the decimated envelope must preserve.
    idx = np.searchsorted(signals[0].timestamps, 5.0)
    signals[0].samples[idx] = 99.5
    return signals


def save(mdf: MDF, path: str, compression: int) -> None:
    out = mdf.save(path, overwrite=True, compression=compression)
    print(f"wrote {out}")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = sys.argv[1].rstrip("/")
    large = "--large" in sys.argv

    # (a) small uncompressed — the committed :core:test fixture.
    mdf = MDF(version="4.10")
    mdf.append(with_spike(base_signals(1000, 100.0)), comment="frees spike fixture a")
    save(mdf, f"{out}/a_small_uncompressed.mf4", compression=0)

    # (b) ZSTD + (c) LZ4 DZ blocks (MDF 4.30 features — the OEM breakers).
    for name, version, comp in (("b_zstd", "4.30", 3), ("c_lz4", "4.30", 5)):
        mdf = MDF(version=version)
        mdf.append(with_spike(base_signals(100_000, 1000.0)), comment=f"frees spike fixture {name}")
        save(mdf, f"{out}/{name}.mf4", compression=comp)

    # (d) VLSD: variable-length string channel (asammdf wants byte strings).
    t = np.arange(1000, dtype=np.float64) / 100.0
    states = np.full(1000, b"IDLE", dtype="S8")
    states[300:600] = b"RUN"
    states[600:] = b"FAULT"
    mdf = MDF(version="4.10")
    mdf.append(
        base_signals(1000, 100.0)
        + [Signal(samples=states, timestamps=t, name="state", encoding="latin-1")],
        comment="frees spike fixture d",
    )
    save(mdf, f"{out}/d_vlsd.mf4", compression=0)

    # (e) two channel groups with different rasters + CCBLOCK conversions.
    mdf = MDF(version="4.10")
    slow_t = np.arange(600, dtype=np.float64) / 10.0
    raw_counts = np.arange(600, dtype=np.float64)
    linear = Signal(
        samples=raw_counts,
        timestamps=slow_t,
        name="temp_raw",
        unit="degC",
        conversion={"a": 0.1, "b": -40.0},  # phys = 0.1*raw - 40
    )
    mdf.append([linear], comment="slow group (10 Hz, linear conversion)")
    fast = base_signals(50_000, 1000.0)
    gear_raw = (np.arange(50_000) // 10_000).astype(np.uint8)
    v2t = Signal(
        samples=gear_raw,
        timestamps=fast[0].timestamps,
        name="gear",
        conversion={
            "val_0": 0, "text_0": "P",
            "val_1": 1, "text_1": "R",
            "val_2": 2, "text_2": "N",
            "val_3": 3, "text_3": "D",
            "val_4": 4, "text_4": "S",
        },
    )
    mdf.append(fast + [v2t], comment="fast group (1 kHz, value-to-text)")
    save(mdf, f"{out}/e_multigroup.mf4", compression=1)

    # (g) plain deflate DZ, single group, no conversions — isolates DZ-deflate
    # support from the conversion/multi-group variables in (e).
    mdf = MDF(version="4.10")
    mdf.append(with_spike(base_signals(100_000, 1000.0)), comment="frees spike fixture g")
    save(mdf, f"{out}/g_deflate.mf4", compression=1)

    # (h) linear conversion + multi-group, UNCOMPRESSED — isolates conversion
    # support from the DZ variable.
    mdf = MDF(version="4.10")
    slow_t2 = np.arange(600, dtype=np.float64) / 10.0
    mdf.append(
        [Signal(samples=np.arange(600, dtype=np.float64), timestamps=slow_t2,
                name="temp_raw", unit="degC", conversion={"a": 0.1, "b": -40.0})],
        comment="slow group",
    )
    mdf.append(base_signals(1000, 100.0), comment="fast group")
    save(mdf, f"{out}/h_linear_uncompressed.mf4", compression=0)

    # (f) ~100 MB scale fixture (Gate 3) — noisy so deflate can't shrink it.
    if large:
        n = 1_200_000
        t = np.arange(n, dtype=np.float64) / 10_000.0
        rng = np.random.default_rng(42)
        sigs = [
            Signal(samples=rng.normal(scale=100, size=n), timestamps=t, name=f"ch{i:02d}", unit="V")
            for i in range(10)
        ]
        mdf = MDF(version="4.10")
        mdf.append(sigs, comment="frees spike fixture f (scale)")
        save(mdf, f"{out}/f_large.mf4", compression=1)


if __name__ == "__main__":
    main()
