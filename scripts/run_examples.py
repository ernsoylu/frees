#!/usr/bin/env python3
"""Run every curated example from frontend/src/examples.ts against the live
backend API and report whether each one solves.

Why: examples are user-facing "ready-to-solve" documents surfaced in the File
menu and Help library. A solver regression (e.g. bare matrix names not
resolving into control CALLs) can silently break one without any test noticing.
This script is the end-to-end guard: it parses the TypeScript example database,
submits each document through the real async API, and validates the outcome.

Two example classes, handled differently (mirroring the frontend):
  * Direct (algebraic / ODE):  POST /api/solve  -> expect COMPLETED + success.
  * Parametric (PARAMETRIC ... END time sweeps): the base system is
    underspecified by the swept column ON PURPOSE, so the main Solve is
    expected to fail. Instead we POST /api/check to obtain the parsed sweep
    grid, then POST /api/solve/table and require every row to solve.

Usage:
    python3 scripts/run_examples.py [--base http://localhost:8080] [--only id]
Exit code is non-zero if any example fails.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

EXAMPLES_TS = Path(__file__).resolve().parent.parent / "frontend" / "src" / "examples.ts"

STOP_CRITERIA = {
    "maxIterations": 250,
    "relativeResiduals": 1e-12,
    "changeInVariables": 1e-15,
    "elapsedTimeSeconds": 3600,
}

# One regex per example object. id is always single-quoted; title may use single
# or double quotes; category is single-quoted; text is a backtick template
# literal (the examples contain no `${}` interpolation or escaped backticks).
EXAMPLE_RE = re.compile(
    r"id:\s*'(?P<id>[^']+)'"
    r".*?title:\s*(?:'(?P<title_s>[^']*)'|\"(?P<title_d>[^\"]*)\")"
    r".*?category:\s*'(?P<category>[^']*)'"
    r".*?text:\s*`(?P<text>.*?)`",
    re.DOTALL,
)


def parse_examples() -> list[dict]:
    src = EXAMPLES_TS.read_text(encoding="utf-8")
    out = []
    for m in EXAMPLE_RE.finditer(src):
        out.append({
            "id": m.group("id"),
            "title": m.group("title_s") or m.group("title_d") or m.group("id"),
            "category": m.group("category"),
            "text": m.group("text"),
        })
    return out


def _is_rate_limited(status: int, body: dict) -> bool:
    return status == 429 or "too many requests" in str(body.get("error", "")).lower()


def post(base: str, path: str, payload: dict, retries: int = 6) -> tuple[int, dict]:
    """POST JSON, transparently retrying on backend rate limiting (429 / "Too
    many requests") with exponential backoff so a fast sweep doesn't report
    throttling as a failure."""
    data = json.dumps(payload).encode("utf-8")
    delay = 0.5
    for attempt in range(retries + 1):
        req = urllib.request.Request(
            base + path, data=data, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                status, body = resp.status, json.loads(resp.read().decode("utf-8") or "{}")
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                body = {"error": raw or f"HTTP {e.code}"}
            status = e.code
        if _is_rate_limited(status, body) and attempt < retries:
            time.sleep(delay)
            delay = min(delay * 2, 8.0)
            continue
        return status, body
    return status, body


def get(base: str, path: str, retries: int = 12) -> dict:
    delay = 0.5
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(base + path, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8") or "{}")
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries:
                time.sleep(delay)
                delay = min(delay * 1.5, 5.0)
                continue
            raise


def poll_job(base: str, job_id: str, timeout_s: float = 120.0) -> dict:
    """Poll /api/jobs/{id} until COMPLETED/FAILED. Returns the JobState.
    Polls at a relaxed cadence to stay under the backend request rate limiter."""
    deadline = time.time() + timeout_s
    state = {}
    while time.time() < deadline:
        state = get(base, f"/api/jobs/{job_id}")
        if state.get("status") in ("COMPLETED", "FAILED"):
            return state
        time.sleep(0.5)
    return state


def run_compute(base: str, path: str, payload: dict) -> tuple[bool, dict, str]:
    """POST then (if async) poll. Returns (completed, result_dict, error_str)."""
    status, body = post(base, path, payload)
    if status == 202:  # async: ticket with jobId
        job_id = body.get("jobId")
        if not job_id:
            return False, {}, "submission returned no jobId"
        state = poll_job(base, job_id)
        if state.get("status") == "COMPLETED":
            return True, state.get("result") or {}, ""
        return False, {}, state.get("error") or "job FAILED with no error message"
    if status == 200:  # synchronous result body
        return True, body, ""
    # 400 / 422 / 5xx synchronous rejection
    return False, {}, body.get("error") or f"HTTP {status}"


def solve_payload(text: str) -> dict:
    return {
        "text": text,
        "stopCriteria": STOP_CRITERIA,
        "variableInfo": [],
        "findAllSolutions": False,
        "displayUnitSystem": "SI",
        "fillMissing": False,
        "functionTables": [],
        "overrides": [],
    }


def check_payload(text: str) -> dict:
    return {
        "text": text,
        "variableInfo": [],
        "displayUnitSystem": "SI",
        "functionTables": [],
    }


def table_payload(text: str, variables: list[str], rows: list[dict]) -> dict:
    return {
        "text": text,
        "stopCriteria": STOP_CRITERIA,
        "variableInfo": [],
        "displayUnitSystem": "SI",
        "table": {"variables": variables, "rows": rows},
        "functionTables": [],
    }


def run_example(base: str, ex: dict) -> dict:
    """Returns {ok, kind, detail}."""
    text = ex["text"]
    # Ask the backend whether this document contains parametric run-tables.
    _, check = post(base, "/api/check", check_payload(text))
    ptables = check.get("parametricTables") or []

    if ptables:
        # Parametric: validate via the table endpoint (the main Solve is
        # intentionally underspecified for these).
        total_rows = 0
        for pt in ptables:
            variables = pt["vars"]
            # Non-null cells (the swept inputs) become fixed inputs per row.
            rows = []
            for row in pt["rows"]:
                fixed = {variables[i]: v for i, v in enumerate(row) if v is not None}
                rows.append(fixed)
            ok, result, err = run_compute(base, "/api/solve/table", table_payload(text, variables, rows))
            if not ok:
                return {"ok": False, "kind": "parametric", "detail": f"table '{pt['name']}': {err}"}
            results = result.get("results") or []
            failed = [(i, r.get("error")) for i, r in enumerate(results) if not r.get("success")]
            if failed:
                i, e = failed[0]
                return {"ok": False, "kind": "parametric",
                        "detail": f"table '{pt['name']}' row {i} failed: {e} ({len(failed)}/{len(results)} rows)"}
            total_rows += len(results)
        return {"ok": True, "kind": "parametric", "detail": f"{len(ptables)} table(s), {total_rows} rows solved"}

    # Direct solve.
    ok, result, err = run_compute(base, "/api/solve", solve_payload(text))
    if not ok:
        return {"ok": False, "kind": "direct", "detail": err}
    if not result.get("success", False):
        return {"ok": False, "kind": "direct", "detail": result.get("error") or "result.success == false"}
    nvars = len(result.get("variables") or [])
    warns = result.get("unitWarnings") or []
    detail = f"{nvars} variables"
    if warns:
        detail += f", {len(warns)} unit warning(s)"
    return {"ok": True, "kind": "direct", "detail": detail}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", default="http://localhost:8080", help="API base URL")
    ap.add_argument("--only", help="run a single example by id")
    args = ap.parse_args()

    examples = parse_examples()
    if args.only:
        examples = [e for e in examples if e["id"] == args.only]
    if not examples:
        print("No examples found (check examples.ts path / --only id).", file=sys.stderr)
        return 2

    # Fail fast if the API is unreachable.
    try:
        get(args.base, "/api/jobs/__healthprobe__")
    except urllib.error.HTTPError:
        pass  # 404 is fine — the server answered
    except Exception as e:  # noqa: BLE001
        print(f"Cannot reach backend at {args.base}: {e}", file=sys.stderr)
        return 2

    print(f"Running {len(examples)} examples against {args.base}\n")
    width = max(len(e["id"]) for e in examples)
    failures = []
    for ex in examples:
        time.sleep(0.2)  # gentle throttle to stay under the backend rate limiter
        res = run_example(args.base, ex)
        mark = "PASS" if res["ok"] else "FAIL"
        print(f"  [{mark}] {ex['id']:<{width}}  {res['kind']:<10} {ex['category']:<15} {res['detail']}")
        if not res["ok"]:
            failures.append((ex, res))

    print()
    if failures:
        print(f"{len(failures)} of {len(examples)} examples FAILED:")
        for ex, res in failures:
            print(f"  - {ex['id']} ({ex['title']}): {res['detail']}")
        return 1
    print(f"All {len(examples)} examples passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
